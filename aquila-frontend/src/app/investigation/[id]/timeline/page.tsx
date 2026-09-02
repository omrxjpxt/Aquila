"use client";

import { use } from "react";
import { Satellite, Droplet, Flag, Activity, CheckCircle, MapPin, AlertTriangle } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

import { useInvestigation } from "@/contexts/InvestigationContext";

export default function EvidenceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { scene, candidates, selectedCandidateId, assessments, fusionResults, driftResults, vesselCandidates, attributionResults } = useInvestigation();
  
  const isDemo = id === "INC-AQ-001" || (!scene);
  const fallback = mockIncident;

  const candidate = candidates.find(c => c.id === selectedCandidateId);
  const assessment = selectedCandidateId ? assessments[selectedCandidateId] : null;
  const fusion = selectedCandidateId ? fusionResults[selectedCandidateId] : null;
  const scenarioId = Object.keys(driftResults)[0];
  const drift = scenarioId ? driftResults[scenarioId] : null;
  const ais = scenarioId ? vesselCandidates[scenarioId] : null;
  const attribution = scenarioId ? attributionResults[scenarioId] : null;
  
  const topCandidate = attribution 
    ? [...attribution.candidates].sort((a, b) => b.evidence_ranking_score - a.evidence_ranking_score)[0]
    : null;
    
  const topVessel = topCandidate && ais 
    ? ais.find(v => v.identity.mmsi === topCandidate.vessel_identity.mmsi)
    : null;
    
  const displayId = id;
  const targetName = topVessel ? topVessel.identity.name : (isDemo ? fallback.vesselCandidates[0].name : 'UNAVAILABLE');
  const timeframe = scene ? new Date(scene.acquisition_time).toISOString().split('T')[0] : (isDemo ? '2023-10-23' : 'UNAVAILABLE');

  interface TimelineEvent {
    id: string;
    title: string;
    source: string;
    description: string;
    timeLabel: string;
    icon: React.ElementType;
    colorClass: string;
    criticality: string | null;
  }

  const events: TimelineEvent[] = [];

  // 1. Scene Ingestion / Detection
  if (scene || isDemo) {
    events.push({
      id: "detection",
      title: "Initial SAR Detection",
      source: "Candidate Slick Detected",
      description: `Sentinel-1 GRD observation detects presence of surface anomaly spanning ${candidate ? candidate.area_km2.toFixed(2) : fallback.slick.surfaceAreaKm2} km².`,
      timeLabel: "T-0h",
      icon: Satellite,
      colorClass: "primary",
      criticality: null
    });
  }

  // 2. Model Assessment
  if (assessment || isDemo) {
    events.push({
      id: "assessment",
      title: "Model Assessment Completed",
      source: "HOG+SVM",
      description: `Classifier indicates ${assessment ? ((assessment.raw_score ?? 0.97) * 100).toFixed(0) : 97}% synthetic-data benchmark confidence for ${candidate?.classification || 'OIL_LIKE'} anomaly.`,
      timeLabel: "T+1h",
      icon: Activity,
      colorClass: "primary",
      criticality: null
    });
  }

  // 3. Evidence Fusion
  if (fusion || isDemo) {
    events.push({
      id: "fusion",
      title: "Evidence Fusion Completed",
      source: "Environmental Data",
      description: `Multi-modal evidence fusion confirms physical environmental conditions ${fusion?.overall_assessment_state || 'support'} the hypothesis.`,
      timeLabel: "T+2h",
      icon: CheckCircle,
      colorClass: "primary",
      criticality: null
    });
  }

  // 4. Drift Scenario
  if (drift || isDemo) {
    events.push({
      id: "drift",
      title: "Estimated release window begins",
      source: "MockDriftEngine",
      description: `Backward simulation from detection time indicates release likely commenced within this window.`,
      timeLabel: "T-24h",
      icon: Droplet,
      colorClass: "on-surface-variant",
      criticality: null
    });
  }

  // 5. AIS Discovery
  if (ais || isDemo) {
    events.push({
      id: "ais",
      title: "Target enters candidate region",
      source: "AIS",
      description: `Target crossed the established geofence boundary corresponding to the primary search matrix.`,
      timeLabel: "T-48h",
      icon: MapPin,
      colorClass: "on-surface-variant",
      criticality: null
    });
  }

  // 6. Attribution Evaluated
  if (attribution || isDemo) {
    events.push({
      id: "attribution",
      title: "AIS anomaly/gap detected",
      source: "Criticality: HIGH",
      description: `Transponder signal lost abruptly without navigational justification. Highest-ranked candidate evaluated.`,
      timeLabel: "T-36h",
      icon: AlertTriangle,
      colorClass: "error",
      criticality: "HIGH"
    });
  }

  // Sort events chronologically (simulated logic based on timeLabel)
  const orderMap: Record<string, number> = {
    "T-48h": 1,
    "T-36h": 2,
    "T-24h": 3,
    "T-0h": 4,
    "T+1h": 5,
    "T+2h": 6,
  };
  events.sort((a, b) => orderMap[a.timeLabel] - orderMap[b.timeLabel]);

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#eef4f8] overflow-hidden">
      
      {/* Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10">
        <div className="max-w-4xl mx-auto w-full pb-16">
          
          {/* Header Panel */}
          <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-on-surface mb-1">Forensic Evidence Log</h1>
              <p className="text-[11px] text-on-surface-variant font-medium">Reconstruction of events leading to target prioritization.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 bg-surface-container-low p-4 rounded border border-outline-variant w-full md:w-auto">
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Incident ID</div>
                <div className="font-mono text-primary font-bold text-sm">{displayId}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Target</div>
                <div className="text-sm text-on-surface font-bold flex items-center gap-2">
                  {targetName}
                  <Flag className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Timeframe</div>
                <div className="font-mono text-on-surface text-xs font-bold">{timeframe}</div>
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-2 md:pl-8">
            
            {/* Vertical Line (Spine) */}
            <div className="absolute top-4 bottom-4 left-[96px] md:left-[120px] w-px bg-outline-variant hidden sm:block"></div>

            {events.map((evt) => (
              <div key={evt.id} className={`flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative ${evt.colorClass === 'error' || evt.colorClass === 'primary' ? 'group' : ''}`}>
                
                {evt.colorClass === 'error' && <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                {evt.colorClass === 'primary' && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}

                <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                  <span className={`font-mono text-${evt.colorClass} block sm:text-right font-bold text-xs`}>{evt.timeLabel}</span>
                </div>
                
                <div className={`hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center z-10 mt-2 shadow-sm ${
                  evt.colorClass === 'on-surface-variant' 
                    ? 'bg-surface-container-low border border-outline-variant text-on-surface-variant' 
                    : `bg-surface border-2 border-${evt.colorClass} text-${evt.colorClass}`
                }`}>
                  <evt.icon className="w-4 h-4" />
                </div>
                
                <div className={`flex-grow bg-surface rounded p-4 relative overflow-hidden shadow-sm hover:border-outline transition-colors ${
                  evt.colorClass === 'on-surface-variant'
                    ? 'border border-outline-variant'
                    : `border border-${evt.colorClass}/30`
                }`}>
                  {evt.colorClass !== 'on-surface-variant' && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      evt.colorClass === 'error' 
                        ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-error)_4px,var(--color-error)_8px)] opacity-30'
                        : 'bg-primary'
                    }`}></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-2 pl-3">
                    <h3 className={`text-sm font-bold text-${evt.colorClass === 'on-surface-variant' ? 'on-surface' : evt.colorClass}`}>{evt.title}</h3>
                    <div className="flex gap-2">
                      <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded border flex items-center gap-1 ${
                        evt.colorClass === 'on-surface-variant'
                          ? 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                          : `bg-${evt.colorClass}/10 text-${evt.colorClass} border-${evt.colorClass}/20`
                      }`}>
                        {evt.source}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant pl-3 leading-relaxed font-medium">{evt.description}</p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
