// Types matching FastAPI Pydantic schemas

export interface SatelliteScene {
  id: string;
  provider: string;
  product_type: string;
  acquisition_mode: string;
  polarization: string;
  acquisition_time: string; // ISO datetime string
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  width: number;
  height: number;
  crs: string;
  raw_storage_path: string;
  processed_storage_path?: string | null;
  is_processed: boolean;
}

export interface ProcessingResult {
  scene_id: string;
  processed_path: string;
  processing_time_ms: number;
  message: string;
}

export interface SlickGeometry {
  type: string;
  coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
}

export interface Slick {
  id: string;
  geometry: SlickGeometry;
  area_km2: number;
  perimeter_km: number;
  centroid: [number, number]; // [lon, lat]
  is_verified: boolean;
  
  // Baseline threshold info
  threshold_value?: number | null;
  mean_backscatter?: number | null;
  contrast_ratio?: number | null;
  
  // Later phases
  classification?: string | null;
  confidence?: number | null;
  vessel_id?: string | null;
}

export interface PatchMetadata {
  source_scene_id: string;
  bbox?: number[] | null;
  patch_width: number;
  patch_height: number;
  extraction_method: string;
}

export interface LookAlikeAssessment {
  slick_id: string;
  predicted_class: 'OIL_LIKE' | 'LOOKALIKE' | 'UNCERTAIN';
  raw_score: number;
  uncertainty_margin: number;
  model_version: string;
  model_type: string;
  patch_metadata: PatchMetadata;
  assessed_at: string;
  
  wind_context?: Record<string, unknown>;
  optical_confirmation?: Record<string, unknown>;
  shape_morphology?: Record<string, unknown>;
  temporal_persistence?: Record<string, unknown>;
  data_quality?: Record<string, unknown>;
}

export interface LookAlikeRequest {
  slick_id: string;
  scene_id: string;
  patch_path?: string | null;
}

export type EvidenceStatus = "SUPPORTING" | "NEUTRAL" | "CONTRADICTING" | "UNAVAILABLE";
export type EvidenceCategory = "SAR Morphology" | "Model Assessment" | "Wind Context" | "Ocean Current Context" | "Optical Corroboration" | "Temporal Consistency";

export interface EvidenceItem {
  category: EvidenceCategory;
  source: string;
  status: EvidenceStatus;
  observation: string;
  interpretation: string;
  limitations: string;
  provenance: string;
  timestamp: string;
}

export interface EvidenceFusionResult {
  investigation_id: string;
  slick_id: string;
  overall_assessment_state: string;
  evidence_items: EvidenceItem[];
  supporting_evidence: EvidenceItem[];
  contradicting_evidence: EvidenceItem[];
  unavailable_evidence: EvidenceItem[];
  fused_at: string;
}

export interface EvidenceFusionRequest {
  investigation_id: string;
  scene_id: string;
  slick_id: string;
  patch_path?: string | null;
  look_alike_assessment?: LookAlikeAssessment | null;
}
