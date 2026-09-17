"use client";

import { use, useEffect, useState } from "react";
import { Satellite, Droplet, Flag, Activity, CheckCircle, MapPin, AlertTriangle } from "lucide-react";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function EvidenceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { investigation, scene, candidates, selectedCandidateId, assessments, fusionResults, driftResults, vesselCandidates, attributionResults, loadInvestigation, isLoading, error } = useInvestigation();
  
  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  if (isLoading && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-on-surface-variant">Loading timeline...</div>;
  }

  if (error && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-error">Failed to load timeline: {error}</div>;
  }

  const [events, setEvents] = useState<any[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setTimelineLoading(true);
    setTimelineError(null);
    setEvents(null);

    import("@/lib/api/investigations")
      .then(({ investigationsApi }) => investigationsApi.getEvidence(id))
      .then((data) => {
        if (!isCurrent) return;
        setEvents(Array.isArray(data) ? data : []);
        setTimelineLoading(false);
      })
      .catch((err) => {
        if (!isCurrent) return;
        setTimelineError(err instanceof Error ? err.message : "Failed to load timeline events");
        setEvents(null);
        setTimelineLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  const candidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  const scenarioId = `hindcast-${id}-24h`;
  const ais = vesselCandidates[scenarioId] || Object.values(vesselCandidates)[0] || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attribution = attributionResults[scenarioId] || Object.values(attributionResults).find(a => (a as any).investigation_id === id) || null;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDemoInvestigation = id === 'INV-DEMO-OMAN-001' || investigation?.creation_mode === 'DEMO_MOCK' || (investigation as any)?.provenance === 'DEMO_MOCK';
  const isMockVessel = (mmsi?: string | null, name?: string | null) => mmsi === "111111111" || name === "OCEANIC EXPLORER";

  const rawTopCandidate = attribution && attribution.candidates && attribution.candidates.length > 0
    ? [...attribution.candidates].sort((a, b) => (b.evidence_ranking_score ?? 0) - (a.evidence_ranking_score ?? 0))[0]
    : null;

  const topCandidate = isDemoInvestigation
    ? rawTopCandidate
    : (rawTopCandidate && !isMockVessel(rawTopCandidate.vessel_identity?.mmsi, rawTopCandidate.vessel_identity?.name))
      ? rawTopCandidate
      : null;
    
  const topVessel = topCandidate && ais && Array.isArray(ais)
    ? ais.find((v) => v.identity?.mmsi === topCandidate.vessel_identity?.mmsi)
    : null;
    
  const displayId = id;
  const targetName = topVessel?.identity?.name || topCandidate?.vessel_identity?.name || (investigation?.status === 'INCOMPLETE' ? 'UNATTRIBUTED / INCOMPLETE' : 'UNATTRIBUTED');
  const timeframe = scene?.acquisition_time ? new Date(scene.acquisition_time).toISOString().split('T')[0] : 'UNAVAILABLE';

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "SATELLITE_DETECTION":
      case "SATELLITE_ACQUISITION":
        return Satellite;
      case "SATELLITE_CLASSIFICATION":
        return Activity;
      case "ENVIRONMENTAL_OBSERVATION":
        return CheckCircle;
      case "DRIFT_HINDCAST":
        return Droplet;
      case "AIS_PRESENCE":
        return MapPin;
      case "ATTRIBUTION_EVALUATION":
        return Flag;
      case "COUNTERFACTUAL_SIMULATION":
        return Activity;
      default:
        return Activity;
    }
  };

  const getEventColor = (ev: any) => {
    if (ev.status === "UNAVAILABLE") return "on-surface-variant";
    if (ev.status === "FAILED" || ev.status === "ERROR") return "error";
    if (ev.event_type === "ATTRIBUTION_EVALUATION") return "primary";
    return "primary";
  };

  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return "TIME: UNAVAILABLE";
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
    } catch {
      return timeStr;
    }
  };

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
            {events && events.length > 0 && (
              <div className="absolute top-4 bottom-4 left-[96px] md:left-[170px] w-px bg-outline-variant hidden sm:block"></div>
            )}

            {timelineLoading && (
              <div className="text-center text-sm font-mono text-on-surface-variant py-12 border border-dashed border-outline-variant rounded bg-surface">
                Loading evidence timeline...
              </div>
            )}

            {timelineError && !timelineLoading && (
              <div className="text-center text-sm font-mono text-error py-12 border border-dashed border-error/30 rounded bg-error/5 flex flex-col items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                <span>TIMELINE: UNAVAILABLE — {timelineError}</span>
              </div>
            )}

            {!timelineLoading && !timelineError && (!events || events.length === 0) && (
              <div className="text-center text-sm font-mono text-on-surface-variant py-12 border border-dashed border-outline-variant rounded bg-surface">
                No timeline events available for this investigation.
              </div>
            )}

            {!timelineLoading && !timelineError && events && events.map((evt: any) => {
              const EventIcon = getEventIcon(evt.event_type);
              const colorClass = getEventColor(evt);
              const timeLabel = formatEventTime(evt.event_time);

              return (
                <div key={evt.id} className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
                  <div className="sm:w-[130px] md:w-[150px] flex-shrink-0 pt-2">
                    <span className="font-mono text-on-surface-variant block sm:text-right font-medium text-[11px] leading-tight">
                      {timeLabel}
                    </span>
                  </div>
                  
                  <div className={`hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center z-10 mt-1 shadow-sm ${
                    colorClass === 'on-surface-variant' 
                      ? 'bg-surface-container-low border border-outline-variant text-on-surface-variant' 
                      : `bg-surface border-2 border-${colorClass} text-${colorClass}`
                  }`}>
                    <EventIcon className="w-4 h-4" />
                  </div>
                  
                  <div className={`flex-grow bg-surface rounded p-4 relative overflow-hidden shadow-sm hover:border-outline transition-colors ${
                    colorClass === 'on-surface-variant'
                      ? 'border border-outline-variant'
                      : `border border-${colorClass}/30`
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {evt.event_type ? evt.event_type.replace(/_/g, ' ') : 'EVENT'}
                        </h3>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          Source: {evt.source || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded border flex items-center gap-1 ${
                          evt.status === 'UNAVAILABLE'
                            ? 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                            : evt.status === 'FAILED' || evt.status === 'ERROR'
                            ? 'bg-error/10 text-error border-error/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {evt.status || 'RECORDED'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface leading-relaxed font-normal mt-1">{evt.description}</p>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
