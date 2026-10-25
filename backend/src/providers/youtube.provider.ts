import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import fs from 'fs';

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(oauth2Client: OAuth2Client, state?: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state: state || 'tech',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
  });
}

export async function uploadVideo(params: {
  oauth2Client: OAuth2Client;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'public' | 'private' | 'unlisted';
  categoryId?: string;
}): Promise<string> {
  const youtube = google.youtube({ version: 'v3', auth: params.oauth2Client });

  logger.info(`[YouTube] Uploading: ${params.title}`);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags,
        categoryId: params.categoryId ?? '28',
      },
      status: {
        privacyStatus: params.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(params.videoPath),
    },
  });

  const videoId = response.data.id!;
  logger.info(`[YouTube] Uploaded video ID: ${videoId}`);
  return videoId;
}

export async function uploadThumbnail(params: {
  oauth2Client: OAuth2Client;
  videoId: string;
  thumbnailPath: string;
}): Promise<void> {
  const youtube = google.youtube({ version: 'v3', auth: params.oauth2Client });
  await youtube.thumbnails.set({
    videoId: params.videoId,
    media: {
      mimeType: 'image/png',
      body: fs.createReadStream(params.thumbnailPath),
    },
  });
  logger.info(`[YouTube] Thumbnail set for video ${params.videoId}`);
}

export async function getChannelInfo(oauth2Client: OAuth2Client) {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const res = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  });
  return res.data.items?.[0] ?? null;
}

export async function getRecentChannelVideos(oauth2Client: OAuth2Client, maxResults = 6) {
  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.search.list({
      part: ['snippet'],
      forMine: true,
      type: ['video'],
      order: 'date',
      maxResults,
    });
    return (res.data.items ?? []).map((item) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
    }));
  } catch (err) {
    logger.warn('[YouTube] Could not fetch recent videos', err);
    return [];
  }
}
