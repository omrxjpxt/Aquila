// ============================================================
// AQUILA — Central Mock Data Layer
// ============================================================
// All mock data lives here so every page uses the same incident,
// the same vessels, the same coordinates, and the same timeline.
// Shapes are designed to mirror future FastAPI response schemas.
// ============================================================

// --------------- Types ---------------

export interface VesselCandidate {
  mmsi: string;
  imo: string;
  name: string;
  type: string;
  flag: string;
  flagCountry: string;
  evidenceScore: number;
  confidenceState: "HIGH" | "MEDIUM" | "LOW";
  status: "Highest-Ranked Candidate" | "Requires Corroboration" | "Eliminated";
  lastKnownPosition: [number, number];
  lastKnownTime: string;
  speed: number;
  heading: number;
  trackHistory: Array<{ coord: [number, number]; timestamp: string; speed: number; heading: number }>;
  aisGaps: Array<{ start: string; end: string; durationHours: number }>;
  sixFactors: {
    spatialCompatibility: { score: number; state: ProvenanceState; detail: string };
    temporalCompatibility: { score: number; state: ProvenanceState; detail: string };
    trajectoryCompatibility: { score: number; state: ProvenanceState; detail: string };
    driftCompatibility: { score: number; state: ProvenanceState; detail: string };
    behaviouralEvidence: { score: number; state: ProvenanceState; detail: string };
    aisDataQuality: { score: number; state: ProvenanceState; detail: string };
  };
}

export type ProvenanceState = "OBSERVED" | "MODEL-INFERRED" | "SIMULATED" | "FORECAST" | "UNCERTAIN";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  source: "AIS" | "SAR" | "MODEL" | "ENVIRONMENT" | "ANALYSIS";
  eventType: string;
  description: string;
  importance: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  relatedVessel?: string;
}

export interface InvestigationData {
  id: string;
  status: "ACTIVE" | "CLOSED" | "PENDING";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  incident: {
    centerCoord: [number, number];
    initialDetectionTime: string;
    lastUpdateTime: string;
    region: string;
    description: string;
  };

  satellite: {
    source: string;
    sensorMode: string;
    acquisitionTime: string;
    orbitDirection: string;
    dataQuality: "HIGH" | "MEDIUM" | "LOW";
    resolution: string;
    productId: string;
  };

  slick: {
    estimatedVolumeM3: number;
    surfaceAreaKm2: number;
    perimeterKm: number;
    classification: string;
    weatheringState: string;
    morphology: string;
    thickness: string;
  };

  lookAlikeAssessment: {
    confidence: "HIGH" | "MEDIUM" | "LOW";
    modelAssessment: string;
    evidenceScore: number;
    contradictingEvidence: string;
    naturalPhenomena: Array<{ name: string; excluded: boolean; reason: string }>;
  };

  environmentalContext: {
    windSpeedKnots: number;
    windDirection: string;
    seaState: string;
    currentSpeed: string;
    currentDirection: string;
    waterTemp: string;
    visibility: string;
  };

  originEstimate: {
    center: [number, number];
    radiusKm: number;
    timeWindow: string;
    confidenceState: "HIGH" | "MEDIUM" | "LOW";
    modelUsed: string;
  };

  drift: {
    hindcastConfidence: string;
    forecastImpact: string;
    modelUsed: string;
    windSource: string;
    currentSource: string;
    releaseWindow: { start: string; end: string };
    trajectoryPoints: Array<{ coord: [number, number]; timestamp: string; type: "hindcast" | "forecast" }>;
  };

  vesselCandidates: VesselCandidate[];

  attribution: {
    strongestAvailableEvidence: string;
    requiresCorroboration: boolean;
  };

  timeline: TimelineEvent[];

  simulation: {
    parameters: string;
    overlapScore: number;
    observedArea: number;
    simulatedArea: number;
    intersectionArea: number;
    model: string;
  };

