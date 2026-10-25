import { apiClient } from './api';
import { Video, ApiResponse } from '../types';

export const videoApi = {
  getStats: () =>
    apiClient
      .get<
        ApiResponse<{
          publishedToday: number;
          publishedTotal: number;
          failedToday: number;
          failedTotal: number;
        }>
      >('/videos/stats')
      .then((r) => r.data),

  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Video[]>>('/videos', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Video>>(`/videos/${id}`).then((r) => r.data),

  getStatus: (id: string) =>
    apiClient
      .get<ApiResponse<Pick<Video, 'status' | 'progress' | 'errorMessage' | 'youtubeVideoId'>>>(
        `/videos/${id}/status`
      )
      .then((r) => r.data),

  generate: (data?: {
    topic?: string;
    customTopic?: string;
    language?: string;
    style?: string;
    tone?: string;
    isSeries?: boolean;
    totalParts?: number;
  }) =>
    apiClient.post<ApiResponse<{ runId?: string; seriesId?: string }>>('/videos/generate', data || {}).then((r) => r.data),

  retry: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/videos/${id}/retry`).then((r) => r.data),

  publish: (id: string) =>
    apiClient.post<ApiResponse<{ youtubeVideoId: string }>>(`/videos/${id}/publish`).then((r) => r.data),
};
