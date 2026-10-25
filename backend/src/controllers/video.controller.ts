import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { pipelineService } from '../services/pipeline.service';
import { logger } from '../utils/logger';

export async function cleanupStaleVideosHelper(): Promise<void> {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.video.updateMany({
      where: {
        status: {
          notIn: ['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'],
        },
        updatedAt: {
          lt: fifteenMinutesAgo,
        },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Generation timed out or stalled for >15 minutes',
      },
    });
  } catch (err) {
    logger.error('[Video] cleanupStaleVideosHelper error', err);
  }
}

export async function getVideoStats(req: Request, res: Response): Promise<void> {
  try {
    await cleanupStaleVideosHelper();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [publishedToday, publishedTotal, failedToday, failedTotal] = await Promise.all([
      prisma.video.count({
        where: {
          status: 'PUBLISHED',
          updatedAt: { gte: todayStart },
        },
      }),
      prisma.video.count({ where: { status: 'PUBLISHED' } }),
      prisma.video.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: todayStart },
        },
      }),
      prisma.video.count({ where: { status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: {
        publishedToday,
        publishedTotal,
        failedToday,
        failedTotal,
      },
    });
  } catch (err) {
    logger.error('[Video] getVideoStats error', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function getVideos(req: Request, res: Response): Promise<void> {
  try {
    await cleanupStaleVideosHelper();

    const { status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = status ? { status: String(status) as any } : {};
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: { topic: { select: { topic: true } } },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({ success: true, data: videos, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    logger.error('[Video] getVideos error', err);
    res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } });
  }
}

export async function getVideoById(req: Request, res: Response): Promise<void> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id as string },
      include: { topic: true },
    });
    if (!video) { res.status(404).json({ success: false, message: 'Video not found' }); return; }
    
    let hashtags = [];
    let tags = [];
    try { if (typeof video.hashtags === 'string') hashtags = JSON.parse(video.hashtags); } catch {}
    try { if (typeof video.tags === 'string') tags = JSON.parse(video.tags); } catch {}

    res.json({ success: true, data: { ...video, hashtags, tags } });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function getVideoStatus(req: Request, res: Response): Promise<void> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id as string },
      select: { status: true, progress: true, errorMessage: true, youtubeVideoId: true },
    });
    if (!video) { res.status(404).json({ success: false, message: 'Video not found' }); return; }
    res.json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function generateVideo(req: Request, res: Response): Promise<void> {
  try {
    const { topic, customTopic, language, style, tone, isSeries, totalParts } = req.body || {};
    const chosenTopic = customTopic || topic;
    const partsCount = isSeries ? Math.min(Math.max(Number(totalParts) || 3, 2), 5) : 1;

    if (partsCount > 1) {
      const seriesId = `series-${Date.now()}`;
      logger.info(
        `[Video] Multi-part series triggered (${partsCount} parts): "${chosenTopic}" (Lang: ${language || 'Default'})`
      );

      // Execute parts sequentially in background
      (async () => {
        for (let part = 1; part <= partsCount; part++) {
          const partTopic = chosenTopic ? `${chosenTopic} (Part ${part}/${partsCount})` : undefined;
          logger.info(`[Video] Starting Part ${part}/${partsCount} for series: "${chosenTopic}"`);
          await pipelineService.runPipeline(undefined, true, {
            customTopic: partTopic,
            seriesTitle: chosenTopic,
            partNumber: part,
            totalParts: partsCount,
            language,
            style,
            tone,
          });
        }
      })().catch((err) => {
        logger.error('[Video] Series execution failed', err);
      });

      res.json({
        success: true,
        message: `Multi-part series (${partsCount} parts) started`,
        seriesId,
        topic: chosenTopic,
        totalParts: partsCount,
        language,
      });
      return;
    }

    const runId = `manual-${Date.now()}`;
    logger.info(
      `[Video] Manual generation triggered: ${runId} (Topic: ${chosenTopic || 'Auto'}, Lang: ${language || 'Default'})`
    );
    pipelineService
      .runPipeline(undefined, true, {
        customTopic: chosenTopic,
        language,
        style,
        tone,
      })
      .catch((err) => {
        logger.error('[Video] Manual pipeline error', err);
      });
    res.json({ success: true, message: 'Video generation started', runId, topic: chosenTopic, language });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function retryVideo(req: Request, res: Response): Promise<void> {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id as string } });
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    // Clear error message, increment retryCount, and reset videoPath to re-render visuals
    await prisma.video.update({
      where: { id: video.id },
      data: { videoPath: null, errorMessage: null, retryCount: { increment: 1 } },
    });

    logger.info(`[Video] Resuming retry from stopped point for video: ${video.id} (Current: ${video.status}, Progress: ${video.progress}%)`);

    pipelineService.runPipeline(video.id).catch((err) => {
      logger.error('[Video] Retry pipeline error', err);
    });

    res.json({ success: true, message: `Resuming video from stopped point (${video.progress}%)`, videoId: video.id });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function publishVideoToYouTube(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const video = await prisma.video.findUnique({ where: { id: id as string } });
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    if (video.status === 'PUBLISHED' && video.youtubeVideoId) {
      res.json({ success: true, message: 'Video already published', data: { youtubeVideoId: video.youtubeVideoId } });
      return;
    }

    if (!video.videoPath) {
      res.status(400).json({ success: false, message: 'Video has not been rendered yet' });
      return;
    }

    const { youtubeService } = await import('../services/youtube.service');
    await prisma.video.update({ where: { id: id as string }, data: { status: 'UPLOADING', progress: 92, errorMessage: null } });

    const ytVideoId = await youtubeService.publishVideo(id as string);

    res.json({
      success: true,
      message: 'Video published to YouTube successfully',
      data: { youtubeVideoId: ytVideoId },
    });
  } catch (err) {
    logger.error('[Video] Publish error', err);
    await prisma.video.update({
      where: { id: req.params.id as string },
      data: { status: 'FAILED', errorMessage: (err as Error).message },
    }).catch(() => {});
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

