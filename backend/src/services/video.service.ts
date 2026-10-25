import { renderVideo } from '../utils/ffmpeg';
import { SceneInstruction } from './scene.service';
import { VisualAsset } from './visual.service';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { fileExists } from '../utils/file-manager';

class VideoService {
  /**
   * Render the final 9:16 video from scenes + voice audio.
   * Returns the output video path.
   */
  async renderVideo(
    videoId: string,
    scenes: SceneInstruction[],
    visuals: VisualAsset[],
    audioPath: string
  ): Promise<string> {
    logger.info(`[Video] Rendering video ${videoId}`);

    // Map scene instructions to render inputs
    const sceneInputs = scenes.map((scene) => {
      const asset = visuals.find((v) => v.sceneNumber === scene.sceneNumber);
      if (!asset) {
        throw new Error(`Missing visual asset for scene ${scene.sceneNumber}`);
      }
      return {
        imagePath: asset.imagePath,
        mediaPath: asset.mediaPath || asset.imagePath,
        mediaType: asset.mediaType || (asset.imagePath.endsWith('.mp4') ? 'video' : 'image'),
        duration: scene.duration,
        caption: scene.caption,
      };
    });

    const videoPath = await renderVideo({
      videoId,
      scenes: sceneInputs,
      audioPath,
    });

    const exists = await fileExists(videoPath);
    if (!exists) {
      throw new Error(`Rendered video file not found: ${videoPath}`);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { videoPath, status: 'METADATA_READY', progress: 80 },
    });

    logger.info(`[Video] Render complete: ${videoPath}`);
    return videoPath;
  }
}

export const videoService = new VideoService();
