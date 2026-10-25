import path from 'path';
import { prisma } from '../database/prisma';
import { cartoonScriptService, CartoonScriptContext, CartoonScriptOutput } from './cartoon-script.service';
import { cartoonVisualService, CartoonSceneInstruction, CartoonVisualAsset } from './cartoon-visual.service';
import { voiceService } from './voice.service';
import { renderVideo } from '../utils/ffmpeg';
import { aiProvider } from '../providers/ai.provider';
import { logger } from '../utils/logger';
import { fileExists } from '../utils/file-manager';
import { DIRS } from '../config/constants';
import { youtubeService } from './youtube.service';

export interface CartoonPipelineOptions {
  topic?: string;
  theme?: string;
  language?: string;
  style?: string;
  tone?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
  characters?: string[];
  targetChannelId?: string;
}

export interface CartoonPipelineResult {
  videoId: string;
  title: string;
  videoPath: string;
  status: string;
  youtubeVideoId?: string;
}

class CartoonPipelineService {
  async runCartoonPipeline(options?: CartoonPipelineOptions): Promise<CartoonPipelineResult> {
    const episodeTag = options?.episodeNumber && options?.totalEpisodes ? ` (Ep ${options.episodeNumber}/${options.totalEpisodes})` : '';
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🎨 [Cartoon Studio] Starting dedicated Cartoon Video Pipeline${episodeTag}`);
    logger.info(`📌 Premise: "${options?.seriesTitle || options?.topic || options?.theme || 'Auto Cartoon Story'}"`);
    logger.info(`${'='.repeat(60)}`);

    // Create a new video record
    const video = await prisma.video.create({
      data: {
        status: 'RESEARCHING',
        progress: 10,
      },
    });
    const videoId = video.id;

    try {
      // ── Step 1: Generate Cartoon Story & Dialogue ─────────────────────────
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'SCRIPT_GENERATING', progress: 25 },
      });

      const scriptOutput: CartoonScriptOutput = await cartoonScriptService.generateCartoonScript({
        topic: options?.topic,
        theme: options?.theme,
        language: options?.language || 'Hindi',
        style: options?.style || '3D Pixar Disney Style Animation',
        tone: options?.tone || 'Playful, Funny & Dramatic',
        seriesTitle: options?.seriesTitle,
        episodeNumber: options?.episodeNumber,
        totalEpisodes: options?.totalEpisodes,
      });

      await prisma.video.update({
        where: { id: videoId },
        data: {
          hook: scriptOutput.hook,
          script: scriptOutput.script,
          scenes: JSON.stringify(scriptOutput.scenes),
          status: 'SCRIPT_READY',
          progress: 35,
        },
      });
      logger.info(`✅ [Cartoon Pipeline] Story script generated: "${scriptOutput.title}"`);

      // ── Step 2: Build Visual Instructions & Acquire Assets ─────────────────
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'GENERATING_ASSETS', progress: 50 },
      });

      const instructions = await cartoonVisualService.buildCartoonSceneInstructions(
        scriptOutput.title,
        scriptOutput.scenes
      );

      const visuals: CartoonVisualAsset[] = await cartoonVisualService.generateCartoonVisuals(
        videoId,
        instructions,
        scriptOutput.title
      );
      logger.info(`✅ [Cartoon Pipeline] ${visuals.length} visual assets ready`);

      // ── Step 3: Voice Generation ──────────────────────────────────────────
      const audioPath = await voiceService.generateVoice(videoId, scriptOutput.script);
      logger.info(`✅ [Cartoon Pipeline] Narration audio generated: ${audioPath}`);

      // ── Step 4: Video Rendering with Cartoon BGM ──────────────────────────
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'RENDERING', progress: 75, audioPath },
      });

      const cartoonBgmPath = path.resolve(process.cwd(), 'assets/audio/bgm/cartoon-playful.mp3');
      const bgmToUse = (await fileExists(cartoonBgmPath)) ? cartoonBgmPath : undefined;

      const sceneInputs = visuals.map((v) => ({
        mediaPath: v.mediaPath,
        imagePath: v.imagePath,
        mediaType: v.mediaType,
        duration: v.duration,
        caption: v.caption,
      }));

      const videoPath = await renderVideo({
        videoId,
        scenes: sceneInputs,
        audioPath,
        musicPath: bgmToUse,
      });
      logger.info(`✅ [Cartoon Pipeline] Rendered final 9:16 cartoon video: ${videoPath}`);

      // ── Step 5: Cartoon SEO Metadata ──────────────────────────────────────
      const metadataPrompt = `You are a YouTube Shorts SEO specialist for viral animated cartoon channels.

Title: "${scriptOutput.title}"
Script excerpt: "${scriptOutput.script.substring(0, 400)}"

Generate high-CTR YouTube Shorts metadata.
Rules:
- Title: Under 70 chars, includes cartoon emojis, includes #Shorts
- Description: Engaging story teaser + moral takeaway + call to subscribe (150-250 chars)
- Hashtags: 5-8 tags starting with #Shorts, #Cartoon, #Animation, #3DAnimation
- Tags: 10-15 keywords (cartoon stories, 3d animation, funny story, animated short, kids stories)

Return JSON:
{
  "title": "...",
  "description": "...",
  "hashtags": ["#Shorts", "#Cartoon", "#Animation", "#3DAnimation"],
  "tags": ["cartoon", "animation", "3d animation", "stories"]
}`;

      const meta = await aiProvider.generateJSON<{
        title: string;
        description: string;
        hashtags: string[];
        tags: string[];
      }>(metadataPrompt);

      const finalTitle = meta.title || `${scriptOutput.title} 🎨 #Shorts`;

      await prisma.video.update({
        where: { id: videoId },
        data: {
          title: finalTitle,
          description: meta.description,
          hashtags: JSON.stringify(meta.hashtags || ['#Shorts', '#Cartoon']),
          tags: JSON.stringify(meta.tags || ['cartoon', 'animation']),
          videoPath,
          status: 'READY_TO_PUBLISH',
          progress: 100,
        },
      });

      // ── Step 6: YouTube Auto-Publish for Cartoon Channel ───────────────────
      const cartoonSettings = await prisma.channelSettings.findFirst({
        where: { niche: { contains: 'Cartoon' } },
      });

      let youtubeVideoId: string | undefined = undefined;
      let finalStatus = 'READY_TO_PUBLISH';

      if (cartoonSettings?.youtubeConnected && cartoonSettings?.autoPublish) {
        try {
          logger.info(`📤 [Cartoon Pipeline] Auto-publishing to connected Cartoon YouTube channel...`);
          youtubeVideoId = await youtubeService.publishVideo(videoId, 'cartoon');
          finalStatus = 'PUBLISHED';
          logger.info(`🎉 [Cartoon Pipeline] Published to Cartoon YouTube Channel: https://youtube.com/shorts/${youtubeVideoId}`);
        } catch (pubErr: any) {
          logger.warn(`[Cartoon Pipeline] YouTube upload failed (saved locally): ${pubErr.message}`);
        }
      }

      logger.info(`🎉 [Cartoon Pipeline] Finished! Video Ready: ${finalTitle} (${finalStatus})`);
      return {
        videoId,
        title: finalTitle,
        videoPath,
        status: finalStatus,
        youtubeVideoId,
      };
    } catch (err: any) {
      logger.error(`❌ [Cartoon Pipeline] Failed: ${err.message}`, err);
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      throw err;
    }
  }
}

export const cartoonPipelineService = new CartoonPipelineService();
