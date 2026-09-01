import { apiClient } from './client';
import { 
  HindcastRequest, 
  ForecastRequest, 
  DriftResult, 
  ForecastResult 
} from './types';

export const driftApi = {
  /**
   * Run backward drift reconstruction to estimate slick origin.
   */
  runHindcast: async (request: HindcastRequest): Promise<DriftResult> => {
    return apiClient.post<DriftResult>('/drift/hindcast', request);
  },

  /**
   * Run forward drift to predict future extent.
   */
  runForecast: async (request: ForecastRequest): Promise<ForecastResult> => {
    return apiClient.post<ForecastResult>('/drift/forecast', request);
  },
  
  /**
   * Get an existing drift scenario result
   */
  getScenario: async (scenarioId: string): Promise<DriftResult | ForecastResult> => {
    return apiClient.get<DriftResult | ForecastResult>(`/drift/scenario/${scenarioId}`);
  }
};