  evidence: {
    sarBackscatter: { value: string; provenance: ProvenanceState };
    opticalConfirmation: { value: string; provenance: ProvenanceState };
    windHindcast: { value: string; provenance: ProvenanceState };
    aisCorrelation: { value: string; provenance: ProvenanceState };
    driftModel: { value: string; provenance: ProvenanceState };
    behaviouralAnalysis: { value: string; provenance: ProvenanceState };
  };
}

// --------------- Report Index ---------------

export interface ReportSummary {
  id: string;
  investigationId: string;
  generatedAt: string;
  location: string;
  status: "FINAL" | "DRAFT" | "ARCHIVED";
  assessment: string;
  topCandidate: string;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
}

// --------------- Data Source ---------------

export interface DataSource {
  id: string;
  name: string;
  type: "SAR" | "OPTICAL" | "AIS" | "METEOROLOGICAL" | "OCEANOGRAPHIC" | "MODEL";
  provider: string;
  status: "OPERATIONAL" | "DEGRADED" | "OFFLINE" | "SCHEDULED";
  lastUpdate: string;
  nextUpdate: string;
  resolution: string;
  coverage: string;
  provenance: string;
}

// --------------- Monitoring Alert ---------------

export interface MonitoringAlert {
  id: string;
  timestamp: string;
  type: "ANOMALY_DETECTED" | "AIS_GAP" | "VESSEL_DEVIATION" | "SYSTEM" | "DATA_QUALITY";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  location?: [number, number];
  relatedIncident?: string;
}

// --------------- Vessel (Fleet DB) ---------------

export interface VesselRecord {
  mmsi: string;
  imo: string;
  name: string;
  type: string;
  flag: string;
  flagCountry: string;
  grossTonnage: number;
  deadweight: number;
  lengthM: number;
  beamM: number;
  yearBuilt: number;
  owner: string;
  operator: string;
  lastKnownPosition: [number, number];
  lastKnownTime: string;
  speed: number;
  heading: number;
  destination: string;
  status: "UNDERWAY" | "ANCHORED" | "MOORED" | "AT_PORT";
  riskScore: "HIGH" | "MEDIUM" | "LOW";
  activeInvestigations: number;
  aisGapCount: number;
}

// ============================================================
// MOCK DATA INSTANCES
// ============================================================

