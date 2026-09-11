import { apiClient } from './client';
import { MonitoringZone, MonitoringJob, JobStatus, MonitoringStatus, SaveZonePayload } from './types';

export const monitoringApi = {
  async getStatus(): Promise<MonitoringStatus> {
    return apiClient.get('/monitoring/status');
  },

  async getZones(): Promise<MonitoringZone[]> {
    return apiClient.get('/monitoring/zones');
  },

  async saveZone(payload: SaveZonePayload): Promise<MonitoringZone> {
    return apiClient.post('/monitoring/zones', payload);
  },

  async getJobs(status?: JobStatus, limit: number = 50): Promise<MonitoringJob[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    
    return apiClient.get(`/monitoring/jobs?${params.toString()}`);
  },

  async getJob(jobId: string): Promise<MonitoringJob> {
    return apiClient.get(`/monitoring/jobs/${jobId}`);
  }
};
