import { apiClient } from './client';
import { ReportArchiveItem } from './types';

export const reportsApi = {
  async listReports(query?: string): Promise<ReportArchiveItem[]> {
    const params = query && query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
    return apiClient.get<ReportArchiveItem[]>(`/reports${params}`);
  }
};
