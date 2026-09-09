import { apiClient } from './client';
import { SystemStatus } from './types';

export const systemApi = {
  async getStatus(): Promise<SystemStatus> {
    return apiClient.get('/status');
  }
};
