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
    investigation,
    scene, 
    candidates, 
    selectedCandidateId, 
    loadInvestigation, 
    driftResults, 
    environmentalData,
    runHindcast,
    isLoading,
    error
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
    forcing_sources: ["LIVE_OPEN_METEO"]
  }));

  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  // Fallback candidate from investigation anomaly if candidate list not yet populated
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0] || (investigation?.anomaly_id ? {
    id: investigation.anomaly_id,
    scene_id: investigation.source_product_id || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: (investigation as any).anomaly_geometry_json 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (typeof (investigation as any).anomaly_geometry_json === 'string' 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? JSON.parse((investigation as any).anomaly_geometry_json) 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (investigation as any).anomaly_geometry_json) 
      : investigation.anomaly_geometry || null,
    area_km2: 1.25,
    perimeter_km: 4.8,
    centroid: [58.0257, 24.4744]
  } : null);

  const scenarioId = `hindcast-${id}-24h`;
  const driftResult = driftResults[scenarioId] || Object.values(driftResults)[0] || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const envData = environmentalData && Object.keys(environmentalData).length > 0 ? (Object.values(environmentalData)[0] as any) : null;

  const isDriftValid = Boolean(
    driftResult && 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (driftResult as any).status !== 'UNAVAILABLE' && 
    (driftResult.origin_estimate || (driftResult.trajectories && driftResult.trajectories.length > 0))
  );

  // If we have a cached scene and candidate but no drift result yet, run it
  useEffect(() => {
    if (scene && selectedCandidate && !driftResult && !isLoading) {
      runHindcast({ ...scenarioParams, slick_id: selectedCandidate.id });
    }
  }, [scene, selectedCandidate, driftResult, isLoading, runHindcast, scenarioParams]);

  if (isLoading && !investigation) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-surface text-on-surface-variant font-mono text-sm">
        LOADING INVESTIGATION...
      </div>
    );
  }

  if (error && !investigation) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-surface text-error font-mono text-sm">
        INVESTIGATION NOT FOUND: {error}
      </div>
    );
  }

  const center: [number, number] = (selectedCandidate?.centroid && Array.isArray(selectedCandidate.centroid) && selectedCandidate.centroid.length >= 2)
    ? (selectedCandidate.centroid as [number, number])
    : ((selectedCandidate?.geometry as unknown as GeoJSON.Polygon)?.coordinates?.[0]?.[0] as [number, number]) || [58.0257, 24.4744];

  // Derived geometries
  const slickGeometry = selectedCandidate?.geometry;
  const originEstimate = isDriftValid ? driftResult?.origin_estimate : null;
  const trajectory = isDriftValid ? driftResult?.trajectories?.[0] : null;
  const uncertainty = isDriftValid ? driftResult?.uncertainty : null;

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
            <span className={`w-2.5 h-2.5 rounded-sm block ${selectedCandidate ? 'bg-error' : 'bg-on-surface-variant'}`}></span>
            <span className="font-mono font-bold text-sm text-on-surface">
              {selectedCandidate ? selectedCandidate.id.slice(0, 8) : 'UNAVAILABLE'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant mt-1 font-medium">
            LAT: {Number(center[1] ?? 24.4744).toFixed(4)}°N LON: {Number(center[0] ?? 58.0257).toFixed(4)}°E
          </span>
        </div>
        
        {/* PROVENANCE HUD */}
        {isDriftValid && driftResult && driftResult.provenance?.mode === "DEMO_MOCK" && (
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
        
        {isDriftValid && driftResult && driftResult.provenance?.mode === "LIVE" && (
          <div className="bg-primary-container/90 backdrop-blur border border-primary rounded p-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">LIVE RECONSTRUCTION</span>
            </div>
            <span className="font-mono text-[10px] text-on-primary-container font-medium leading-tight">
              {driftResult.provenance.limitations}
            </span>
            <div className="flex flex-col mt-2 gap-0.5">
              <span className="font-mono text-[9px] text-on-primary-container/70 uppercase">
                ENGINE: {driftResult.provenance.engine} {driftResult.provenance.engine_version}
              </span>
              <span className="font-mono text-[9px] text-on-primary-container/70 uppercase">
                STATUS: {driftResult.provenance.simulation_status || "COMPLETED"}
              </span>
              <span className="font-mono text-[9px] text-on-primary-container/70 uppercase">
                PARTICLES: {driftResult.provenance.completed_particle_count ?? driftResult.provenance.particle_count} / {driftResult.provenance.particle_count}
              </span>
              <span className="font-mono text-[9px] text-on-primary-container/70 uppercase">
                DURATION: {driftResult.provenance.hindcast_duration} hrs
              </span>
            </div>
          </div>
        )}

        {!isDriftValid && (
          <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface">DRIFT RECONSTRUCTION: UNAVAILABLE</span>
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium leading-tight">
              No valid backward drift reconstruction is available for this investigation.
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
                {isDriftValid ? 'T-24 HOURS' : 'UNAVAILABLE'}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">ORIGIN STATUS</span>
              <div className="flex flex-col gap-1 bg-surface-container-lowest border border-outline-variant rounded px-3 py-2">
                <span className={`text-xs font-bold ${isDriftValid ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {isDriftValid ? 'Plausible Release Region' : 'UNAVAILABLE'}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {isDriftValid
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? ((driftResult as any).provenance?.mode === 'LIVE' ? 'Derived via OpenDrift Hindcast' : 'Derived via Mock Drift Simulation')
                    : 'No origin estimate computed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Forcing Panel */}
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm flex flex-col gap-3">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant border-b border-outline-variant p-3 bg-surface-container-low rounded-t">ENVIRONMENTAL FORCING</h3>
          <div className="flex flex-col gap-2 font-mono text-[11px] px-4 pb-4">
            {isDriftValid && driftResult?.provenance?.mode === 'LIVE' ? (
              <>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Source</span>
                  <span className="text-on-surface text-right font-bold text-[9px]">{driftResult.provenance.forcing_provider}</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Dataset</span>
                  <span className="text-on-surface text-right font-bold text-[9px]">{driftResult.provenance.forcing_dataset}</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Resolution</span>
                  <span className="text-on-surface text-right font-bold text-[9px]">{driftResult.provenance.forcing_spatial_resolution}</span>
                </div>
              </>
            ) : envData ? (
              <>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Ocean Currents</span>
                  <span className="text-on-surface text-right font-bold">
                    {envData.current_u !== undefined && envData.current_v !== undefined
                      ? `${Number(envData.current_u).toFixed(2)}, ${Number(envData.current_v).toFixed(2)} m/s`
                      : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Wind Field</span>
                  <span className="text-on-surface text-right font-bold">
                    {envData.wind_u !== undefined && envData.wind_v !== undefined
                      ? `${Number(envData.wind_u).toFixed(2)}, ${Number(envData.wind_v).toFixed(2)} m/s`
                      : 'UNAVAILABLE'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Ocean Currents</span>
                  <span className="text-on-surface-variant text-right font-bold text-[10px]">UNAVAILABLE</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-on-surface-variant font-medium">Wind Field</span>
                  <span className="text-on-surface-variant text-right font-bold text-[10px]">UNAVAILABLE</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls (Bottom Center) */}
      {isDriftValid && trajectory && (
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
      )}

    </div>
  );
}
