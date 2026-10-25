// ─── Shared Types ──────────────────────────────────────────────────────────

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

export interface Video {
  id: string;
  topicId?: string;
  status: VideoStatus;
  hook?: string;
  script?: string;
  scenes?: Scene[];
  videoPath?: string;
  audioPath?: string;
  thumbnailPath?: string;
  title?: string;
  description?: string;
  hashtags: string[];
  tags: string[];
  qualityScore?: number;
  qualityIssues?: string[];
  youtubeVideoId?: string;
  publishedAt?: string;
  retryCount: number;
  errorMessage?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  topic?: Topic;
}

export interface Scene {
  sceneNumber: number;
  duration: number;
  narration: string;
  visualInstruction: string;
  caption: string;
}

export interface Topic {
  id: string;
  topic: string;
  status: 'CANDIDATE' | 'SELECTED' | 'REJECTED' | 'USED';
  freshness?: number;
  interest?: number;
  videoPotential?: number;
  informationAvailable?: number;
  originality?: number;
  risk?: number;
  score?: number;
  selectedAt?: string;
  usedAt?: string;
  createdAt: string;
}

export interface ChannelSettings {
  id?: string;
  channelName?: string;
  youtubeChannelId?: string;
  niche: string;
  language: string;
  region: string;
  videosPerDay: number;
  preferredTimes: string[];
  style: string;
  tone: string;
  targetAudience: string;
  durationMin: number;
  durationMax: number;
  autoPublish: boolean;
  autoResearch: boolean;
  aiProvider: string;
  voiceProvider: string;
  visualProvider: string;
  retryLimit: number;
  qualityThreshold: number;
  youtubeConnected: boolean;
  autonomousModeEnabled: boolean;
  schedulerNextRun?: string;
}

export interface YouTubeRecentVideo {
  videoId?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  thumbnail?: string;
}

export interface YouTubeChannel {
  connected: boolean;
  channelName?: string;
  channelId?: string;
  autoPublish: boolean;
  subscriberCount?: string | null;
  viewCount?: string | null;
  videoCount?: string | null;
  avatarUrl?: string | null;
  customUrl?: string | null;
  recentVideos?: YouTubeRecentVideo[];
}

export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  nextRun?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export const VIDEO_STATUS_STEPS: { status: VideoStatus; label: string }[] = [
  { status: 'RESEARCHING', label: 'Researching topics' },
  { status: 'TOPIC_SELECTED', label: 'Selecting topic' },
  { status: 'SCRIPT_GENERATING', label: 'Researching selected topic' },
  { status: 'SCRIPT_READY', label: 'Writing script' },
  { status: 'GENERATING_ASSETS', label: 'Generating scenes & audio' },
  { status: 'RENDERING', label: 'Rendering video' },
  { status: 'METADATA_READY', label: 'Generating metadata' },
  { status: 'QUALITY_CHECK', label: 'Quality check' },
  { status: 'READY_TO_PUBLISH', label: 'Video ready (Saved locally) ✓' },
  { status: 'UPLOADING', label: 'Uploading to YouTube' },
  { status: 'PUBLISHED', label: 'Published on YouTube ✓' },
];
