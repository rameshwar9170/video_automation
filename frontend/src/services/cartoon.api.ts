import { apiClient } from './api';
import { Video, ApiResponse } from '../types';

export interface CartoonTheme {
  id: string;
  title: string;
  description: string;
  emoji: string;
  example: string;
}

export interface CartoonChannelStatus {
  connected: boolean;
  channelName: string | null;
  channelId: string | null;
  autoPublish: boolean;
  subscriberCount: string | null;
  viewCount: string | null;
  videoCount: string | null;
  avatarUrl: string | null;
  customUrl: string | null;
  recentVideos: any[];
}

export interface CartoonScriptScene {
  sceneNumber: number;
  duration: number;
  narration: string;
  characterName?: string;
  voiceTone?: string;
  characterAction: string;
  visualInstruction: string;
  caption: string;
}

export interface CartoonScriptPreviewData {
  title: string;
  hook: string;
  moralLesson?: string;
  script: string;
  scenes: CartoonScriptScene[];
  totalDuration: number;
  episodeNumber?: number;
  totalEpisodes?: number;
}

export const cartoonApi = {
  getVideos: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Video[]>>('/cartoon/videos', { params }).then((r) => r.data),

  getThemes: () =>
    apiClient.get<ApiResponse<CartoonTheme[]>>('/cartoon/themes').then((r) => r.data),

  generate: (data: {
    topic?: string;
    theme?: string;
    language?: string;
    style?: string;
    tone?: string;
    seriesTitle?: string;
    episodeNumber?: number;
    totalEpisodes?: number;
    characters?: string[];
  }) =>
    apiClient
      .post<ApiResponse<{ runId: string; topic: string }>>('/cartoon/generate', data)
      .then((r) => r.data),

  generateSeries: (data: {
    seriesTitle: string;
    totalEpisodes: number;
    theme?: string;
    language?: string;
    style?: string;
    tone?: string;
    characters?: string[];
  }) =>
    apiClient
      .post<ApiResponse<{ message: string; seriesTitle: string; totalEpisodes: number }>>(
        '/cartoon/generate-series',
        data
      )
      .then((r) => r.data),

  getChannelStatus: () =>
    apiClient.get<ApiResponse<CartoonChannelStatus>>('/cartoon/channel').then((r) => r.data),

  toggleAutoPublish: (autoPublish: boolean) =>
    apiClient
      .post<ApiResponse<{ success: boolean; autoPublish: boolean }>>('/cartoon/channel/auto-publish', {
        autoPublish,
      })
      .then((r) => r.data),

  getConnectUrl: () =>
    apiClient
      .get<ApiResponse<{ authUrl: string }>>('/youtube/connect?target=cartoon')
      .then((r) => r.data),

  disconnectChannel: () =>
    apiClient
      .delete<ApiResponse<{ message: string }>>('/youtube/disconnect?target=cartoon')
      .then((r) => r.data),

  previewScript: (data: {
    topic?: string;
    theme?: string;
    language?: string;
    style?: string;
    tone?: string;
    seriesTitle?: string;
    episodeNumber?: number;
    totalEpisodes?: number;
  }) =>
    apiClient
      .post<ApiResponse<CartoonScriptPreviewData>>('/cartoon/script-preview', data)
      .then((r) => r.data),
};
