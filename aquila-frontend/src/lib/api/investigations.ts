import { apiClient } from './client';
import { Investigation, EvidenceEvent } from './types';

export const investigationsApi = {
  async listInvestigations(): Promise<Investigation[]> {
    return apiClient.get('/investigations');
  },

  async getInvestigation(id: string): Promise<Investigation> {
    return apiClient.get(`/investigations/${id}`);
  },

  async getEvidence(id: string): Promise<EvidenceEvent[]> {
    return apiClient.get(`/investigations/${id}/evidence`);
  }
};
