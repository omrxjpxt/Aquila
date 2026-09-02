"use client";

import { use, useEffect, useState } from "react";
import { Play, AlertTriangle, Activity } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { GeoJSONLayer, OriginRegionLayer, TrajectoryLayer } from "@/components/map/layers";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { DriftScenario } from "@/lib/api/types";

export default function DriftReconstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    scene, 
    candidates, 
    selectedCandidateId, 
    loadInvestigation, 
    driftResults, 
    runHindcast,
    isLoading
  } = useInvestigation();
  const [showSlick] = useState(true);
  const [showOrigin] = useState(true);
  const [showTrajectory] = useState(true);
  const [showUncertainty] = useState(true);

  // Default scenario params
  const [scenarioParams] = useState<DriftScenario>(() => ({
    scenario_id: `hindcast-${id}-24h`,
    investigation_id: id as string,
    slick_id: selectedCandidateId,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    is_backward: true,
  }));

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  const driftResult = driftResults[scenarioParams.scenario_id];

  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  // If we have a candidate but no drift run yet, run it
  useEffect(() => {
    if (selectedCandidate && !driftResult && !isLoading) {
      runHindcast({ ...scenarioParams, slick_id: selectedCandidate.id });
    }
  }, [selectedCandidate, driftResult, isLoading, runHindcast, scenarioParams]);

  if (!scene || !selectedCandidate) return <div className="p-8 font-mono text-sm">LOADING INVESTIGATION...</div>;

  const center: [number, number] = selectedCandidate.centroid as [number, number];

  // Derived geometries
  const slickGeometry = selectedCandidate.geometry;
  const originEstimate = driftResult?.origin_estimate;
  const trajectory = driftResult?.trajectories?.[0];
  const uncertainty = driftResult?.uncertainty;

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[#eef4f8]">
      
      {/* Map Layer */}
      <MapLibreCanvas center={center} zoom={9}>
        {showSlick && slickGeometry && (
          <GeoJSONLayer
            id="slick-polygon"
            data={{
              type: "Feature",
              geometry: slickGeometry as GeoJSON.Geometry,
              properties: {}
            }}
            type="fill"
            paint={{
              "fill-color": "#46d9eb",
              "fill-opacity": 0.3,
            }}
          />
        )}
        
        {showUncertainty && uncertainty && (
           <OriginRegionLayer 
              geometry={uncertainty.geometry} 
              visible={true} 
            />
        )}

        {showOrigin && originEstimate && (
          <OriginRegionLayer 
            geometry={originEstimate.geometry} 
            visible={true} 
          />
        )}

        {showTrajectory && trajectory && (
          <TrajectoryLayer 
            coordinates={trajectory.coordinates} 
            visible={true} 
          />
        )}
      </MapLibreCanvas>
      
      {/* HUD: Top Left - Target Info */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
          <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">OBSERVED EVENT</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-error rounded-sm block"></span>
            <span className="font-mono font-bold text-sm text-on-surface">{selectedCandidate.id.slice(0,8)}</span>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant mt-1 font-medium">LAT: {center[1].toFixed(4)}°N LON: {center[0].toFixed(4)}°E</span>
        </div>
        
        {/* PROVENANCE HUD */}
        {driftResult && (
          <div className="bg-[#ffeedd]/90 backdrop-blur border border-[#e5ab35] rounded p-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#e5ab35]" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#e5ab35]">BACKEND / DEMO</span>
            </div>
            <span className="font-mono text-[10px] text-[#8c6b22] font-medium leading-tight">
              {driftResult.provenance.limitations}
            </span>
            <span className="font-mono text-[9px] text-[#8c6b22]/70 mt-2">
              ENGINE: {driftResult.provenance.engine}
            </span>
          </div>
        )}
      </div>

      {/* HUD: Right Side Panels */}
      <div className="absolute top-4 right-4 z-20 w-[320px] flex flex-col gap-4 pointer-events-auto">
        
        {/* Analysis Parameters Panel */}
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-low rounded-t">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-on-surface">Analysis Parameters</h2>
            </div>
            {isLoading && <span className="text-[10px] font-mono animate-pulse">COMPUTING...</span>}
          </div>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">ESTIMATED RELEASE WINDOW (UTC)</span>
              <div className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 flex items-center justify-between text-xs font-mono font-medium text-on-surface">
                T-24 HOURS
              </div>
            </div>
            
            {driftResult && (
              <div className="flex flex-col">
                <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">ORIGIN STATUS</span>
                <div className="flex flex-col gap-1 bg-surface-container-lowest border border-[#e5ab35] rounded px-3 py-2">
                  <span className="text-xs text-on-surface font-bold text-[#e5ab35]">Demonstration Origin Region</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Derived via Mock Drift Simulation</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Environmental Forcing Panel */}
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm flex flex-col gap-3">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant border-b border-outline-variant p-3 bg-surface-container-low rounded-t">ENVIRONMENTAL FORCING</h3>
          <div className="flex flex-col gap-2 font-mono text-[11px] px-4 pb-4">
            <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
              <span className="text-on-surface-variant font-medium">Ocean Currents</span>
              <span className="text-on-surface text-right font-bold">0.35 m/s<br/><span className="text-[9px] text-tertiary">120°</span></span>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
              <span className="text-on-surface-variant font-medium">Wind Field (ERA5)</span>
              <span className="text-on-surface text-right font-bold">6.5 m/s<br/><span className="text-[9px] text-primary">275°</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded-full px-6 py-3 shadow-md flex items-center gap-6">
          <div className="flex items-center gap-3 border-r border-outline-variant pr-6">
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">HINDCAST T-MINUS</span>
            <span className="font-mono text-base text-primary font-bold">-24h</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-64 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#e5ab35] to-[#ffc862] w-full relative">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-sm"></div>
              </div>
            </div>
            <button 
              onClick={() => alert('Playback animation unavailable in DEMO.')}
              className="w-8 h-8 bg-[#e5ab35] text-on-primary hover:bg-[#e5ab35]/80 rounded-full flex items-center justify-center transition-colors"
            >
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
