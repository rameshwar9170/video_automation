import { apiClient } from './api';
import { ChannelSettings, ApiResponse } from '../types';

export const settingsApi = {
  get: () =>
    apiClient.get<ApiResponse<ChannelSettings>>('/settings').then((r) => r.data),

  save: (data: Partial<ChannelSettings>) =>
    apiClient.post<ApiResponse<ChannelSettings>>('/settings', data).then((r) => r.data),
};
