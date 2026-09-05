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
  model_name: string;
  model_type: string;
  training_domain: string;
  training_representation: string;
  evaluation_domain: string;
  evaluation_status: string;
  artifact_identifier: string;
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

// Phase 5: Drift Reconstruction

export interface DriftScenario {
  scenario_id: string;
  investigation_id: string;
  slick_id?: string | null;
  start_time: string; // ISO format
  end_time: string; // ISO format
  is_backward: boolean;
  release_window_hours?: number;
  forcing_sources?: string[];
  parameters?: Record<string, unknown>;
}

export interface OriginEstimate {
  id: string;
  slick_id: string;
  scenario_id: string;
  estimated_time: string;
  time_uncertainty_hours: number;
  geometry: GeoJSON.Polygon;
  limitations: string;
}

export interface DriftTrajectory {
  id: string;
  coordinates: number[][]; // [lon, lat][]
  timestamps: string[]; // ISO format
  particle_count: number;
}

export interface DriftUncertainty {
  geometry: GeoJSON.Polygon;
  label: string;
}

export interface DriftProvenance {
  mode: string;
  engine: string;
  forcing: string;
  model_status: string;
  limitations: string;
}

export interface DriftResult {
  id: string;
  scenario_id: string;
  slick_id: string;
  run_time: string;
  origin_estimate?: OriginEstimate | null;
  trajectories: DriftTrajectory[];
  uncertainty?: DriftUncertainty | null;
  provenance: DriftProvenance;
}

export interface ForecastResult {
  id: string;
  scenario_id: string;
  forecast_geometry: GeoJSON.Polygon;
  trajectories: DriftTrajectory[];
  uncertainty?: DriftUncertainty | null;
  provenance: DriftProvenance;
}

export interface VesselIdentity {
  mmsi: string;
  imo: string | null;
  name: string | null;
  vessel_type: string | null;
  flag: string | null;
}

export interface AISPosition {
  timestamp: string;
  lon: number;
  lat: number;
  speed_knots: number | null;
  heading: number | null;
  navigation_status: string | null;
  quality: string;
}

export interface AISGap {
  start_time: string;
  end_time: string;
  duration_hours: number;
  start_lon: number;
  start_lat: number;
  end_lon: number;
  end_lat: number;
}

export interface AISTrack {
  mmsi: string;
  geometry: GeoJSON.MultiLineString;
  gap_geometry: GeoJSON.MultiLineString | null;
  positions: AISPosition[];
  gaps: AISGap[];
  total_observations: number;
  longest_gap_hours: number;
  coverage_quality: string;
}

export interface AISProvenance {
  source: string;
  mode: string;
  retrieval_time: string;
  limitations: string;
}

export interface VesselCandidate {
  id: string;
  investigation_id: string;
  identity: VesselIdentity;
  track: AISTrack;
  spatially_relevant: boolean;
  temporally_relevant: boolean;
  closest_approach_meters: number | null;
  inside_origin_region: boolean;
  provenance: AISProvenance;
}


export interface AttributionFactor {
  factor_name: string;
  status: EvidenceStatus;
  observation: string;
  interpretation: string;
  evidence_source: string;
  provenance: string;
  limitations: string;
}

export interface AttributionCandidate {
  vessel_identity: VesselIdentity;
  factors: AttributionFactor[];
  supporting_count: number;
  contradicting_count: number;
  neutral_count: number;
  unavailable_count: number;
  evidence_coverage: string;
  evidence_ranking_score: number;
}

export interface AttributionResult {
  investigation_id: string;
  candidates: AttributionCandidate[];
  highest_ranked_candidate: VesselIdentity | null;
  ranking_methodology: string;
  limitations: string;
}


export interface HindcastRequest {
  scenario: DriftScenario;
  scene_id: string;
}

export interface ForecastRequest {
  scenario: DriftScenario;
  origin_id: string;
}

export interface DifferenceGeometry {
  overlap_polygon?: GeoJSON.Polygon | null;
  observed_only_polygon?: GeoJSON.Polygon | null;
  simulated_only_polygon?: GeoJSON.Polygon | null;
}

export interface SimulationComparison {
  spatial_agreement_iou: number;
  overlap_area_km2: number;
  observed_area_km2: number;
  simulated_area_km2: number;
  centroid_distance_meters: number;
  trajectory_comparison: string;
  temporal_comparison: string;
  spatial_interpretation: string;
  human_readable_interpretation: string;
}

export interface SimulationProvenance {
  mode: string;
  engine: string;
  model_status: string;
  observed_data_source: string;
  simulation_forcing_source: string;
  scenario_parameters: Record<string, unknown>;
  limitations: string;
}

export interface CounterfactualScenario {
  investigation_id: string;
  candidate_vessel_id: string;
  hypothesized_release_time: string; // ISO datetime
  hypothesized_release_location: [number, number]; // [lon, lat]
  drift_duration_hours: number;
  observed_slick_geometry: GeoJSON.Geometry;
  scenario_parameters?: Record<string, unknown>;
}

export interface CounterfactualResult {
  scenario_id: string;
  scenario: CounterfactualScenario;
  simulated_slick_geometry: GeoJSON.Polygon;
  simulated_trajectory: number[][]; // [lon, lat][]
  difference_geometry: DifferenceGeometry;
  comparison: SimulationComparison;
  provenance: SimulationProvenance;
}
