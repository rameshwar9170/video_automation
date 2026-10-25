import fs from 'fs/promises';
import path from 'path';
import { DIRS } from '../config/constants';
import { logger } from './logger';

/** Ensure all generated/* directories exist at startup. */
export async function ensureDirectories(): Promise<void> {
  for (const dir of Object.values(DIRS)) {
    await fs.mkdir(dir, { recursive: true });
    logger.debug(`Directory ready: ${dir}`);
  }
  await fs.mkdir('logs', { recursive: true });
}

/** Build a safe per-video directory for images. */
export function videoImagesDir(videoId: string): string {
  return path.join(DIRS.images, videoId);
}

/** Build a unique filename with timestamp. */
export function uniqueFilename(prefix: string, ext: string): string {
  return `${prefix}-${Date.now()}${ext}`;
}

/** Download a file from URL and save to destination. Returns dest path. */
export async function downloadFile(url: string, dest: string): Promise<string> {
  const { default: axios } = await import('axios');
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(res.data));
  logger.debug(`Downloaded: ${url} → ${dest}`);
  return dest;
}

/** Check if a file exists and has non-zero size. */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size > 0;
  } catch {
    return false;
  }
}

/** Write JSON data to a file for debugging/tracing. */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
