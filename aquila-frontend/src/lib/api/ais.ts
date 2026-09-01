import { VesselCandidate, OriginEstimate } from './types';
import { apiClient } from './client';

export const aisApi = {
  async discoverCandidates(origin: OriginEstimate, startTime: string, endTime: string): Promise<VesselCandidate[]> {
    return apiClient.post<VesselCandidate[]>('/ais/candidates', {
        origin,
        start_time: startTime,
        end_time: endTime
    });
  }
};
