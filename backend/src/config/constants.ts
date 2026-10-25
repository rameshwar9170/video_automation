import { env } from './env';
import path from 'path';

export const GENERATED_DIR = path.resolve(env.GENERATED_DIR);

export const DIRS = {
  research: path.join(GENERATED_DIR, 'research'),
  scripts: path.join(GENERATED_DIR, 'scripts'),
  audio: path.join(GENERATED_DIR, 'audio'),
  images: path.join(GENERATED_DIR, 'images'),
  videos: path.join(GENERATED_DIR, 'videos'),
  thumbnails: path.join(GENERATED_DIR, 'thumbnails'),
};

export const VIDEO_TARGET = {
  width: 1080,
  height: 1920,
  aspectRatio: '9:16',
  format: 'mp4',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  fps: 30,
};

export const YOUTUBE_CATEGORY_ID = '28'; // Science & Technology
export const YOUTUBE_DEFAULT_PRIVACY = 'public';

export const PIPELINE_STATUS = [
  'RESEARCHING',
  'TOPIC_SELECTED',
  'SCRIPT_GENERATING',
  'SCRIPT_READY',
  'GENERATING_ASSETS',
  'RENDERING',
  'METADATA_READY',
  'QUALITY_CHECK',
  'READY_TO_PUBLISH',
  'UPLOADING',
  'PUBLISHED',
  'FAILED',
] as const;