export const mockIncident: InvestigationData = {
  id: "INC-AQ-001",
  status: "ACTIVE",
  priority: "CRITICAL",

  incident: {
    centerCoord: [58.2045, 24.4532],
    initialDetectionTime: "2023-10-23T08:42:15Z",
    lastUpdateTime: "2023-10-24T14:15:00Z",
    region: "Gulf of Oman, Arabian Sea",
    description: "Major surface anomaly detected via Sentinel-1 SAR pass. Morphological analysis indicates potential anthropogenic oil discharge.",
  },

  satellite: {
    source: "Sentinel-1A",
    sensorMode: "IW (Interferometric Wide Swath)",
    acquisitionTime: "2023-10-23T08:42:15Z",
    orbitDirection: "Ascending",
    dataQuality: "HIGH",
    resolution: "10m × 10m (IW GRD)",
    productId: "S1A_IW_GRDH_1SDV_20231023T084215",
  },

  slick: {
    estimatedVolumeM3: 1450,
    surfaceAreaKm2: 6.8,
    perimeterKm: 14.2,
    classification: "Heavy Crude / HFO",
    weatheringState: "Moderate (Est. 36-48hrs)",
    morphology: "Elongated windrow pattern, consistent with moderate weathering under NW wind regime",
    thickness: "Estimated 0.5–2.0 μm (thin sheen to possible thick patches)",
  },

  lookAlikeAssessment: {
    confidence: "HIGH",
    modelAssessment: "Strong oil signature — HOG+SVM classifier (trained on synthetic data) indicates high probability of anthropogenic hydrocarbon. Manual review supports this assessment.",
    evidenceScore: 0.94,
    contradictingEvidence: "None observed in available data. Optical confirmation pending due to cloud cover.",
    naturalPhenomena: [
      { name: "Biogenic Slick", excluded: true, reason: "Morphology inconsistent with biogenic film patterns; surface area exceeds typical natural slick size." },
      { name: "Upwelling Zone", excluded: true, reason: "No known upwelling in this region at this time of year." },
      { name: "Internal Waves", excluded: true, reason: "No periodic banding pattern observed in SAR imagery." },
      { name: "Low-Wind Zone", excluded: false, reason: "Cannot fully exclude without optical corroboration, though SAR texture suggests oil." },
    ],
  },

  environmentalContext: {
    windSpeedKnots: 12,
    windDirection: "NW (315°)",
    seaState: "Moderate (Beaufort 4, ~2m swell)",
    currentSpeed: "0.8 kn",
    currentDirection: "SE (135°)",
    waterTemp: "26.8°C",
    visibility: "Good (est. 15+ km)",
  },

  originEstimate: {
    center: [58.1500, 24.4800],
    radiusKm: 12.5,
    timeWindow: "2023-10-21T14:00Z – 2023-10-22T02:00Z",
    confidenceState: "HIGH",
    modelUsed: "OpenDrift Lagrangian backward simulation (ERA5 wind + HYCOM currents)",
  },

  drift: {
    hindcastConfidence: "HIGH — backward trajectory converges to narrow origin region",
    forecastImpact: "Potential coastal impact within 48h if unchecked",
    modelUsed: "OpenDrift v1.11",
    windSource: "ECMWF ERA5 (0.25° resolution)",
    currentSource: "HYCOM GOFS 3.1",
    releaseWindow: { start: "2023-10-21T14:00:00Z", end: "2023-10-22T02:00:00Z" },
    trajectoryPoints: [
      { coord: [58.1500, 24.4800], timestamp: "2023-10-21T14:00:00Z", type: "hindcast" },
      { coord: [58.1600, 24.4750], timestamp: "2023-10-21T18:00:00Z", type: "hindcast" },
      { coord: [58.1750, 24.4680], timestamp: "2023-10-22T02:00:00Z", type: "hindcast" },
      { coord: [58.1900, 24.4600], timestamp: "2023-10-22T12:00:00Z", type: "hindcast" },
      { coord: [58.2045, 24.4532], timestamp: "2023-10-23T08:42:00Z", type: "hindcast" },
      { coord: [58.2200, 24.4400], timestamp: "2023-10-24T00:00:00Z", type: "forecast" },
      { coord: [58.2400, 24.4200], timestamp: "2023-10-24T12:00:00Z", type: "forecast" },
      { coord: [58.2650, 24.3950], timestamp: "2023-10-25T00:00:00Z", type: "forecast" },
    ],
  },

  vesselCandidates: [
    {
      mmsi: "477123900",
      imo: "9501234",
      name: "CHEM CHALLENGER",
      type: "Chemical/Oil Products Tanker",
      flag: "HKG",
      flagCountry: "Hong Kong",
      evidenceScore: 0.89,
      confidenceState: "HIGH",
      status: "Highest-Ranked Candidate",
      lastKnownPosition: [58.35, 24.32],
      lastKnownTime: "2023-10-24T14:00:00Z",
      speed: 12.5,
      heading: 135,
      trackHistory: [
        { coord: [57.90, 24.70], timestamp: "2023-10-20T06:00:00Z", speed: 13.2, heading: 120 },
        { coord: [58.00, 24.60], timestamp: "2023-10-20T18:00:00Z", speed: 12.8, heading: 125 },
        { coord: [58.10, 24.52], timestamp: "2023-10-21T06:00:00Z", speed: 11.0, heading: 130 },
        { coord: [58.14, 24.49], timestamp: "2023-10-21T13:45:00Z", speed: 4.5, heading: 145 },
        // AIS GAP: 2023-10-21T14:00 – 2023-10-22T08:00
        { coord: [58.22, 24.42], timestamp: "2023-10-22T08:15:00Z", speed: 13.5, heading: 135 },
        { coord: [58.30, 24.35], timestamp: "2023-10-23T00:00:00Z", speed: 12.8, heading: 135 },
        { coord: [58.35, 24.32], timestamp: "2023-10-24T14:00:00Z", speed: 12.5, heading: 135 },
      ],
      aisGaps: [
        { start: "2023-10-21T14:00:00Z", end: "2023-10-22T08:15:00Z", durationHours: 18.25 },
      ],
      sixFactors: {
        spatialCompatibility: { score: 0.95, state: "OBSERVED", detail: "AIS track passes directly through modeled origin region. Last known position before gap is within 3.2 km of estimated release point." },
        temporalCompatibility: { score: 0.92, state: "MODEL-INFERRED", detail: "AIS gap of 18.25h overlaps precisely with modeled release window (2023-10-21T14:00Z – 2023-10-22T02:00Z)." },
        trajectoryCompatibility: { score: 0.88, state: "MODEL-INFERRED", detail: "Pre-gap heading and speed are consistent with a transit path through the origin region. Post-gap position lies on the expected continuation vector." },
        driftCompatibility: { score: 0.85, state: "SIMULATED", detail: "OpenDrift backward simulation from detected slick converges to an origin overlapping with vessel track. Overlap confidence: HIGH." },
        behaviouralEvidence: { score: 0.82, state: "MODEL-INFERRED", detail: "Speed reduction from 12.8 kn to 4.5 kn observed 15 min before AIS gap. Pattern is consistent with slow-speed discharge behavior, though not conclusive." },
        aisDataQuality: { score: 0.78, state: "OBSERVED", detail: "18.25-hour AIS gap in a region with adequate shore-based AIS coverage. Gap is anomalous for this vessel's historical pattern." },
      },
    },
    {
      mmsi: "538007412",
      imo: "9605678",
      name: "PACIFIC ENERGY",
      type: "Crude Oil Tanker",
      flag: "MHL",
      flagCountry: "Marshall Islands",
      evidenceScore: 0.62,
      confidenceState: "MEDIUM",
      status: "Requires Corroboration",
      lastKnownPosition: [58.90, 24.15],
      lastKnownTime: "2023-10-24T13:45:00Z",
      speed: 14.2,
      heading: 110,
      trackHistory: [
        { coord: [57.80, 24.90], timestamp: "2023-10-20T00:00:00Z", speed: 14.0, heading: 100 },
        { coord: [58.10, 24.60], timestamp: "2023-10-21T00:00:00Z", speed: 14.5, heading: 105 },
        { coord: [58.40, 24.40], timestamp: "2023-10-22T00:00:00Z", speed: 14.2, heading: 110 },
        { coord: [58.65, 24.28], timestamp: "2023-10-23T00:00:00Z", speed: 14.0, heading: 110 },
        { coord: [58.90, 24.15], timestamp: "2023-10-24T13:45:00Z", speed: 14.2, heading: 110 },
      ],
      aisGaps: [],
      sixFactors: {
        spatialCompatibility: { score: 0.65, state: "OBSERVED", detail: "Track passes within 15 km of probable origin region at closest approach." },
        temporalCompatibility: { score: 0.60, state: "MODEL-INFERRED", detail: "Transit timing is broadly compatible but no AIS anomaly observed." },
        trajectoryCompatibility: { score: 0.55, state: "MODEL-INFERRED", detail: "Vessel maintained consistent course and speed through the region." },
        driftCompatibility: { score: 0.58, state: "SIMULATED", detail: "Backward drift simulation is marginally compatible but not a strong spatial match." },
        behaviouralEvidence: { score: 0.40, state: "UNCERTAIN", detail: "No speed reduction, course change, or AIS gap detected. Behavioral signature is inconsistent with illicit discharge." },
        aisDataQuality: { score: 0.90, state: "OBSERVED", detail: "Continuous AIS transmission throughout the period of interest. No anomalies detected." },
      },
    },
    {
      mmsi: "636092145",
      imo: "9387012",
      name: "STAR VEGA",
      type: "Oil Products Tanker",
      flag: "LBR",
      flagCountry: "Liberia",
      evidenceScore: 0.31,
      confidenceState: "LOW",
      status: "Eliminated",
      lastKnownPosition: [57.60, 24.80],
      lastKnownTime: "2023-10-24T12:00:00Z",
      speed: 11.8,
      heading: 270,
      trackHistory: [
        { coord: [58.50, 24.20], timestamp: "2023-10-19T00:00:00Z", speed: 12.0, heading: 280 },
        { coord: [58.20, 24.40], timestamp: "2023-10-20T00:00:00Z", speed: 11.5, heading: 275 },
        { coord: [57.90, 24.60], timestamp: "2023-10-21T00:00:00Z", speed: 11.8, heading: 270 },
        { coord: [57.60, 24.80], timestamp: "2023-10-24T12:00:00Z", speed: 11.8, heading: 270 },
      ],
      aisGaps: [],
      sixFactors: {
        spatialCompatibility: { score: 0.30, state: "OBSERVED", detail: "Vessel was transiting away from the origin region during the release window." },
        temporalCompatibility: { score: 0.25, state: "MODEL-INFERRED", detail: "Vessel had already departed the region 12+ hours before estimated release start." },
        trajectoryCompatibility: { score: 0.20, state: "MODEL-INFERRED", detail: "Westbound trajectory is incompatible with approach to the origin region." },
        driftCompatibility: { score: 0.15, state: "SIMULATED", detail: "No drift model scenario produces overlap with this vessel's position." },
        behaviouralEvidence: { score: 0.50, state: "UNCERTAIN", detail: "Normal transit behavior. No anomalous patterns detected." },
        aisDataQuality: { score: 0.95, state: "OBSERVED", detail: "Continuous, high-quality AIS transmission throughout." },
      },
    },
  ],

  attribution: {
    strongestAvailableEvidence: "Spatio-temporal intersection of AIS track anomaly (18h gap) with modeled origin region, corroborated by backward drift simulation and speed-reduction behavioral signature.",
    requiresCorroboration: true,
  },

  timeline: [
    { id: "evt-01", timestamp: "2023-10-20T06:00:00Z", source: "AIS", eventType: "Vessel Transit", description: "CHEM CHALLENGER enters Gulf of Oman, heading SE at 13.2 kn.", importance: "LOW", relatedVessel: "477123900" },
    { id: "evt-02", timestamp: "2023-10-21T13:45:00Z", source: "AIS", eventType: "Speed Reduction", description: "CHEM CHALLENGER reduces speed from 12.8 kn to 4.5 kn near probable origin region.", importance: "HIGH", relatedVessel: "477123900" },
    { id: "evt-03", timestamp: "2023-10-21T14:00:00Z", source: "AIS", eventType: "AIS Signal Lost", description: "CHEM CHALLENGER AIS transponder signal lost. Last position: 58.14°E, 24.49°N.", importance: "CRITICAL", relatedVessel: "477123900" },
    { id: "evt-04", timestamp: "2023-10-21T14:00:00Z", source: "MODEL", eventType: "Release Window Opens", description: "Estimated start of spill event based on backward drift simulation.", importance: "HIGH" },
    { id: "evt-05", timestamp: "2023-10-22T02:00:00Z", source: "MODEL", eventType: "Release Window Closes", description: "Estimated end of spill event based on drift model convergence.", importance: "MEDIUM" },
    { id: "evt-06", timestamp: "2023-10-22T08:15:00Z", source: "AIS", eventType: "AIS Signal Resumed", description: "CHEM CHALLENGER AIS resumes at 58.22°E, 24.42°N. Gap duration: 18h 15m.", importance: "HIGH", relatedVessel: "477123900" },
    { id: "evt-07", timestamp: "2023-10-22T10:00:00Z", source: "ENVIRONMENT", eventType: "Wind Shift", description: "NW wind increases to 12 kn, accelerating surface drift toward SE.", importance: "MEDIUM" },
    { id: "evt-08", timestamp: "2023-10-23T08:42:15Z", source: "SAR", eventType: "Satellite Detection", description: "Sentinel-1A SAR pass detects dark anomaly spanning 6.8 km² at 58.20°E, 24.45°N.", importance: "CRITICAL" },
    { id: "evt-09", timestamp: "2023-10-23T09:00:00Z", source: "ANALYSIS", eventType: "HOG+SVM Classification", description: "Automated classifier (trained on synthetic data) indicates high probability of anthropogenic hydrocarbon.", importance: "HIGH" },
    { id: "evt-10", timestamp: "2023-10-23T14:00:00Z", source: "MODEL", eventType: "Origin Reconstruction", description: "OpenDrift backward simulation converges to origin region centered at 58.15°E, 24.48°N (r=12.5km).", importance: "HIGH" },
    { id: "evt-11", timestamp: "2023-10-24T06:00:00Z", source: "ANALYSIS", eventType: "Attribution Complete", description: "Candidate analysis identifies CHEM CHALLENGER as highest-ranked candidate (evidence score: 89).", importance: "CRITICAL" },
    { id: "evt-12", timestamp: "2023-10-24T12:00:00Z", source: "MODEL", eventType: "Forecast Update", description: "Forward drift projection indicates potential coastal impact within 48 hours if unmitigated.", importance: "HIGH" },
  ],

  simulation: {
    parameters: "OpenDrift / ECMWF ERA5 Wind / HYCOM GOFS 3.1 Currents",
    overlapScore: 0.85,
    observedArea: 6.8,
    simulatedArea: 7.2,
    intersectionArea: 5.78,
    model: "OpenDrift v1.11 — Lagrangian particle tracking",
  },

  evidence: {
    sarBackscatter: { value: "Consistent with heavy oil — strong damping of Bragg scattering", provenance: "OBSERVED" },
    opticalConfirmation: { value: "Pending — cloud cover prevents Sentinel-2 corroboration", provenance: "UNCERTAIN" },
    windHindcast: { value: "ERA5 wind field aligned with observed drift direction", provenance: "MODEL-INFERRED" },
    aisCorrelation: { value: "Strong spatio-temporal match between AIS gap and origin region", provenance: "OBSERVED" },
    driftModel: { value: "OpenDrift backward simulation converges to origin overlapping with vessel track", provenance: "SIMULATED" },
    behaviouralAnalysis: { value: "Speed reduction prior to AIS gap is suggestive but not conclusive", provenance: "MODEL-INFERRED" },
  },
};

