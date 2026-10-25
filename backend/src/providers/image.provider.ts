import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

if (ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

/**
 * Image generation and retrieval provider for YouTube Shorts.
 * 1. Tavily Search: fetches real, high-resolution topical web & editorial images matching scene instructions.
 * 2. Picsum HD Fallback: high-res 1080x1920 vertical photography.
 * 3. Gradient Visual Card: stylized high-contrast motion background.
 */
class ImageProvider {
  /**
   * Generate or fetch a 1080x1920 vertical visual for the given scene prompt.
   */
  async generateImage(prompt: string, outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Method 1: Search Tavily for high-res topic images matching the scene
    if (env.TAVILY_API_KEY) {
      try {
        const cleanQuery = prompt
          .replace(/[^\w\s]/gi, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 75)
          .trim();

        logger.info(`[Visual Engine] Searching images for scene: "${cleanQuery}"`);
        const res = await axios.post(
          'https://api.tavily.com/search',
          {
            api_key: env.TAVILY_API_KEY,
            query: cleanQuery,
            include_images: true,
            max_results: 5,
          },
          { timeout: 12000 }
        );

        const images: string[] = res.data.images ?? [];
        logger.info(`[Visual Engine] Found ${images.length} images for scene`);

        for (const imgUrl of images) {
          try {
            const rawBuf = await axios.get(imgUrl, {
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });

            if (rawBuf.data && rawBuf.data.length > 10000) {
              const rawTemp = `${outputPath}-raw.tmp`;
              await fs.writeFile(rawTemp, Buffer.from(rawBuf.data));

              // Process & resize to vertical 1080x1920 9:16 using FFmpeg
              await new Promise<void>((resolve, reject) => {
                ffmpeg(rawTemp)
                  .videoFilter([
                    'scale=1080:1920:force_original_aspect_ratio=increase',
                    'crop=1080:1920',
                  ])
                  .outputOptions(['-vframes', '1'])
                  .output(outputPath)
                  .on('end', async () => {
                    try {
                      await fs.unlink(rawTemp);
                    } catch {}
                    resolve();
                  })
                  .on('error', (err) => {
                    try {
                      fsSync.unlinkSync(rawTemp);
                    } catch {}
                    reject(err);
                  })
                  .run();
              });

              logger.info(`[Visual Engine] Processed 1080x1920 visual: ${outputPath}`);
              return outputPath;
            }
          } catch (imgErr) {
            // Try next candidate image
            continue;
          }
        }
      } catch (err: any) {
        logger.warn(`[Visual Engine] Tavily image search non-fatal error: ${err.message}`);
      }
    }

    // Method 2: High-resolution vertical photography fallback (Picsum 1080x1920)
    try {
      logger.info(`[Visual Engine] Using high-resolution vertical photo for: ${outputPath}`);
      const randomSeed = Math.floor(Math.random() * 10000);
      const picsumRes = await axios.get(`https://picsum.photos/1080/1920?random=${randomSeed}`, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      if (picsumRes.data && picsumRes.data.length > 15000) {
        await fs.writeFile(outputPath, Buffer.from(picsumRes.data));
        logger.info(`[Visual Engine] Saved 1080x1920 photo: ${outputPath}`);
        return outputPath;
      }
    } catch (err: any) {
      logger.warn(`[Visual Engine] Picsum photo fallback failed: ${err.message}`);
    }

    // Method 3: Stylized High-Contrast Graphic Card fallback (Never a blank screen)
    logger.warn(`[Visual Engine] Generating stylized gradient graphic card`);
    return this.generateGraphicCard(outputPath);
  }

  private async generateGraphicCard(outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=c=0x1e1b4b:s=1080x1920:d=1')
        .inputFormat('lavfi')
        .outputOptions(['-vframes', '1'])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
}

export const imageProvider = new ImageProvider();
