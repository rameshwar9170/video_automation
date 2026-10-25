import { prisma } from '../database/prisma';
import { researchService } from './research.service';
import { topicService } from './topic.service';
import { scriptService } from './script.service';
import { sceneService } from './scene.service';
import { voiceService } from './voice.service';
import { visualService } from './visual.service';
import { videoService } from './video.service';
import { metadataService } from './metadata.service';
import { qualityService } from './quality.service';
import { youtubeService } from './youtube.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { fileExists } from '../utils/file-manager';

export type VideoStatus =
  | 'RESEARCHING'
  | 'TOPIC_SELECTED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_READY'
  | 'GENERATING_ASSETS'
  | 'RENDERING'
  | 'METADATA_READY'
  | 'QUALITY_CHECK'
  | 'READY_TO_PUBLISH'
  | 'UPLOADING'
  | 'PUBLISHED'
  | 'FAILED';

export interface PipelineOptions {
  customTopic?: string;
  language?: string;
  niche?: string;
  style?: string;
  tone?: string;
  seriesTitle?: string;
  partNumber?: number;
  totalParts?: number;
}

type PipelineResult = { videoId: string; youtubeVideoId?: string; status: VideoStatus };

class PipelineService {
  /**
   * Run or resume the autonomous video generation pipeline.
   * If existingVideoId is provided, resumes execution directly from the stopped point.
   * If not provided, checks for an incomplete/failed video to resume first before creating a new one.
   */
  async runPipeline(
    existingVideoId?: string,
    forceNew = false,
    options?: PipelineOptions
  ): Promise<PipelineResult> {
    let settings = await prisma.channelSettings.findFirst();
    if (!settings) {
      settings = await prisma.channelSettings.create({
        data: {
          niche: 'AI & Technology',
          language: 'English',
          region: 'Global',
          preferredTimes: JSON.stringify(['01:00', '13:00']),
        },
      });
    }

    const context = {
      niche: options?.niche || settings.niche,
      language: options?.language || settings.language,
      region: settings.region,
      style: options?.style || settings.style,
      tone: options?.tone || settings.tone,
      durationMin: settings.durationMin,
      durationMax: settings.durationMax,
    };

    let video: any;
    if (existingVideoId) {
      video = await prisma.video.findUnique({
        where: { id: existingVideoId },
        include: { topic: true },
      });
    }

    if (!video && !forceNew) {
      // Check if a recent incomplete or failed video exists to resume from its stopped point (< 1 hour ago)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      video = await prisma.video.findFirst({
        where: {
          status: {
            in: [
              'FAILED',
              'RESEARCHING',
              'TOPIC_SELECTED',
              'SCRIPT_GENERATING',
              'SCRIPT_READY',
              'GENERATING_ASSETS',
              'RENDERING',
              'METADATA_READY',
              'QUALITY_CHECK',
            ],
          },
          updatedAt: { gte: oneHourAgo },
          retryCount: { lt: 3 },
        },
        orderBy: { createdAt: 'desc' },
        include: { topic: true },
      });
    }

    if (!video || forceNew) {
      // Create new video record if nothing to resume or forceNew requested
      video = await prisma.video.create({
        data: { status: 'RESEARCHING', progress: 0 },
        include: { topic: true },
      });
    }

    const videoId = video.id;

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🎬 Pipeline active — Video ID: ${videoId} (Status: ${video.status}, Progress: ${video.progress}%, Lang: ${context.language})`);
    if (options?.customTopic) {
      logger.info(`📌 Custom Topic Target: "${options.customTopic}"`);
    }
    logger.info(`${'='.repeat(60)}`);

    try {
      // ── Step 1 & 2: Topic Selection Checkpoint ─────────────────────
      let selectedTopic = options?.customTopic || video.topic?.topic;
      let topicRecord = video.topic;

      if (options?.customTopic && !topicRecord) {
        await this.updateStatus(videoId, 'TOPIC_SELECTED', 15);
        topicRecord = await prisma.topic.create({
          data: {
            topic: options.customTopic,
            status: 'SELECTED',
            score: 98,
            selectedAt: new Date(),
          },
        });
        await prisma.video.update({ where: { id: videoId }, data: { topicId: topicRecord.id } });
        selectedTopic = options.customTopic;
        logger.info(`✅ Custom topic activated: "${selectedTopic}" [Language: ${context.language}]`);
      } else if (!selectedTopic) {
        await this.updateStatus(videoId, 'RESEARCHING', 5);
        const researchResults = await researchService.researchTrendingTopics(context);
        logger.info(`✅ Step 1/11: Research complete (${researchResults.length} results)`);

        await this.updateStatus(videoId, 'TOPIC_SELECTED', 15);
        selectedTopic = await topicService.selectBestTopic(context, researchResults);

        topicRecord = await prisma.topic.findFirst({
          where: { topic: selectedTopic, status: 'SELECTED' },
          orderBy: { createdAt: 'desc' },
        });
        if (topicRecord) {
          await prisma.video.update({ where: { id: videoId }, data: { topicId: topicRecord.id } });
        }
        logger.info(`✅ Step 2/11: Topic selected — "${selectedTopic}"`);
      } else {
        logger.info(`⏩ Resumed from checkpoint: Topic already selected ("${selectedTopic}")`);
      }

      // ── Step 3 & 4: Script Generation Checkpoint ───────────────────
      let scriptOutput: { hook: string; script: string; scenes: any[] };

      if (video.script && video.scenes) {
        logger.info(`⏩ Resumed from checkpoint: Script and scenes already generated`);
        let parsedScenes: any[] = [];
        try {
          parsedScenes = JSON.parse(video.scenes);
        } catch {
          parsedScenes = [];
        }
        scriptOutput = {
          hook: video.hook ?? '',
          script: video.script,
          scenes: parsedScenes,
        };
      } else {
        await this.updateStatus(videoId, 'SCRIPT_GENERATING', 20);
        let deepResearch = topicRecord
          ? await prisma.research.findMany({ where: { topicId: topicRecord.id } })
          : [];

        if (deepResearch.length === 0) {
          const researched = await researchService.researchSelectedTopic(selectedTopic, context);
          if (topicRecord) {
            await prisma.research.createMany({
              data: researched.slice(0, 10).map((r) => ({
                topicId: topicRecord.id,
                source: r.source,
                url: r.url,
                title: r.title,
                summary: r.summary,
                content: r.summary,
                topicSignals: JSON.stringify(r.topicSignals ?? []),
                publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
              })),
            });
          }
          deepResearch = researched as any;
        }
        logger.info(`✅ Step 3/11: Deep research complete`);

        scriptOutput = await scriptService.generateScript({
          topic: selectedTopic,
          researchFacts: deepResearch as any,
          style: context.style,
          language: context.language,
          durationMin: context.durationMin,
          durationMax: context.durationMax,
          niche: context.niche,
          tone: context.tone,
          seriesTitle: options?.seriesTitle,
          partNumber: options?.partNumber,
          totalParts: options?.totalParts,
        });

        await prisma.video.update({
          where: { id: videoId },
          data: {
            hook: scriptOutput.hook,
            script: scriptOutput.script,
            scenes: JSON.stringify(scriptOutput.scenes ?? []),
            status: 'SCRIPT_READY',
            progress: 30,
          },
        });
        logger.info(`✅ Step 4/11: Script generated (${scriptOutput.scenes.length} scenes)`);
      }

      // ── Step 5: Scene Instructions ────────────────────────────────
      await this.updateStatus(videoId, 'GENERATING_ASSETS', 35);
      const sceneInstructions = await sceneService.buildSceneInstructions(
        selectedTopic,
        scriptOutput.scenes,
        context.style
      );
      logger.info(`✅ Step 5/11: Scene instructions built`);

      // ── Step 6: Voice Generation Checkpoint ───────────────────────
      let audioPath = video.audioPath;
      const audioExists = audioPath ? await fileExists(audioPath) : false;

      if (audioPath && audioExists) {
        logger.info(`⏩ Resumed from checkpoint: Reusing existing voice audio file: ${audioPath}`);
      } else {
        audioPath = await voiceService.generateVoice(videoId, scriptOutput.script);
        logger.info(`✅ Step 6/11: Voice generated`);
      }

      // ── Step 7: Visual Generation Checkpoint ──────────────────────
      const visuals = await visualService.generateVisuals(videoId, sceneInstructions);
      const motionClipsCount = visuals.filter((v) => v.mediaType === 'video').length;
      logger.info(`✅ Step 7/11: Media assets ready (${visuals.length} total: ${motionClipsCount} real motion video clips, ${visuals.length - motionClipsCount} images)`);

      // ── Step 8: Video Rendering Checkpoint ────────────────────────
      let videoPath = video.videoPath;
      const videoExists = videoPath ? await fileExists(videoPath) : false;

      if (videoPath && videoExists) {
        logger.info(`⏩ Resumed from checkpoint: Reusing existing rendered video: ${videoPath}`);
      } else {
        await this.updateStatus(videoId, 'RENDERING', 60);
        videoPath = await videoService.renderVideo(
          videoId,
          sceneInstructions,
          visuals,
          audioPath
        );
        logger.info(`✅ Step 8/11: Video rendered`);
      }

      // ── Step 9: Metadata Generation Checkpoint ────────────────────
      let title = video.title;
      let description = video.description;
      let hashtags = video.hashtags ? JSON.parse(video.hashtags) : [];
      let tags = video.tags ? JSON.parse(video.tags) : [];

      if (!title || !description) {
        await this.updateStatus(videoId, 'METADATA_READY', 75);
        const metadata = await metadataService.generateMetadata(
          selectedTopic,
          scriptOutput.script,
          context.niche,
          options?.seriesTitle,
          options?.partNumber,
          options?.totalParts
        );
        title = metadata.title;
        description = metadata.description;
        hashtags = metadata.hashtags ?? [];
        tags = metadata.tags ?? [];

        await prisma.video.update({
          where: { id: videoId },
          data: {
            title,
            description,
            hashtags: JSON.stringify(hashtags),
            tags: JSON.stringify(tags),
          },
        });
        logger.info(`✅ Step 9/11: Metadata generated`);
      } else {
        logger.info(`⏩ Resumed from checkpoint: Reusing existing metadata ("${title}")`);
      }

      // ── Step 10: Quality Check Checkpoint ─────────────────────────
      let qualityScore = video.qualityScore;
      if (qualityScore && qualityScore >= 70) {
        logger.info(`⏩ Resumed from checkpoint: Quality check already passed (Score: ${qualityScore})`);
      } else {
        await this.updateStatus(videoId, 'QUALITY_CHECK', 82);

        const qualityResult = await qualityService.check({
          videoPath,
          audioPath,
          title,
          description,
          hashtags,
          script: scriptOutput.script,
          scenes: scriptOutput.scenes,
        });

        await prisma.video.update({
          where: { id: videoId },
          data: {
            qualityScore: qualityResult.score,
            qualityIssues: JSON.stringify(qualityResult.issues ?? []),
          },
        });

        logger.info(`✅ Step 10/11: Quality check complete (score: ${qualityResult.score})`);
      }

      // ── Step 11: YouTube Upload Checkpoint ────────────────────────
      await this.updateStatus(videoId, 'UPLOADING', 90);

      if (video.youtubeVideoId) {
        logger.info(`⏩ Resumed from checkpoint: Already uploaded on YouTube (${video.youtubeVideoId})`);
        await this.updateStatus(videoId, 'PUBLISHED', 100);
        return { videoId, youtubeVideoId: video.youtubeVideoId, status: 'PUBLISHED' };
      }

      if (!settings.youtubeConnected) {
        logger.warn('[Pipeline] YouTube not connected — skipping upload (video saved locally)');
        await this.updateStatus(videoId, 'READY_TO_PUBLISH', 95);
        return { videoId, status: 'READY_TO_PUBLISH' };
      }

      const ytVideoId = await youtubeService.publishVideo(videoId);
      logger.info(`✅ Step 11/11: Published — https://youtube.com/shorts/${ytVideoId}`);
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`🎉 Pipeline complete! YouTube ID: ${ytVideoId}`);
      logger.info(`${'='.repeat(60)}\n`);

      return { videoId, youtubeVideoId: ytVideoId, status: 'PUBLISHED' };
    } catch (err) {
      const message = (err as Error).message;
      logger.error(`[Pipeline] FAILED: ${message}`);
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED', errorMessage: message },
      });
      return { videoId, status: 'FAILED' };
    }
  }

  private async updateStatus(
    videoId: string,
    status: VideoStatus,
    progress: number
  ): Promise<void> {
    await prisma.video.update({ where: { id: videoId }, data: { status, progress, errorMessage: null } });
    logger.info(`[Pipeline] → ${status} (${progress}%)`);
  }
}

export const pipelineService = new PipelineService();
