import { apiClient } from './client';
import { LookAlikeRequest, LookAlikeAssessment, EvidenceFusionRequest, EvidenceFusionResult } from './types';

export const analysisApi = {
  /**
   * Assess a candidate slick to determine if it's OIL_LIKE or LOOKALIKE
   */
  assessLookAlike: async (request: LookAlikeRequest): Promise<LookAlikeAssessment> => {
    return apiClient.post<LookAlikeAssessment>('/analysis/look-alike', request);
  },

  /**
   * Fuses SAR, ML, and environmental data into an auditable evidence chain
   */
  fuseEvidence: async (request: EvidenceFusionRequest): Promise<EvidenceFusionResult> => {
    return apiClient.post<EvidenceFusionResult>('/analysis/evidence-fusion', request);
  },
};
