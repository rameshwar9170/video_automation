import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { cartoonPipelineService } from '../services/cartoon-pipeline.service';
import { cartoonScriptService } from '../services/cartoon-script.service';
import { youtubeService } from '../services/youtube.service';
import { logger } from '../utils/logger';

export async function generateCartoonVideo(req: Request, res: Response): Promise<void> {
  try {
    const { topic, theme, language, style, tone, seriesTitle, episodeNumber, totalEpisodes, characters } = req.body || {};
    const runId = `cartoon-${Date.now()}`;
    logger.info(`[Cartoon Controller] Generation requested (${runId}): "${seriesTitle || topic || theme || 'Auto'}" (Ep: ${episodeNumber || 1})`);

    // Run pipeline asynchronously in background
    cartoonPipelineService
      .runCartoonPipeline({
        topic,
        theme,
        language: language || 'Hindi',
        style: style || '3D Pixar Disney Style Animation',
        tone: tone || 'Playful, Funny & Dramatic',
        seriesTitle,
        episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
        totalEpisodes: totalEpisodes ? Number(totalEpisodes) : undefined,
        characters,
      })
      .catch((err) => {
        logger.error('[Cartoon Controller] Background pipeline error', err);
      });

    res.json({
      success: true,
      message: 'Cartoon video generation started',
      runId,
      topic: seriesTitle || topic || theme,
      episodeNumber: episodeNumber || 1,
      totalEpisodes: totalEpisodes || 1,
      language: language || 'Hindi',
    });
  } catch (err: any) {
    logger.error('[Cartoon Controller] Error initiating generation', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function generateCartoonSeries(req: Request, res: Response): Promise<void> {
  try {
    const { seriesTitle, totalEpisodes = 3, theme, language, style, tone, characters } = req.body || {};
    const numEpisodes = Math.min(Math.max(Number(totalEpisodes) || 3, 2), 5); // 2 to 5 episodes
    const title = seriesTitle?.trim() || 'Chintu Aur Jadui Khazana';

    logger.info(`[Cartoon Controller] Initiating multi-episode series: "${title}" (${numEpisodes} episodes)`);

    // Asynchronously generate episodes in sequence to ensure narrative continuity
    (async () => {
      for (let ep = 1; ep <= numEpisodes; ep++) {
        try {
          logger.info(`🎬 [Cartoon Series] Starting Episode ${ep} of ${numEpisodes} for "${title}"`);
          await cartoonPipelineService.runCartoonPipeline({
            seriesTitle: title,
            episodeNumber: ep,
            totalEpisodes: numEpisodes,
            theme,
            language: language || 'Hindi',
            style: style || '3D Pixar Disney Style Animation',
            tone: tone || 'Playful, Funny & Dramatic',
            characters,
          });
          logger.info(`✅ [Cartoon Series] Completed Episode ${ep} of ${numEpisodes}`);
        } catch (epErr: any) {
          logger.error(`❌ [Cartoon Series] Episode ${ep} failed: ${epErr.message}`);
          break; // Stop series on error to avoid broken continuity
        }
      }
    })().catch((err) => {
      logger.error('[Cartoon Controller] Series generation background loop error', err);
    });

    res.json({
      success: true,
      message: `Cartoon series generation started (${numEpisodes} episodes)`,
      seriesTitle: title,
      totalEpisodes: numEpisodes,
      language: language || 'Hindi',
    });
  } catch (err: any) {
    logger.error('[Cartoon Controller] Error generating series', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCartoonVideos(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch cartoon-tagged videos or recent videos
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: {
          OR: [
            { hashtags: { contains: 'Cartoon' } },
            { tags: { contains: 'cartoon' } },
            { description: { contains: 'cartoon' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.video.count({
        where: {
          OR: [
            { hashtags: { contains: 'Cartoon' } },
            { tags: { contains: 'cartoon' } },
            { description: { contains: 'cartoon' } },
          ],
        },
      }),
    ]);

    res.json({
      success: true,
      data: videos,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err: any) {
    logger.error('[Cartoon Controller] getCartoonVideos error', err);
    res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } });
  }
}

export async function getCartoonThemes(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: [
      {
        id: 'cartoon_dark_facts',
        title: 'Cartoon Mysteries & Dark Facts',
        description: 'Shocking untold secrets & theories of Doraemon, Shinchan, Motu Patlu',
        emoji: '🕵️‍♂️',
        example: 'Doraemon Final Episode Mystery & Hidden Secrets',
      },
      {
        id: 'cartoon_power_secrets',
        title: 'Power Battles & Secret Gadgets',
        description: 'Top dangerous gadgets, character strength levels & epic showdowns',
        emoji: '⚡',
        example: 'Top 3 Most Dangerous Gadgets in Doraemon Pocket',
      },
      {
        id: 'cartoon_fact_quiz',
        title: 'Cartoon Fact Test & Quiz Challenge',
        description: 'Interactive mystery test: 99% people fail to guess this fact',
        emoji: '🧠',
        example: 'Fact Test: Can You Guess This Shinchan Secret?',
      },
      {
        id: 'clever_animals',
        title: 'Clever Animal Fables',
        description: 'Smart monkeys, tricky foxes, and funny jungle adventures',
        emoji: '🐵',
        example: 'Clever Monkey Outsmarts a Greedy Crocodile',
      },
      {
        id: 'kid_inventor',
        title: 'Little Inventor',
        description: 'A kid creates a chaotic funny invention that goes wild',
        emoji: '🚀',
        example: 'The Boy Who Built a Flying Homework Machine',
      },
      {
        id: 'funny_family',
        title: 'Funny Everyday Chaos',
        description: 'Relatable funny situations turned into hilarious 3D cartoons',
        emoji: '😂',
        example: 'When the Cat Became the Boss of the House',
      },
      {
        id: 'magical_adventure',
        title: 'Magical Quests',
        description: 'Wholesome fantasy stories with moral endings',
        emoji: '✨',
        example: 'The Secret Door in Grandpas Clock',
      },
    ],
  });
}

export async function getCartoonChannelStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await youtubeService.getChannelStatus('cartoon');
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleCartoonAutoPublish(req: Request, res: Response): Promise<void> {
  try {
    const autoPublish = Boolean(req.body?.autoPublish);
    await youtubeService.updateAutoPublish('cartoon', autoPublish);
    res.json({ success: true, autoPublish, target: 'cartoon' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function previewCartoonScript(req: Request, res: Response): Promise<void> {
  try {
    const { topic, theme, language, style, tone, seriesTitle, episodeNumber, totalEpisodes } = req.body || {};
    const script = await cartoonScriptService.generateCartoonScript({
      topic,
      theme,
      language: language || 'Hindi',
      style: style || '3D Pixar Disney Style Animation',
      tone: tone || 'Playful, Funny & Dramatic',
      seriesTitle,
      episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
      totalEpisodes: totalEpisodes ? Number(totalEpisodes) : undefined,
    });
    res.json({ success: true, data: script });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
