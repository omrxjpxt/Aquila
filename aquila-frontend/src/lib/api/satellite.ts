import { apiClient } from './client';
import { SatelliteScene, ProcessingResult, Slick } from './types';

export const satelliteApi = {
  /**
   * Upload a GeoTIFF for ingestion
   */
  ingest: async (file: File): Promise<SatelliteScene> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<SatelliteScene>('/satellite/ingest', formData);
  },

  /**
   * Ingest the server's sample scene (dev only)
   */
  ingestSample: async (): Promise<SatelliteScene> => {
    return apiClient.post<SatelliteScene>('/satellite/ingest/sample');
  },

  /**
   * Get an ingested scene by ID
   */
  getScene: async (sceneId: string): Promise<SatelliteScene> => {
    return apiClient.get<SatelliteScene>(`/satellite/scenes/${sceneId}`);
  },

  /**
   * Run preprocessing on an ingested scene
   */
  processScene: async (sceneId: string): Promise<ProcessingResult> => {
    return apiClient.post<ProcessingResult>(`/satellite/scenes/${sceneId}/process`);
  },

  /**
   * Get detected candidate slicks for a processed scene
   */
  getCandidates: async (sceneId: string): Promise<Slick[]> => {
    return apiClient.get<Slick[]>(`/satellite/scenes/${sceneId}/candidates`);
  },
};
