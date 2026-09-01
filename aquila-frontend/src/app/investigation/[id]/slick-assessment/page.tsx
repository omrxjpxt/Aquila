"use client";

import { use, useEffect } from "react";
import { Activity, Plus, Minus, Layers, AlertTriangle, CheckCircle, XCircle, Info, HelpCircle } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, GeoJSONLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function SlickAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    scene, candidates, selectedCandidateId, 
    assessments, fusionResults, 
    assessCandidate, fuseEvidence, isLoading 
  } = useInvestigation();
  
  const isDemo = id === "INC-AQ-001" || (!scene);
  const incident = mockIncident;

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
  const assessment = selectedCandidateId ? assessments[selectedCandidateId] : null;
  const fusion = selectedCandidateId ? fusionResults[selectedCandidateId] : null;

  // Pipeline execution
  useEffect(() => {
    if (isDemo || !selectedCandidateId || isLoading) return;
    
    if (!assessment) {
      assessCandidate(selectedCandidateId);
    } else if (!fusion) {
      fuseEvidence(selectedCandidateId);
    }
  }, [isDemo, selectedCandidateId, assessment, fusion, isLoading, assessCandidate, fuseEvidence]);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'SUPPORTING': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'CONTRADICTING': return <XCircle className="w-4 h-4 text-error" />;
      case 'NEUTRAL': return <Info className="w-4 h-4 text-tertiary" />;
      case 'UNAVAILABLE': return <HelpCircle className="w-4 h-4 text-on-surface-variant" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUPPORTING': return 'text-success';
      case 'CONTRADICTING': return 'text-error';
      case 'NEUTRAL': return 'text-tertiary';
      case 'UNAVAILABLE': return 'text-on-surface-variant';
      default: return 'text-on-surface';
    }
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest p-4 gap-4">
      {/* Left: SAR Scene Layer */}
      <div className="flex-1 relative rounded-lg border border-outline-variant overflow-hidden shadow-sm bg-[#eef4f8]">
        
        <MapLibreCanvas center={isDemo ? incident.incident.centerCoord : (scene ? [
          (scene.bbox[0] + scene.bbox[2]) / 2, 
          (scene.bbox[1] + scene.bbox[3]) / 2
        ] : [0,0])} zoom={isDemo ? 11 : 9}>
          
          {isDemo ? (
            <SlickLayer center={incident.incident.centerCoord} visible={true} />
          ) : (
            selectedCandidate && (
              <GeoJSONLayer 
                id={`slick-focus-${selectedCandidate.id}`}
                data={{
                  type: "Feature",
                  geometry: selectedCandidate.geometry,
                  properties: {}
                } as unknown as GeoJSON.Feature}
                type="fill"
                paint={{
                  "fill-color": "#ba1a1a",
                  "fill-opacity": 0.6,
                  "fill-outline-color": "#ffffff"
                }}
              />
            )
          )}
        </MapLibreCanvas>

        {/* HUD Elements */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-3 py-1.5 rounded flex items-center gap-2 shadow-sm">
            {isDemo ? (
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded border border-outline-variant uppercase">DEMO / MOCK</span>
            ) : (
              <span className="text-[9px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase">LIVE / BACKEND</span>
            )}
            <span className="font-mono text-on-surface text-xs font-medium border-l border-outline-variant pl-2">
              Sensor: {isDemo ? incident.satellite.source : scene?.provider}
            </span>
          </div>
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-3 py-1.5 rounded flex items-center gap-2 shadow-sm">
            <span className="font-mono text-on-surface text-xs font-medium">
              Time: {isDemo ? new Date(incident.satellite.acquisitionTime).toISOString().slice(11, 19) + 'Z' : (scene ? new Date(scene.acquisition_time).toISOString().slice(11, 19) + 'Z' : '')}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded flex flex-col gap-1 pointer-events-none shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-error">SELECTED CANDIDATE</span>
          </div>
          {isDemo ? (
            <>
              <span className="font-mono text-xs text-on-surface-variant font-medium">LAT: {incident.incident.centerCoord[1].toFixed(4)}° N</span>
              <span className="font-mono text-xs text-on-surface-variant font-medium">LON: {incident.incident.centerCoord[0].toFixed(4)}° E</span>
            </>
          ) : selectedCandidate ? (
            <>
              <span className="font-mono text-xs text-on-surface-variant font-medium">ID: {selectedCandidate.id.split('-')[0]}...</span>
              <span className="font-mono text-xs text-on-surface-variant font-medium">LAT: {selectedCandidate.centroid[1].toFixed(4)}° N</span>
              <span className="font-mono text-xs text-on-surface-variant font-medium">LON: {selectedCandidate.centroid[0].toFixed(4)}° E</span>
            </>
          ) : (
            <span className="font-mono text-xs text-on-surface-variant font-medium">No candidate selected</span>
          )}
        </div>


      </div>

      {/* Right: Analytical Assessment Panel */}
      <div className="w-[450px] bg-surface border border-outline-variant rounded-lg flex flex-col h-full shadow-sm z-10 shrink-0">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Analytical Assessment</h2>
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Slick Forensics</span>
            </div>
          </div>
          {fusion && (
            <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase border ${
              fusion.overall_assessment_state.includes('Consistent') ? 'bg-success/10 text-success border-success/20' :
              fusion.overall_assessment_state.includes('Contradicting') ? 'bg-error/10 text-error border-error/20' :
              'bg-tertiary/10 text-tertiary border-tertiary/20'
            }`}>
              {fusion.overall_assessment_state}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          
          {/* Top Level Model Assessment */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${
                isDemo ? 'bg-error' : (assessment?.predicted_class === 'OIL_LIKE' ? 'bg-error' : assessment?.predicted_class === 'LOOKALIKE' ? 'bg-success' : 'bg-tertiary')
              }`}></div>
              
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant block mb-2">MODEL CLASSIFICATION</span>
              
              <div className="flex items-baseline gap-2 mb-2">
                {isLoading && !assessment ? (
                  <span className="text-xl font-bold text-on-surface-variant animate-pulse">EVALUATING...</span>
                ) : (
                  <span className={`text-2xl font-bold ${
                    isDemo ? 'text-error' : (assessment?.predicted_class === 'OIL_LIKE' ? 'text-error' : assessment?.predicted_class === 'LOOKALIKE' ? 'text-success' : 'text-tertiary')
                  }`}>
                    {isDemo ? 'OIL_LIKE' : assessment?.predicted_class || 'PENDING'}
                  </span>
                )}
              </div>
              
              {!isDemo && assessment && (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant/50">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-on-surface-variant">RAW SVM SCORE:</span>
                    <span className="font-bold">{assessment.raw_score.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-on-surface-variant">UNCERTAINTY MARGIN:</span>
                    <span className="font-bold">±{assessment.uncertainty_margin}</span>
                  </div>
                  <div className="mt-2 text-[10px] leading-relaxed text-on-surface-variant font-medium border border-tertiary/20 bg-tertiary/5 p-2 rounded">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-tertiary" />
                    <strong>Scientific Notice:</strong> Raw decision function scores represent distance from the hyperplane. They are not calibrated probabilities. 
                    Trained on synthetic demonstration dataset. Not validated on real-world SAR targets.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Fusion Chain */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-2 pb-1 border-b border-outline-variant">EVIDENCE FUSION CHAIN</h3>
            
            {!isDemo && isLoading && !fusion && (
              <div className="text-xs text-on-surface-variant p-4 border border-outline-variant rounded bg-surface-container-lowest animate-pulse text-center">
                Fetching environmental context and fusing evidence...
              </div>
            )}

            {!isDemo && fusion && (
              <div className="space-y-3">
                {fusion.evidence_items.map((item, idx) => (
                  <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold uppercase tracking-wider">{item.category}</span>
                      <div className={`flex items-center gap-1 font-bold tracking-widest text-[9px] ${getStatusColor(item.status)}`}>
                        {renderStatusIcon(item.status)}
                        {item.status}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      <div>
                        <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Observation</span>
                        <span className="font-mono">{item.observation}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Interpretation</span>
                        <span className="">{item.interpretation}</span>
                      </div>
                      <div className="bg-surface-variant/30 p-2 rounded mt-2">
                        <span className="text-[9px] text-on-surface-variant block uppercase tracking-wider mb-0.5">Provenance & Limitations</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[9px] text-on-surface-variant">{item.source}</span>
                          <span className="text-[9px] text-on-surface-variant italic">{item.limitations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isDemo && (
              <div className="space-y-3">
                <div className="bg-surface-container-lowest border border-outline-variant rounded p-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold uppercase tracking-wider">WIND CONTEXT</span>
                    <div className="flex items-center gap-1 font-bold tracking-widest text-[9px] text-success">
                      <CheckCircle className="w-4 h-4 text-success" />
                      SUPPORTING
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Observation</span>
                      <span className="font-mono">Speed: 4.5 m/s, Dir: 275.0°</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Interpretation</span>
                      <span>FAVORABLE DETECTION CONTEXT. Optimal wind regime for SAR slick contrast.</span>
                    </div>
                    <div className="bg-surface-variant/30 p-2 rounded mt-2">
                      <span className="text-[9px] text-on-surface-variant block uppercase tracking-wider mb-0.5">Provenance</span>
                      <span className="font-mono text-[9px] text-on-surface-variant">DEMO / MOCK ERA5</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
