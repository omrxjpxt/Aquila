import { VesselCandidate, OriginEstimate } from './types';
import { apiClient } from './client';

export const aisApi = {
  async discoverCandidates(investigationId: string, origin: OriginEstimate, startTime: string, endTime: string, mode: string = "MOCK"): Promise<VesselCandidate[]> {
    return apiClient.post<VesselCandidate[]>('/ais/candidates', {
        investigation_id: investigationId,
        origin,
        start_time: startTime,
        end_time: endTime,
        mode: mode
    });
  },
  
  async uploadByodData(investigationId: string, file: File, declaredSource?: string): Promise<any> {
    const formData = new FormData();
    formData.append('investigation_id', investigationId);
    formData.append('file', file);
    if (declaredSource) {
      formData.append('declared_source', declaredSource);
    }
    
    // apiClient.post defaults to JSON, so we use raw fetch for FormData
    const response = await fetch(`${apiClient.baseUrl}/ais/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `Upload failed with status ${response.status}`);
    }
    
    return response.json();
  }
};
