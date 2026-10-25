import { prisma } from '../database/prisma';
import {
  createOAuthClient,
  getAuthUrl,
  uploadVideo,
  uploadThumbnail,
  getChannelInfo,
  getRecentChannelVideos,
} from '../providers/youtube.provider';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class YouTubeService {
  /**
   * Generate the OAuth2 consent URL for YouTube connection.
   */
  getConnectUrl(channelType = 'tech'): string {
    const oauth2Client = createOAuthClient();
    return getAuthUrl(oauth2Client, channelType);
  }

  /**
   * Handle OAuth callback — exchange code for tokens and store refresh token for the specific channel.
   */
  async handleCallback(code: string, channelType = 'tech'): Promise<{ channelId: string; channelName: string }> {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const channel = await getChannelInfo(oauth2Client);
    if (!channel) throw new Error('Could not retrieve YouTube channel info');

    const channelId = channel.id!;
    const channelName = channel.snippet?.title ?? 'Unknown Channel';

    if (channelType === 'cartoon') {
      const cartoonSettings = await prisma.channelSettings.findFirst({
        where: { niche: { contains: 'Cartoon' } },
      });
      if (cartoonSettings) {
        await prisma.channelSettings.update({
          where: { id: cartoonSettings.id },
          data: {
            youtubeChannelId: channelId,
            channelName,
            youtubeRefreshToken: tokens.refresh_token ?? undefined,
            youtubeConnected: true,
          },
        });
      } else {
        await prisma.channelSettings.create({
          data: {
            channelName,
            youtubeChannelId: channelId,
            niche: 'Indian Cartoon & Animation',
            language: 'Hindi',
            youtubeRefreshToken: tokens.refresh_token ?? undefined,
            youtubeConnected: true,
            autoPublish: true,
          },
        });
      }
    } else {
      // Tech Channel (default)
      const existing = await prisma.channelSettings.findFirst({
        where: { niche: { not: { contains: 'Cartoon' } } },
      });
      if (existing) {
        await prisma.channelSettings.update({
          where: { id: existing.id },
          data: {
            youtubeChannelId: channelId,
            channelName,
            youtubeRefreshToken: tokens.refresh_token ?? undefined,
            youtubeConnected: true,
          },
        });
      } else {
        await prisma.channelSettings.create({
          data: {
            youtubeChannelId: channelId,
            channelName,
            youtubeRefreshToken: tokens.refresh_token ?? undefined,
            youtubeConnected: true,
          },
        });
      }
    }

    logger.info(`[YouTube] Connected (${channelType}): ${channelName} (${channelId})`);
    return { channelId, channelName };
  }

  /**
   * Upload a video to YouTube and save the video ID.
   */
  async publishVideo(videoId: string, targetChannel?: string): Promise<string> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { topic: true },
    });
    if (!video) throw new Error(`Video ${videoId} not found`);
    if (!video.videoPath) throw new Error('Video path not set');
    if (!video.title) throw new Error('Video title not set');

    let channelType = targetChannel;
    if (!channelType) {
      const isCartoon =
        video.hashtags?.includes('Cartoon') ||
        video.tags?.includes('cartoon') ||
        video.title?.includes('Episode') ||
        video.title?.includes('🎨');
      channelType = isCartoon ? 'cartoon' : 'tech';
    }

    const settings =
      channelType === 'cartoon'
        ? await prisma.channelSettings.findFirst({ where: { niche: { contains: 'Cartoon' } } })
        : await prisma.channelSettings.findFirst({ where: { niche: { not: { contains: 'Cartoon' } } } });

    if (!settings?.youtubeRefreshToken) {
      throw new Error(`YouTube not connected for ${channelType} channel — no refresh token found`);
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: settings.youtubeRefreshToken });

    // Optimize title & description for YouTube Shorts algorithm indexing
    let finalTitle = video.title;
    if (!finalTitle.toLowerCase().includes('#shorts')) {
      finalTitle = `${finalTitle} #Shorts`;
    }

    let finalDescription = video.description ?? '';
    let parsedHashtags: string[] = [];
    try {
      parsedHashtags = typeof video.hashtags === 'string' ? JSON.parse(video.hashtags) : (video.hashtags || []);
    } catch {
      parsedHashtags = [];
    }
    if (parsedHashtags.length > 0 && !finalDescription.includes('#Shorts')) {
      finalDescription = `${finalDescription}\n\n${parsedHashtags.join(' ')}`;
    }

    const ytVideoId = await uploadVideo({
      oauth2Client,
      videoPath: video.videoPath,
      title: finalTitle,
      description: finalDescription,
      tags: typeof video.tags === 'string' ? JSON.parse(video.tags) : [],
      privacyStatus: settings.autoPublish ? 'public' : 'private',
      categoryId: channelType === 'cartoon' ? '1' : '28', // 1: Film & Animation, 28: Science & Technology
    });

    // Upload thumbnail if available
    if (video.thumbnailPath) {
      try {
        await uploadThumbnail({ oauth2Client, videoId: ytVideoId, thumbnailPath: video.thumbnailPath });
      } catch (err) {
        logger.warn(`[YouTube] Thumbnail upload failed (non-fatal): ${(err as Error).message}`);
      }
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        youtubeVideoId: ytVideoId,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        progress: 100,
      },
    });

    // Mark topic as USED
    if (video.topicId) {
      await prisma.topic.update({
        where: { id: video.topicId },
        data: { status: 'USED', usedAt: new Date() },
      });
    }

    logger.info(`[YouTube] Published to ${channelType}: https://youtube.com/shorts/${ytVideoId}`);
    return ytVideoId;
  }

  /**
   * Disconnect a specific YouTube channel.
   */
  async disconnectChannel(channelType = 'tech') {
    const settings =
      channelType === 'cartoon'
        ? await prisma.channelSettings.findFirst({ where: { niche: { contains: 'Cartoon' } } })
        : await prisma.channelSettings.findFirst({ where: { niche: { not: { contains: 'Cartoon' } } } });

    if (settings) {
      await prisma.channelSettings.update({
        where: { id: settings.id },
        data: {
          youtubeConnected: false,
          youtubeRefreshToken: null,
          youtubeChannelId: null,
        },
      });
      logger.info(`[YouTube] Disconnected ${channelType} channel`);
    }
  }

  /**
   * Toggle auto-publish for a specific YouTube channel.
   */
  async updateAutoPublish(channelType = 'tech', autoPublish: boolean) {
    const settings =
      channelType === 'cartoon'
        ? await prisma.channelSettings.findFirst({ where: { niche: { contains: 'Cartoon' } } })
        : await prisma.channelSettings.findFirst({ where: { niche: { not: { contains: 'Cartoon' } } } });

    if (settings) {
      await prisma.channelSettings.update({
        where: { id: settings.id },
        data: { autoPublish },
      });
      logger.info(`[YouTube] Updated autoPublish for ${channelType}: ${autoPublish}`);
    } else if (channelType === 'cartoon') {
      await prisma.channelSettings.create({
        data: {
          channelName: 'Indian Cartoon Studio',
          niche: 'Indian Cartoon & Animation',
          language: 'Hindi',
          autoPublish,
        },
      });
    }
  }

  /**
   * Get the connected channel info from DB, augmented with live statistics if connected.
   */
  async getChannelStatus(channelType = 'tech') {
    const settings =
      channelType === 'cartoon'
        ? await prisma.channelSettings.findFirst({ where: { niche: { contains: 'Cartoon' } } })
        : await prisma.channelSettings.findFirst({ where: { niche: { not: { contains: 'Cartoon' } } } });

    if (!settings || !settings.youtubeConnected) {
      return {
        connected: false,
        channelName: settings?.channelName ?? (channelType === 'cartoon' ? 'Indian Cartoon Studio' : null),
        channelId: null,
        autoPublish: settings?.autoPublish ?? false,
        subscriberCount: null,
        viewCount: null,
        videoCount: null,
        avatarUrl: null,
        customUrl: null,
        recentVideos: [],
      };
    }

    let stats = {
      subscriberCount: null as string | null,
      viewCount: null as string | null,
      videoCount: null as string | null,
      avatarUrl: null as string | null,
      customUrl: null as string | null,
      recentVideos: [] as any[],
    };

    if (settings.youtubeRefreshToken) {
      try {
        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({ refresh_token: settings.youtubeRefreshToken });
        const [info, recent] = await Promise.all([
          getChannelInfo(oauth2Client),
          getRecentChannelVideos(oauth2Client, 6),
        ]);

        if (info) {
          stats.subscriberCount = info.statistics?.subscriberCount ?? null;
          stats.viewCount = info.statistics?.viewCount ?? null;
          stats.videoCount = info.statistics?.videoCount ?? null;
          stats.avatarUrl =
            info.snippet?.thumbnails?.medium?.url ||
            info.snippet?.thumbnails?.default?.url ||
            null;
          stats.customUrl = info.snippet?.customUrl ?? null;
        }
        stats.recentVideos = recent;
      } catch (err) {
        logger.warn(`[YouTube] Could not fetch live channel stats for ${channelType}, falling back to cached DB data`, err);
      }
    }

    return {
      connected: true,
      channelName: settings.channelName,
      channelId: settings.youtubeChannelId,
      autoPublish: settings.autoPublish,
      ...stats,
    };
  }
}

export const youtubeService = new YouTubeService();