// --------------- Mock Reports Index ---------------

export const mockReports: ReportSummary[] = [
  {
    id: "RPT-AQ-001-A",
    investigationId: "INC-AQ-001",
    generatedAt: "2023-10-24T14:30:00Z",
    location: "Gulf of Oman (24.45°N, 58.20°E)",
    status: "DRAFT",
    assessment: "Strong oil signature, highest-ranked candidate identified",
    topCandidate: "CHEM CHALLENGER (477123900)",
    dataQuality: "HIGH",
  },
  {
    id: "RPT-AQ-001-B",
    investigationId: "INC-AQ-001",
    generatedAt: "2023-10-25T09:00:00Z",
    location: "Gulf of Oman (24.45°N, 58.20°E)",
    status: "FINAL",
    assessment: "Attribution analysis complete, corroboration recommended",
    topCandidate: "CHEM CHALLENGER (477123900)",
    dataQuality: "HIGH",
  },
];

// --------------- Mock Data Sources ---------------

export const mockDataSources: DataSource[] = [
  { id: "src-s1a", name: "Sentinel-1A", type: "SAR", provider: "ESA / Copernicus", status: "OPERATIONAL", lastUpdate: "2023-10-23T08:42:15Z", nextUpdate: "2023-10-24T08:45:00Z", resolution: "10m (IW GRD)", coverage: "Gulf of Oman, Arabian Sea", provenance: "ESA Copernicus Open Access Hub" },
  { id: "src-s1b", name: "Sentinel-1B", type: "SAR", provider: "ESA / Copernicus", status: "OFFLINE", lastUpdate: "2022-12-23T00:00:00Z", nextUpdate: "N/A", resolution: "10m (IW GRD)", coverage: "N/A — Decommissioned", provenance: "ESA Copernicus" },
  { id: "src-s2", name: "Sentinel-2", type: "OPTICAL", provider: "ESA / Copernicus", status: "DEGRADED", lastUpdate: "2023-10-22T10:15:00Z", nextUpdate: "2023-10-24T10:20:00Z", resolution: "10m (B2/B3/B4)", coverage: "Gulf of Oman — Cloud cover limits usability", provenance: "ESA Copernicus Open Access Hub" },
  { id: "src-ais", name: "AIS Telemetry", type: "AIS", provider: "Spire Global / exactEarth", status: "OPERATIONAL", lastUpdate: "2023-10-24T14:15:00Z", nextUpdate: "Continuous", resolution: "N/A (position reports)", coverage: "Global maritime — shore-based + satellite AIS", provenance: "Spire Maritime API" },
  { id: "src-era5", name: "ECMWF ERA5 Wind", type: "METEOROLOGICAL", provider: "ECMWF / Copernicus CDS", status: "OPERATIONAL", lastUpdate: "2023-10-23T06:00:00Z", nextUpdate: "2023-10-24T06:00:00Z", resolution: "0.25° (~28km)", coverage: "Global", provenance: "Copernicus Climate Data Store" },
  { id: "src-hycom", name: "HYCOM GOFS 3.1", type: "OCEANOGRAPHIC", provider: "HYCOM Consortium / NOAA", status: "OPERATIONAL", lastUpdate: "2023-10-23T00:00:00Z", nextUpdate: "2023-10-24T00:00:00Z", resolution: "1/12° (~8km)", coverage: "Global ocean", provenance: "HYCOM Data Server" },
  { id: "src-opendrift", name: "OpenDrift Model", type: "MODEL", provider: "MET Norway (open source)", status: "OPERATIONAL", lastUpdate: "2023-10-24T06:00:00Z", nextUpdate: "On demand", resolution: "N/A (Lagrangian particles)", coverage: "Configurable — regional setup for Gulf of Oman", provenance: "OpenDrift v1.11 — local deployment" },
];

