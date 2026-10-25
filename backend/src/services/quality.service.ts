import { probeVideo } from '../utils/ffmpeg';
import { fileExists } from '../utils/file-manager';
import { VIDEO_TARGET } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface QualityCheckResult {
  status: 'PASS' | 'FAIL';
  score: number;
  issues: string[];
}

export interface QualityInput {
  videoPath?: string | null;
  audioPath?: string | null;
  title?: string | null;
  description?: string | null;
  hashtags: string[];
  script?: string | null;
  scenes?: unknown[];
}

class QualityService {
  async check(input: QualityInput): Promise<QualityCheckResult> {
    const issues: string[] = [];
    let score = 100;

    // ── Video file checks ─────────────────────────────────────────────
    if (!input.videoPath) {
      issues.push('Video path missing');
      score -= 40;
    } else {
      const exists = await fileExists(input.videoPath);
      if (!exists) {
        issues.push('Video file does not exist');
        score -= 40;
      } else {
        try {
          const probe = await probeVideo(input.videoPath);

          if (probe.duration < 10) {
            issues.push(`Video too short: ${probe.duration.toFixed(1)}s (min 10s)`);
            score -= 20;
          }
          if (probe.duration > 180) {
            issues.push(`Video too long: ${probe.duration.toFixed(1)}s (max 180s)`);
            score -= 10;
          }
          if (probe.width !== VIDEO_TARGET.width || probe.height !== VIDEO_TARGET.height) {
            issues.push(
              `Resolution mismatch: ${probe.width}x${probe.height} (expected ${VIDEO_TARGET.width}x${VIDEO_TARGET.height})`
            );
            score -= 15;
          }
        } catch (err) {
          issues.push(`Video probe failed: ${(err as Error).message}`);
          score -= 30;
        }
      }
    }

    // ── Audio check ───────────────────────────────────────────────────
    if (!input.audioPath) {
      issues.push('Audio path missing');
      score -= 20;
    } else {
      const audioExists = await fileExists(input.audioPath);
      if (!audioExists) {
        issues.push('Audio file does not exist');
        score -= 20;
      }
    }

    // ── Metadata checks ───────────────────────────────────────────────
    if (!input.title || input.title.trim().length < 5) {
      issues.push('Title missing or too short');
      score -= 10;
    }
    if (!input.description || input.description.trim().length < 20) {
      issues.push('Description missing or too short');
      score -= 5;
    }
    if (!input.hashtags || input.hashtags.length === 0) {
      issues.push('Hashtags missing');
      score -= 5;
    }
    if (!input.script || input.script.trim().length < 50) {
      issues.push('Script missing or too short');
      score -= 5;
    }
    if (!input.scenes || (input.scenes as unknown[]).length === 0) {
      issues.push('No scenes found');
      score -= 10;
    }

    score = Math.max(0, score);
    const threshold = env.QUALITY_THRESHOLD;
    const status: 'PASS' | 'FAIL' = score >= threshold ? 'PASS' : 'FAIL';

    logger.info(`[Quality] Score: ${score} — ${status} (${issues.length} issues)`);
    if (issues.length > 0) {
      logger.warn(`[Quality] Issues: ${issues.join(', ')}`);
    }

    return { status, score, issues };
  }
}

export const qualityService = new QualityService();
