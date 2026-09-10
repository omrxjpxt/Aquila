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
  async listScenes(): Promise<SatelliteScene[]> {
    return apiClient.get('/satellite/scenes');
  },

  async getScene(id: string): Promise<SatelliteScene> {
    return apiClient.get(`/satellite/scenes/${id}`);
  },

  getPreviewUrl(id: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
    return `${baseUrl}/api/v1/satellite/scenes/${id}/preview`;
  },
  
  async getPreviewBlob(id: string): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
    const headers = await apiClient.getAuthHeaders();
    
    const response = await fetch(`${baseUrl}/api/v1/satellite/scenes/${id}/preview`, { headers });
    if (!response.ok) throw new Error('Failed to fetch preview');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
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