// --------------- Mock Monitoring Alerts ---------------

export const mockAlerts: MonitoringAlert[] = [
  { id: "alert-01", timestamp: "2023-10-23T08:45:00Z", type: "ANOMALY_DETECTED", severity: "CRITICAL", title: "SAR Anomaly Detected", description: "Sentinel-1A pass identifies 6.8 km² surface anomaly in the Gulf of Oman. Automated classification indicates potential oil discharge.", location: [58.2045, 24.4532], relatedIncident: "INC-AQ-001" },
  { id: "alert-02", timestamp: "2023-10-23T09:15:00Z", type: "AIS_GAP", severity: "HIGH", title: "AIS Gap — CHEM CHALLENGER", description: "Historical AIS gap of 18h 15m detected for MMSI 477123900 coinciding with estimated release window.", location: [58.14, 24.49], relatedIncident: "INC-AQ-001" },
  { id: "alert-03", timestamp: "2023-10-24T06:30:00Z", type: "VESSEL_DEVIATION", severity: "MEDIUM", title: "Speed Anomaly", description: "CHEM CHALLENGER exhibited speed reduction from 12.8 kn to 4.5 kn prior to AIS gap. Pattern flagged for behavioral analysis.", location: [58.14, 24.49] },
  { id: "alert-04", timestamp: "2023-10-24T08:00:00Z", type: "DATA_QUALITY", severity: "LOW", title: "Optical Data Unavailable", description: "Sentinel-2 pass over target area has >80% cloud cover. Optical corroboration is currently not possible.", location: [58.2045, 24.4532] },
  { id: "alert-05", timestamp: "2023-10-24T12:00:00Z", type: "SYSTEM", severity: "MEDIUM", title: "Forecast Model Updated", description: "Forward drift projection updated. Potential coastal impact within 48 hours if response is not initiated." },
];

