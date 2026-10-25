import { apiClient } from './api';
import { YouTubeChannel, SchedulerStatus, Topic, ApiResponse } from '../types';

export const youtubeApi = {
  getChannel: () =>
    apiClient.get<ApiResponse<YouTubeChannel>>('/youtube/channel').then((r) => r.data),

  getConnectUrl: () =>
    apiClient.get<ApiResponse<{ authUrl: string }>>('/youtube/connect').then((r) => r.data),

  disconnect: () =>
    apiClient.delete<ApiResponse<void>>('/youtube/disconnect').then((r) => r.data),
};

export const schedulerApi = {
  start: () =>
    apiClient.post<ApiResponse<SchedulerStatus>>('/scheduler/start').then((r) => r.data),

  stop: () =>
    apiClient.post<ApiResponse<void>>('/scheduler/stop').then((r) => r.data),

  getStatus: () =>
    apiClient.get<ApiResponse<SchedulerStatus>>('/scheduler/status').then((r) => r.data),

  triggerNow: () =>
    apiClient.post<ApiResponse<void>>('/scheduler/trigger').then((r) => r.data),
};

export const researchApi = {
  getTopics: (date?: string) =>
    apiClient
      .get<ApiResponse<Topic[]>>('/topics', { params: { date } })
      .then((r) => r.data),
};
