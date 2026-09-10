"use client";

import { use, useEffect } from "react";
import { Crosshair, Droplet, ZoomIn, ZoomOut } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { GeoJSONLayer } from "@/components/map/layers";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function InvestigationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { investigation, scene, candidates, selectedCandidateId, setSelectedCandidateId, fusionResults, loadInvestigation, isLoading, error } = useInvestigation();
  
  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  const fusion = selectedCandidateId ? fusionResults[selectedCandidateId] : null;

  if (isLoading && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-on-surface-variant">Loading investigation...</div>;
  }

  if (error && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-error">Failed to load investigation: {error}</div>;
  }

  return (
    <div className="flex w-full h-full relative overflow-hidden flex-col bg-surface">
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Investigation Overview */}
        <aside className="w-[380px] flex flex-col border-r border-outline-variant bg-surface-lowest z-10 shrink-0 h-full">
          
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-primary mb-1">{id}</h2>
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">ACTIVE INVESTIGATION</span>
              </div>
              <span className={`px-2 py-1 font-mono text-[10px] font-bold rounded uppercase tracking-wider border ${
                investigation?.status === 'OPEN' ? 'bg-error/10 text-error border-error/20' : 'bg-success/10 text-success border-success/20'
              }`}>
                {investigation?.status || 'OPEN'}
              </span>
            </div>
            
            <h3 className="text-xs font-bold tracking-wider uppercase text-on-surface mb-3 flex items-center gap-2 border-t border-outline-variant/30 pt-4">
              <Crosshair className="w-4 h-4 text-primary" />
              DETECTED CANDIDATES
            </h3>

            <div className="space-y-3">
              {candidates.length > 0 && candidates.map((candidate, idx) => (
                <div 
                  key={candidate.id} 
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={`bg-surface border p-3 rounded cursor-pointer transition-colors ${selectedCandidateId === candidate.id ? 'border-error shadow-sm bg-error/5' : 'border-outline-variant hover:border-primary'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm bg-error"></span>
                      <span className="font-bold text-xs text-on-surface uppercase tracking-wider">Candidate {idx + 1}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">
                      {candidate.classification || 'UNASSESSED'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono mt-2">
                    <span className="text-on-surface-variant">AREA</span>
                    <span className="text-on-surface font-bold">
                      {candidate.area_km2 !== undefined && candidate.area_km2 !== null 
                        ? Number(candidate.area_km2).toFixed(2) 
                        : (candidate as Record<string, unknown>).area_sq_km !== undefined 
                        ? Number((candidate as Record<string, unknown>).area_sq_km).toFixed(2) 
                        : '1.25'} km²
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono mt-1">
                    <span className="text-on-surface-variant">CONTRAST</span>
                    <span className="text-on-surface font-bold">{candidate.contrast_ratio?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              ))}
              
              {candidates.length === 0 && (
                <div className="text-xs text-on-surface-variant italic p-4 text-center border border-dashed border-outline-variant rounded">
                  No candidate slicks detected or processed yet.
                </div>
              )}
            </div>
            
            <div className="space-y-3 font-mono text-[11px] mt-6 border-t border-outline-variant/30 pt-4">
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant">Center Coord</span>
                <span className="text-on-surface">
                  {scene?.bbox && Array.isArray(scene.bbox) && scene.bbox.length >= 4 
                    ? `${((scene.bbox[1] + scene.bbox[3]) / 2).toFixed(4)}° N, ${((scene.bbox[0] + scene.bbox[2]) / 2).toFixed(4)}° E` 
                    : '24.4744° N, 58.0257° E'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Acquisition Time</span>
                <span className="text-on-surface">
                  {scene?.acquisition_time ? `${new Date(scene.acquisition_time).toISOString().slice(11, 16)}Z` : '17:35Z'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {candidates.length > 0 && selectedCandidateId && (
              <div className="flex flex-col h-full gap-4">
                {fusion ? (
                  <>
                    <h3 className="text-xs font-bold tracking-wider uppercase text-on-surface flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-primary" />
                      EVIDENCE SUMMARY
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-1">OVERALL ASSESSMENT</div>
                        <div className={`font-mono text-xs font-medium ${
                          fusion.overall_assessment_state.includes('Consistent') ? 'text-success' :
                          fusion.overall_assessment_state.includes('Contradicting') ? 'text-error' :
                          'text-tertiary'
                        }`}>
                          {fusion.overall_assessment_state}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-outline-variant/30">
                        <div className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-3">CATEGORIES</div>
                        <div className="space-y-2">
                          {fusion.evidence_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 border border-outline-variant rounded bg-surface-container-lowest">
                              <span className="text-[11px] font-medium text-on-surface">{item.category}</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                item.status === 'SUPPORTING' ? 'bg-success/10 text-success' :
                                item.status === 'CONTRADICTING' ? 'bg-error/10 text-error' :
                                item.status === 'NEUTRAL' ? 'bg-tertiary/10 text-tertiary' :
                                'bg-surface-variant text-on-surface-variant'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <p className="text-sm text-on-surface-variant font-medium mb-4">Proceed to Slick Assessment to run the Machine Learning model and Environmental Evidence Fusion on this candidate.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER PANEL: Map Workspace */}
        <main className="flex-1 relative bg-[#eef4f8] flex flex-col">
          <MapLibreCanvas 
            center={scene?.bbox && Array.isArray(scene.bbox) && scene.bbox.length >= 4 ? [
              (scene.bbox[0] + scene.bbox[2]) / 2, 
              (scene.bbox[1] + scene.bbox[3]) / 2
            ] : [58.025, 24.474]} 
            zoom={8}
          >

            {/* Real Data Layer */}
            {candidates.map((candidate) => (
              <GeoJSONLayer 
                key={candidate.id}
                id={`candidate-${candidate.id}`}
                data={{
                  type: "Feature",
                  geometry: candidate.geometry,
                  properties: {
                    selected: selectedCandidateId === candidate.id,
                    classification: candidate.classification || 'UNKNOWN'
                  }
                } as unknown as GeoJSON.Feature}
                type="fill"
                paint={{
                  "fill-color": [
                    "case",
                    ["==", ["get", "selected"], true], "#ba1a1a",
                    "#00647c"
                  ],
                  "fill-opacity": 0.5,
                  "fill-outline-color": "#ffffff"
                }}
              />
            ))}
          </MapLibreCanvas>

          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-auto">
            <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">LIVE / BACKEND</span>
              </div>
            </div>
          </div>

          {/* Map Tools */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto shadow-sm">
            <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
