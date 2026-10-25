import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger';
import { fileExists } from './file-manager';
import { DIRS, VIDEO_TARGET, GENERATED_DIR } from '../config/constants';

if (ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

export interface SceneInput {
  imagePath?: string;
  mediaPath?: string;
  mediaType?: 'video' | 'image';
  duration: number;
  caption?: string;
}

export interface RenderOptions {
  videoId: string;
  scenes: SceneInput[];
  audioPath: string;
  musicPath?: string;
  outputPath?: string;
}

/**
 * Render a 9:16 1080x1920 MP4 combining real motion video clips (.mp4)
 * and/or dynamic cinematic camera motion images synced with voice audio.
 */
export async function renderVideo(options: RenderOptions): Promise<string> {
  const { videoId, scenes, audioPath, outputPath } = options;

  const outPath = outputPath ?? path.join(DIRS.videos, `${videoId}.mp4`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const fps = VIDEO_TARGET.fps || 30;

  return new Promise(async (resolve, reject) => {
    try {
      const cmd = ffmpeg();

      // Check if Background Music exists
      const defaultBgm = path.resolve(process.cwd(), 'assets/audio/bgm/tech-beat.mp3');
      const customBgm = options.musicPath;
      let bgmToUse: string | null = null;
      if (customBgm && (await fileExists(customBgm))) {
        bgmToUse = customBgm;
      } else if (await fileExists(defaultBgm)) {
        bgmToUse = defaultBgm;
      }

      // Add each scene input (handles real video clips vs static images)
      scenes.forEach((s) => {
        const filePath = (s.mediaPath || s.imagePath || '').replace(/\\/g, '/');
        const isVideo =
          s.mediaType === 'video' ||
          filePath.toLowerCase().endsWith('.mp4') ||
          filePath.toLowerCase().endsWith('.mov') ||
          filePath.toLowerCase().endsWith('.webm');

        if (isVideo) {
          // Real motion video: loop if shorter than duration, limit to scene duration
          cmd.input(filePath).inputOptions(['-stream_loop -1', `-t ${s.duration}`]);
        } else {
          // Image: loop for scene duration
          cmd.input(filePath).inputOptions(['-loop 1', `-t ${s.duration}`]);
        }
      });

      // Add voice audio as input
      cmd.input(audioPath);
      const voiceAudioIndex = scenes.length;

      // Add background music if available
      let bgmAudioIndex: number | null = null;
      if (bgmToUse) {
        cmd.input(bgmToUse.replace(/\\/g, '/'));
        bgmAudioIndex = scenes.length + 1;
        logger.info(`🎵 [BGM Engine] Mixing background track: ${bgmToUse}`);
      }

      // Build complexFilter: process each video or image scene
      const filterChains: string[] = [];
      const vLabels: string[] = [];

      scenes.forEach((s, i) => {
        const filePath = (s.mediaPath || s.imagePath || '').replace(/\\/g, '/');
        const isVideo =
          s.mediaType === 'video' ||
          filePath.toLowerCase().endsWith('.mp4') ||
          filePath.toLowerCase().endsWith('.mov') ||
          filePath.toLowerCase().endsWith('.webm');

        const vLabel = `v${i}`;
        vLabels.push(`[${vLabel}]`);

        // Build bold high-contrast comic-style subtitle overlay if caption exists
        let captionFilter = '';
        if (s.caption && s.caption.trim().length > 0) {
          const safeCaption = s.caption
            .replace(/[\r\n]+/g, ' ')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/%/g, '%%')
            .trim();
          captionFilter = `,drawtext=text='${safeCaption}':fontsize=52:fontcolor=yellow:borderw=4:bordercolor=black:box=1:boxcolor=black@0.72:boxborderw=12:x=(w-text_w)/2:y=h*0.75`;
        }

        if (isVideo) {
          // Real motion video clip: scale & crop to 1080x1920 portrait 9:16, setsar=1, reset PTS, trim, add caption
          filterChains.push(
            `[${i}:v]scale=${VIDEO_TARGET.width}:${VIDEO_TARGET.height}:force_original_aspect_ratio=increase,` +
            `crop=${VIDEO_TARGET.width}:${VIDEO_TARGET.height},` +
            `setsar=1,` +
            `fps=${fps},setpts=PTS-STARTPTS,trim=duration=${s.duration}${captionFilter}[${vLabel}]`
          );
        } else {
          // Static image: apply alternating dynamic Ken Burns zoompan + setsar=1 + caption
          const frames = Math.max(1, Math.round(s.duration * fps));
          const zoomExpr =
            i % 2 === 0
              ? "min(zoom+0.0015,1.20)" // Smooth slow zoom in
              : "if(lte(zoom,1.0),1.18,max(1.001,zoom-0.0014))"; // Smooth slow zoom out

          filterChains.push(
            `[${i}:v]scale=${VIDEO_TARGET.width}:${VIDEO_TARGET.height}:force_original_aspect_ratio=increase,` +
            `crop=${VIDEO_TARGET.width}:${VIDEO_TARGET.height},` +
            `setsar=1,` +
            `zoompan=z='${zoomExpr}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${VIDEO_TARGET.width}x${VIDEO_TARGET.height}:fps=${fps},` +
            `trim=duration=${s.duration},setpts=PTS-STARTPTS${captionFilter}[${vLabel}]`
          );
        }
      });

      filterChains.push(`${vLabels.join('')}concat=n=${scenes.length}:v=1:a=0[vout]`);

      const outputMaps = ['-map [vout]'];

      if (bgmAudioIndex !== null) {
        // Auto-ducking BGM mixing: resample both to standard 44100Hz stereo to prevent filter graph crash
        filterChains.push(`[${voiceAudioIndex}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.0[voice_a]`);
        filterChains.push(`[${bgmAudioIndex}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.14[bgm_a]`);
        filterChains.push(`[voice_a][bgm_a]amix=inputs=2:duration=first:dropout_transition=2[aout]`);
        outputMaps.push('-map [aout]');
      } else {
        outputMaps.push(`-map ${voiceAudioIndex}:a`);
      }

      cmd
        .complexFilter(filterChains)
        .outputOptions([
          ...outputMaps,
          '-c:v', VIDEO_TARGET.videoCodec,
          '-preset', 'ultrafast',
          '-threads', '2',
          '-max_muxing_queue_size', '1024',
          '-c:a', VIDEO_TARGET.audioCodec,
          '-pix_fmt', 'yuv420p',
          '-shortest',
          '-movflags', '+faststart',
        ])
        .output(outPath)
        .on('start', (c) => logger.debug(`FFmpeg dynamic motion render start: ${c}`))
        .on('progress', (p) => logger.debug(`FFmpeg progress: ${p.percent ? p.percent.toFixed(1) + '%' : 'processing'}`))
        .on('end', async () => {
          logger.info(`Base cinematic motion video rendered: ${outPath}`);
          try {
            const finalPath = await applyPresenterAvatarOverlay(outPath, videoId);
            resolve(finalPath);
          } catch (overlayErr) {
            logger.warn(`Avatar overlay skipped: ${(overlayErr as Error).message}`);
            resolve(outPath);
          }
        })
        .on('error', async (err) => {
          logger.warn(`Dynamic motion filter fallback: ${err.message}. Falling back to standard concat demuxer.`);
          try {
            const fallbackPath = await renderVideoConcatFallback(options);
            resolve(fallbackPath);
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        })
        .run();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fallback concat demuxer for edge compatibility.
 */
async function renderVideoConcatFallback(options: RenderOptions): Promise<string> {
  const { videoId, scenes, audioPath, outputPath } = options;
  const outPath = outputPath ?? path.join(DIRS.videos, `${videoId}.mp4`);

  const tempDir = path.join(DIRS.videos, `temp-${videoId}`);
  await fs.mkdir(tempDir, { recursive: true });

  const tempClips: string[] = [];
  const fps = VIDEO_TARGET.fps || 30;

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const filePath = (s.mediaPath || s.imagePath || '').replace(/\\/g, '/');
    const isVideo =
      s.mediaType === 'video' ||
      filePath.toLowerCase().endsWith('.mp4') ||
      filePath.toLowerCase().endsWith('.mov') ||
      filePath.toLowerCase().endsWith('.webm');

    const tempClip = path.join(tempDir, `clip-${i}.mp4`);
    tempClips.push(tempClip);

    await new Promise<void>((resolve, reject) => {
      const clipCmd = ffmpeg();
      if (isVideo) {
        clipCmd.input(filePath).inputOptions(['-stream_loop -1', `-t ${s.duration}`]);
      } else {
        clipCmd.input(filePath).inputOptions(['-loop 1', `-t ${s.duration}`]);
      }

      clipCmd
        .videoFilter([
          `scale=${VIDEO_TARGET.width}:${VIDEO_TARGET.height}:force_original_aspect_ratio=increase`,
          `crop=${VIDEO_TARGET.width}:${VIDEO_TARGET.height}`,
          `fps=${fps}`,
          'setpts=PTS-STARTPTS',
        ])
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', `-t ${s.duration}`])
        .output(tempClip)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  const concatListFile = path.join(tempDir, 'list.txt');
  const fileLines = tempClips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(concatListFile, fileLines, 'utf-8');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .input(audioPath)
      .outputOptions([
        '-c:v copy',
        '-c:a', VIDEO_TARGET.audioCodec,
        '-shortest',
        '-movflags +faststart',
      ])
      .output(outPath)
      .on('end', async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}
        resolve(outPath);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Probe a video file and return basic metadata (duration, width, height).
 */
export function probeVideo(
  filePath: string
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const video = data.streams.find((s) => s.codec_type === 'video');
      resolve({
        duration: data.format.duration ?? 0,
        width: video?.width ?? 0,
        height: video?.height ?? 0,
      });
    });
  });
}

/**
 * Overlay the AI Presenter Avatar badge onto the final video.
 */
async function applyPresenterAvatarOverlay(videoPath: string, videoId: string): Promise<string> {
  const avatarPath = path.resolve(GENERATED_DIR, 'avatar/presenter.jpg');
  const avatarExists = await fileExists(avatarPath);
  if (!avatarExists) {
    return videoPath;
  }

  const tempOut = path.resolve(DIRS.videos, `${videoId}-hybrid-temp.mp4`);
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(avatarPath).inputOptions(['-loop 1'])
      .complexFilter([
        '[1:v]scale=320:320:force_original_aspect_ratio=increase,crop=320:320,drawbox=x=0:y=0:w=320:h=320:color=cyan@0.8:t=4[avatar_box]',
        '[0:v][avatar_box]overlay=W-w-50:H-h-180:shortest=1[vout]',
      ])
      .outputOptions([
        '-map [vout]',
        '-map 0:a',
        '-c:v libx264',
        '-c:a copy',
        '-pix_fmt yuv420p',
        '-shortest',
        '-movflags +faststart',
      ])
      .output(tempOut)
      .on('end', async () => {
        try {
          await fs.unlink(videoPath);
          await fs.rename(tempOut, videoPath);
          logger.info(`🎉 Hybrid AI Presenter Avatar overlay applied: ${videoPath}`);
          resolve(videoPath);
        } catch (renameErr) {
          resolve(tempOut);
        }
      })
      .on('error', (err) => {
        logger.warn(`Failed to overlay presenter avatar: ${err.message}`);
        resolve(videoPath);
      })
      .run();
  });
}

