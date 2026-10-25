import path from 'path';
import fs from 'fs/promises';
import { imageProvider } from '../providers/image.provider';
import { videoClipProvider } from '../providers/video-clip.provider';
import { SceneInstruction } from './scene.service';
import { DIRS } from '../config/constants';
import { fileExists } from '../utils/file-manager';
import { logger } from '../utils/logger';

export interface VisualAsset {
  sceneNumber: number;
  imagePath: string; // Keeps backward compatibility with callers expecting imagePath
  mediaPath: string;
  mediaType: 'video' | 'image';
}

class VisualService {
  /**
   * Acquire visuals for each scene in parallel for high-speed generation:
   * 1. Prioritize real motion video clips (.mp4) from Pexels, Pixabay, or Mixkit.
   * 2. Fall back to high-resolution AI/editorial imagery (.png) if motion clip is unavailable.
   */
  async generateVisuals(
    videoId: string,
    scenes: SceneInstruction[]
  ): Promise<VisualAsset[]> {
    const videoMediaDir = path.join(DIRS.images, videoId);
    await fs.mkdir(videoMediaDir, { recursive: true });

    logger.info(`[Visual] Starting high-speed parallel visual acquisition for ${scenes.length} scenes...`);

    const assets = await Promise.all(
      scenes.map(async (scene): Promise<VisualAsset> => {
        const sceneNumStr = String(scene.sceneNumber).padStart(2, '0');
        const videoClipPath = path.join(videoMediaDir, `scene-${sceneNumStr}.mp4`);
        const imagePath = path.join(videoMediaDir, `scene-${sceneNumStr}.png`);

        // ── Step 1: Check if real video clip already exists on disk ───────────────
        const videoClipExists = await fileExists(videoClipPath);
        if (videoClipExists) {
          try {
            const stats = await fs.stat(videoClipPath);
            if (stats.size > 25000) {
              logger.info(
                `[Visual Resume] Scene ${scene.sceneNumber} using existing motion clip: ${videoClipPath}`
              );
              return {
                sceneNumber: scene.sceneNumber,
                mediaPath: videoClipPath,
                imagePath: videoClipPath,
                mediaType: 'video',
              };
            }
          } catch {}
        }

        // ── Step 2: Search and fetch actual motion video clip ────────────────────
        const searchQuery = scene.videoQuery || scene.visualInstruction || scene.imagePrompt;
        let fetchedClipPath: string | null = null;
        try {
          fetchedClipPath = await videoClipProvider.fetchVideoClip(
            searchQuery,
            videoClipPath,
            scene.backupQuery,
            scene.visualInstruction
          );
        } catch (clipErr) {
          logger.warn(
            `[Visual] Video clip search failed for scene ${scene.sceneNumber}: ${(clipErr as Error).message}`
          );
        }

        if (fetchedClipPath) {
          logger.info(
            `🎬 [Visual] Scene ${scene.sceneNumber}: Motion video acquired!`
          );
          return {
            sceneNumber: scene.sceneNumber,
            mediaPath: fetchedClipPath,
            imagePath: fetchedClipPath,
            mediaType: 'video',
          };
        }

        // ── Step 3: Check if valid image already exists on disk ──────────────────
        const imageExists = await fileExists(imagePath);
        if (imageExists) {
          try {
            const stats = await fs.stat(imagePath);
            if (stats.size > 20000) {
              return {
                sceneNumber: scene.sceneNumber,
                mediaPath: imagePath,
                imagePath,
                mediaType: 'image',
              };
            }
          } catch {}
        }

        // ── Step 4: Fallback to high-resolution image generation ─────────────────
        logger.info(
          `🖼️ [Visual Fallback] Scene ${scene.sceneNumber}: Generating visual image for "${scene.imagePrompt.substring(0, 45)}…"`
        );

        try {
          await imageProvider.generateImage(scene.imagePrompt, imagePath);
          const exists = await fileExists(imagePath);
          if (!exists) throw new Error('Image file not created');

          return {
            sceneNumber: scene.sceneNumber,
            mediaPath: imagePath,
            imagePath,
            mediaType: 'image',
          };
        } catch (err) {
          logger.error(`[Visual] Scene ${scene.sceneNumber} failed:`, err);
          throw new Error(
            `Visual generation failed for scene ${scene.sceneNumber}: ${(err as Error).message}`
          );
        }
      })
    );

    // Sort to guarantee ascending order
    assets.sort((a, b) => a.sceneNumber - b.sceneNumber);

    const videoCount = assets.filter((a) => a.mediaType === 'video').length;
    const imageCount = assets.filter((a) => a.mediaType === 'image').length;
    logger.info(
      `⚡ [Visual Speed] All assets ready for video ${videoId} (${videoCount} motion videos, ${imageCount} images)`
    );
    return assets;
  }
}

export const visualService = new VisualService();
