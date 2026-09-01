import { AttributionResult, VesselCandidate, OriginEstimate, DriftResult } from './types';
import { apiClient } from './client';

export const attributionApi = {
  async evaluateCandidates(
    investigationId: string,
    origin: OriginEstimate,
    drift: DriftResult,
    candidates: VesselCandidate[]
  ): Promise<AttributionResult> {
    return apiClient.post<AttributionResult>('/attribution/evaluate', {
      investigation_id: investigationId,
      origin_estimate: origin,
      drift_result: drift,
      candidates: candidates
    });
  }
};
