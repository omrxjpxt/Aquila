import { CounterfactualScenario, CounterfactualResult } from './types';
import { apiClient } from './client';

export const simulationApi = {
  async runCounterfactual(scenario: CounterfactualScenario): Promise<CounterfactualResult> {
    return apiClient.post<CounterfactualResult>('/simulation/counterfactual', scenario);
  }
};