// --------------- Mock Vessel Fleet ---------------

export const mockVessels: VesselRecord[] = [
  { mmsi: "477123900", imo: "9501234", name: "CHEM CHALLENGER", type: "Chemical/Oil Products Tanker", flag: "HKG", flagCountry: "Hong Kong", grossTonnage: 29800, deadweight: 47200, lengthM: 183, beamM: 32, yearBuilt: 2012, owner: "Asia Maritime Corp", operator: "Challenger Shipping Ltd", lastKnownPosition: [58.35, 24.32], lastKnownTime: "2023-10-24T14:00:00Z", speed: 12.5, heading: 135, destination: "Fujairah, UAE", status: "UNDERWAY", riskScore: "HIGH", activeInvestigations: 1, aisGapCount: 3 },
  { mmsi: "538007412", imo: "9605678", name: "PACIFIC ENERGY", type: "Crude Oil Tanker", flag: "MHL", flagCountry: "Marshall Islands", grossTonnage: 81500, deadweight: 157000, lengthM: 274, beamM: 48, yearBuilt: 2015, owner: "Pacific LNG Corp", operator: "Pacific Energy Management", lastKnownPosition: [58.90, 24.15], lastKnownTime: "2023-10-24T13:45:00Z", speed: 14.2, heading: 110, destination: "Jebel Ali, UAE", status: "UNDERWAY", riskScore: "MEDIUM", activeInvestigations: 1, aisGapCount: 0 },
  { mmsi: "636092145", imo: "9387012", name: "STAR VEGA", type: "Oil Products Tanker", flag: "LBR", flagCountry: "Liberia", grossTonnage: 42300, deadweight: 73800, lengthM: 228, beamM: 36, yearBuilt: 2009, owner: "Vega Tankers SA", operator: "Star Maritime Services", lastKnownPosition: [57.60, 24.80], lastKnownTime: "2023-10-24T12:00:00Z", speed: 11.8, heading: 270, destination: "Muscat, Oman", status: "UNDERWAY", riskScore: "LOW", activeInvestigations: 0, aisGapCount: 0 },
  { mmsi: "256123000", imo: "9720456", name: "MALTA SPIRIT", type: "LNG Carrier", flag: "MLT", flagCountry: "Malta", grossTonnage: 115200, deadweight: 87600, lengthM: 295, beamM: 46, yearBuilt: 2019, owner: "Mediterranean Gas Holdings", operator: "Spirit LNG Management", lastKnownPosition: [57.20, 25.10], lastKnownTime: "2023-10-24T10:00:00Z", speed: 16.5, heading: 45, destination: "Ras Laffan, Qatar", status: "UNDERWAY", riskScore: "LOW", activeInvestigations: 0, aisGapCount: 0 },
  { mmsi: "371234567", imo: "9555789", name: "PANAMA TRADER", type: "Bulk Carrier", flag: "PAN", flagCountry: "Panama", grossTonnage: 38900, deadweight: 63400, lengthM: 199, beamM: 32, yearBuilt: 2013, owner: "Global Bulk Lines", operator: "Panama Trade Ship Mgmt", lastKnownPosition: [56.80, 25.30], lastKnownTime: "2023-10-24T08:30:00Z", speed: 10.5, heading: 180, destination: "Sohar, Oman", status: "UNDERWAY", riskScore: "LOW", activeInvestigations: 0, aisGapCount: 1 },
  { mmsi: "311234000", imo: "9480123", name: "BAHAMAS STAR", type: "Container Ship", flag: "BHS", flagCountry: "Bahamas", grossTonnage: 54200, deadweight: 65000, lengthM: 264, beamM: 32, yearBuilt: 2011, owner: "Star Container Lines", operator: "Nassau Shipping Co", lastKnownPosition: [58.50, 23.80], lastKnownTime: "2023-10-24T09:15:00Z", speed: 18.2, heading: 90, destination: "Mumbai, India", status: "UNDERWAY", riskScore: "LOW", activeInvestigations: 0, aisGapCount: 0 },
];
