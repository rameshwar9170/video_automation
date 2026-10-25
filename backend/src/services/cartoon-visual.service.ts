import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { imageProvider } from '../providers/image.provider';
import { CartoonScene } from './cartoon-script.service';
import { DIRS } from '../config/constants';
import { fileExists } from '../utils/file-manager';
import { logger } from '../utils/logger';
import { aiProvider } from '../providers/ai.provider';
import { env } from '../config/env';

if (ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

export interface CartoonVisualAsset {
  sceneNumber: number;
  mediaPath: string;
  imagePath: string;
  mediaType: 'video' | 'image';
  caption: string;
  duration: number;
}

export interface CartoonSceneInstruction extends CartoonScene {
  videoQuery: string;
  imagePrompt: string;
}

class CartoonVisualService {
  /**
   * Translate cartoon scenes into 3D animation search queries and rich stylized prompts.
   */
  async buildCartoonSceneInstructions(
    storyTitle: string,
    scenes: CartoonScene[]
  ): Promise<CartoonSceneInstruction[]> {
    logger.info(`[Cartoon Visual] Building instructions for ${scenes.length} scenes`);

    const prompt = `You are a 3D Pixar & Disney animation art director.

Story: "${storyTitle}"

For each scene below, generate:
1. "videoQuery": 2 to 3 simple English stock keywords to find 3D animation / cartoon motion clips (e.g. "cartoon character animation", "cute 3d animal", "funny animated robot", "colorful cartoon motion").
2. "imagePrompt": Detailed prompt for generating a vibrant 3D Pixar/Disney style animated scene in 9:16 portrait. Emphasize cute expressive characters, Pixar lighting, Disney 3D style, volumetric light, ultra HD.

Scenes:
${scenes
  .map(
    (s) =>
      `Scene ${s.sceneNumber}:
Narration: "${s.narration}"
Action: "${s.characterAction}"
Concept: "${s.visualInstruction}"`
  )
  .join('\n\n')}

Return JSON array:
[
  {
    "sceneNumber": 1,
    "videoQuery": "3d cartoon animal animation",
    "imagePrompt": "3D Pixar Disney style animation of a cute clever monkey holding a glowing banana, big expressive eyes, bright tropical jungle, vibrant colors, 9:16 vertical portrait"
  }
]`;

    try {
      const enhanced = await aiProvider.generateJSON<
        { sceneNumber: number; videoQuery: string; imagePrompt: string }[]
      >(prompt);

      return scenes.map((scene) => {
        const match = enhanced.find((e) => e.sceneNumber === scene.sceneNumber);
        return {
          ...scene,
          videoQuery: match?.videoQuery || '3d cartoon character animation',
          imagePrompt:
            match?.imagePrompt ||
            `3D Pixar Disney animation style, ${scene.visualInstruction}, vibrant colorful, 9:16 portrait`,
        };
      });
    } catch (err) {
      logger.warn('[Cartoon Visual] Instruction enhancement fallback', err);
      return scenes.map((scene) => ({
        ...scene,
        videoQuery: '3d cartoon animation',
        imagePrompt: `3D Pixar Disney animation style, ${scene.visualInstruction}, 9:16 portrait`,
      }));
    }
  }

  /**
   * Format an image to vertical 1080x1920 9:16 portrait with SAR 1:1.
   */
  private async formatImageToPortrait(inputPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilter([
          'scale=1080:1920:force_original_aspect_ratio=increase',
          'crop=1080:1920',
          'setsar=1',
        ])
        .outputOptions(['-vframes', '1'])
        .output(outputPath)
        .on('end', async () => {
          try {
            await fs.unlink(inputPath);
          } catch {}
          resolve();
        })
        .on('error', async (err) => {
          try {
            await fs.unlink(inputPath);
          } catch {}
          reject(err);
        })
        .run();
    });
  }

  /**
   * Extract franchise keyword from story title (e.g. Shinchan, Doraemon, Motu Patlu, etc.).
   */
  private extractFranchise(title: string): string {
    const match = title.match(/shinchan|doraemon|motu\s*patlu|tom\s*and\s*jerry|chhota\s*bheem|oggy|ben\s*10|chintu|pokemon/i);
    return match ? match[0] : '';
  }

  /**
   * Acquire a visual asset that strictly matches the script's character, action, and story scene.
   */
  private async acquireScriptMatchedVisual(
    storyTitle: string,
    scene: CartoonSceneInstruction,
    targetPath: string
  ): Promise<string> {
    const rawTemp = `${targetPath}-raw.tmp`;
    const franchise = this.extractFranchise(storyTitle);

    // Strategy 1: Targeted High-Res Character Artwork Search via Tavily
    if (env.TAVILY_API_KEY) {
      try {
        const charName = scene.characterName && scene.characterName !== 'Narrator' ? scene.characterName : franchise;
        const searchPrompt = `${franchise ? franchise + ' ' : ''}${charName ? charName + ' ' : ''}${scene.characterAction} cartoon 3d wallpaper vertical`
          .replace(/[^\w\s]/gi, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 85)
          .trim();

        logger.info(`[Cartoon Visual] Searching exact character art for Scene ${scene.sceneNumber}: "${searchPrompt}"`);
        const res = await axios.post(
          'https://api.tavily.com/search',
          {
            api_key: env.TAVILY_API_KEY,
            query: searchPrompt,
            include_images: true,
            max_results: 6,
          },
          { timeout: 12000 }
        );

        const images: string[] = res.data.images ?? [];
        for (const imgUrl of images) {
          try {
            const buf = await axios.get(imgUrl, {
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (buf.data && buf.data.length > 25000) {
              await fs.writeFile(rawTemp, Buffer.from(buf.data));
              await this.formatImageToPortrait(rawTemp, targetPath);
              logger.info(`[Cartoon Visual] Acquired character art from web: ${targetPath}`);
              return targetPath;
            }
          } catch {}
        }
      } catch (err: any) {
        logger.warn(`[Cartoon Visual] Character art search note: ${err.message}`);
      }
    }

    // Strategy 2: AI 3D Pixar / Disney Scene Generation via Pollinations Flux
    try {
      const enhancedPrompt = `${franchise ? franchise + ' cartoon character, ' : ''}${scene.imagePrompt}, 3D Pixar Disney style animation, vibrant colors, vertical 9:16 portrait`;
      logger.info(
        `[Cartoon Visual] Generating custom 3D Pixar visual via AI for Scene ${scene.sceneNumber}: "${enhancedPrompt.substring(0, 70)}..."`
      );
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        enhancedPrompt
      )}?width=720&height=1280&model=flux&nologo=true`;

      const aiRes = await axios.get(pollUrl, {
        responseType: 'arraybuffer',
        timeout: 35000,
      });

      if (aiRes.data && aiRes.data.length > 15000) {
        await fs.writeFile(rawTemp, Buffer.from(aiRes.data));
        await this.formatImageToPortrait(rawTemp, targetPath);
        logger.info(`[Cartoon Visual] AI successfully generated 3D scene visual: ${targetPath}`);
        return targetPath;
      }
    } catch (aiErr: any) {
      logger.warn(`[Cartoon Visual] AI generation note: ${aiErr.message}`);
    }

    // Strategy 3: Image Provider Standard Fallback
    logger.info(`[Cartoon Visual] Applying standard fallback for Scene ${scene.sceneNumber}`);
    const fallbackPrompt = `${franchise ? franchise + ' ' : ''}${scene.imagePrompt}`;
    return await imageProvider.generateImage(fallbackPrompt, targetPath);
  }

  /**
   * Acquire media assets for each cartoon scene strictly aligned with character and narrative.
   */
  async generateCartoonVisuals(
    videoId: string,
    scenes: CartoonSceneInstruction[],
    storyTitle?: string
  ): Promise<CartoonVisualAsset[]> {
    const mediaDir = path.join(DIRS.images, videoId);
    await fs.mkdir(mediaDir, { recursive: true });

    // Normalize scene numbers sequentially to prevent duplicate numbers / file collisions
    const normalizedScenes = scenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));

    logger.info(`[Cartoon Visual] Acquiring script-matched visuals for ${normalizedScenes.length} cartoon scenes`);

    const assets: CartoonVisualAsset[] = [];

    // Process scenes in sequence to ensure rate limits and memory safety
    for (const scene of normalizedScenes) {
      const sceneStr = String(scene.sceneNumber).padStart(2, '0');
      const imgPath = path.join(mediaDir, `scene-${sceneStr}.png`);

      let finalPath = imgPath;
      if (await fileExists(imgPath)) {
        const stats = await fs.stat(imgPath);
        if (stats.size > 20000) {
          finalPath = imgPath;
        } else {
          finalPath = await this.acquireScriptMatchedVisual(storyTitle || '', scene, imgPath);
        }
      } else {
        finalPath = await this.acquireScriptMatchedVisual(storyTitle || '', scene, imgPath);
      }

      assets.push({
        sceneNumber: scene.sceneNumber,
        mediaPath: finalPath,
        imagePath: finalPath,
        mediaType: 'image',
        caption: scene.caption,
        duration: scene.duration,
      });
    }

    return assets;
  }
}

export const cartoonVisualService = new CartoonVisualService();
