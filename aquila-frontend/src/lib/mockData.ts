export interface VesselCandidate {
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  evidenceScore: number;
  confidenceState: "HIGH" | "MEDIUM" | "LOW";
  status: "Highest-Ranked Candidate" | "Requires Further Investigation" | "Eliminated";
  lastKnownPosition: [number, number]; // [lng, lat]
  lastKnownTime: string;
}

export interface InvestigationData {
  id: string;
  status: "ACTIVE" | "CLOSED" | "PENDING";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  centerCoord: [number, number];
  estimatedVolumeM3: number;
  surfaceAreaKm2: number;
  initialDetectionTime: string;
  lastUpdateTime: string;
  slickClassification: string;
  weatheringState: string;
  evidenceScores: {
    sarBackscatter: string; // e.g., "Confirmed"
    opticalConfirmation: string;
    windHindcast: string;
    aisCorrelation: string;
  };
  candidates: VesselCandidate[];
  dataQuality: string;
  originRegion: {
    center: [number, number];
    radiusKm: number;
    timeWindow: string;
  };
}

export const mockIncident: InvestigationData = {
  id: "INC-AQ-001",
  status: "ACTIVE",
  priority: "CRITICAL",
  centerCoord: [58.2045, 24.4532], // Gulf of Oman
  estimatedVolumeM3: 1450,
  surfaceAreaKm2: 6.8,
  initialDetectionTime: "2023-10-23T08:42:15Z",
  lastUpdateTime: "2023-10-24T14:15:00Z",
  slickClassification: "Heavy Crude / HFO",
  weatheringState: "Moderate (Est. 36-48hrs)",
  evidenceScores: {
    sarBackscatter: "Confirmed",
    opticalConfirmation: "Pending Sentinel-2",
    windHindcast: "Aligned",
    aisCorrelation: "Strong Match",
  },
  dataQuality: "HIGH",
  originRegion: {
    center: [58.1500, 24.4800],
    radiusKm: 12.5,
    timeWindow: "2023-10-21T14:00Z - 2023-10-22T02:00Z",
  },
  candidates: [
    {
      mmsi: "477123900",
      name: "CHEM CHALLENGER",
      type: "Chemical/Oil Products Tanker",
      flag: "HKG",
      evidenceScore: 0.89,
      confidenceState: "HIGH",
      status: "Highest-Ranked Candidate",
      lastKnownPosition: [58.35, 24.32],
      lastKnownTime: "2023-10-24T14:00:00Z",
    },
    {
      mmsi: "538007412",
      name: "PACIFIC ENERGY",
      type: "Crude Oil Tanker",
      flag: "MHL",
      evidenceScore: 0.62,
      confidenceState: "MEDIUM",
      status: "Requires Further Investigation",
      lastKnownPosition: [58.90, 24.15],
      lastKnownTime: "2023-10-24T13:45:00Z",
    },
    {
      mmsi: "212888000",
      name: "OCEAN GLORY",
      type: "Bulk Carrier",
      flag: "CYP",
      evidenceScore: 0.15,
      confidenceState: "LOW",
      status: "Eliminated",
      lastKnownPosition: [57.80, 24.70],
      lastKnownTime: "2023-10-24T14:10:00Z",
    }
  ]
};
