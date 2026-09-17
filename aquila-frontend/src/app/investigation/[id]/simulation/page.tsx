/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useEffect, useState, useMemo } from "react";
import { Satellite, LineChart, SlidersHorizontal, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, GeoJSONLayer } from "@/components/map/layers";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { VesselCandidate } from "@/lib/api/types";

function SimulatedSlickLayer({ data }: { data: GeoJSON.Polygon }) {
  if (!data) return null;
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: data, properties: {} }]
  };
  return (
    <>
      <GeoJSONLayer
        id="simulated-slick-fill"
        data={fc}
        type="fill"
        paint={{
          "fill-color": "#8b5cf6",
          "fill-opacity": 0.3,
        }}
      />
      <GeoJSONLayer
        id="simulated-slick-outline"
        data={fc}
        type="line"
        paint={{
          "line-color": "#8b5cf6",
          "line-width": 2,
          "line-opacity": 1,
        }}
      />
    </>
  );
}

function DifferenceLayer({ data, type, color }: { data: GeoJSON.Polygon, type: string, color: string }) {
  if (!data) return null;
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: data, properties: {} }]
  };
  return (
    <GeoJSONLayer
      id={`diff-${type}`}
      data={fc}
      type="fill"
      paint={{
        "fill-color": color,
        "fill-opacity": 0.5,
      }}
    />
  );
}

export default function CounterfactualSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    candidates: slicks,
    selectedCandidateId, 
    vesselCandidates, 
    counterfactualResults,
    runCounterfactualSimulation,
    isLoading,
    loadInvestigation
  } = useInvestigation();

  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  const selectedSlick = slicks.find(c => c.id === selectedCandidateId) || slicks[0];
  const scenarioId = `hindcast-${id}-24h`;
  const candidates = useMemo(() => vesselCandidates[scenarioId] || Object.values(vesselCandidates)[0] || [], [vesselCandidates, scenarioId]);
  
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  
  // Hypothesized Form State
  const [releaseLon, setReleaseLon] = useState<string>("");
  const [releaseLat, setReleaseLat] = useState<string>("");
  const [duration, setDuration] = useState<number>(24);

  // Technical reason: We must auto-select the first candidate and their coordinates once the asynchronous data loads from Context, so that the simulation form is pre-filled.
  useEffect(() => {
    if (candidates.length > 0 && !selectedMmsi) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setSelectedMmsi(candidates[0].identity.mmsi);
    }
  }, [candidates, selectedMmsi]);

  const selectedCandidate = candidates.find((c: VesselCandidate) => c.identity.mmsi === selectedMmsi);

  // Technical reason: We need to default the form inputs to the candidate's coordinates once they are selected.
  useEffect(() => {
    if (selectedCandidate && (!releaseLon || !releaseLat)) {
       // Default to their latest position or origin region intersection (simplification: track end)
       const coords = selectedCandidate.track.positions;
       if (coords && coords.length > 0) {
           // eslint-disable-next-line react-hooks/set-state-in-effect
           setReleaseLon(coords[0].lon.toFixed(4));
            
           setReleaseLat(coords[0].lat.toFixed(4));
       }
    }
  }, [selectedCandidate, releaseLon, releaseLat]);

  const rawResult = (selectedMmsi ? counterfactualResults[selectedMmsi] : null) || Object.values(counterfactualResults)[0] || null;

  type SimulationStatus = "AVAILABLE" | "FAILED" | "NO_USABLE_RESULTS" | "UNAVAILABLE";

  const simulationStatus: SimulationStatus = useMemo(() => {
    if (!rawResult) {
      return "UNAVAILABLE";
    }
    const resStatus = (rawResult as any).status;
    if (resStatus === "FAILED" || resStatus === "ERROR") {
      return "FAILED";
    }
    if (resStatus === "UNAVAILABLE") {
      return "UNAVAILABLE";
    }
    const hasGeometry = Boolean(rawResult.simulated_slick_geometry || (rawResult as any).simulated_geometry);
    const hasComparison = Boolean(rawResult.comparison || (rawResult as any).overlap_iou !== undefined);
    if (hasGeometry || hasComparison) {
      return "AVAILABLE";
    }
    return "NO_USABLE_RESULTS";
  }, [rawResult]);

  const isAvailable = simulationStatus === "AVAILABLE";

  const handleRunSimulation = () => {
    if (!selectedCandidate || !selectedSlick || !releaseLon || !releaseLat) return;
    const lon = parseFloat(releaseLon);
    const lat = parseFloat(releaseLat);
    if (isNaN(lon) || isNaN(lat)) return;
    
    // ISO string for 24h ago mock
    const hypothesizedTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    
    runCounterfactualSimulation({
      investigation_id: id as string,
      candidate_vessel_id: selectedCandidate.identity.mmsi,
      hypothesized_release_time: hypothesizedTime,
      hypothesized_release_location: [lon, lat],
      drift_duration_hours: duration,
      observed_slick_geometry: selectedSlick.geometry as unknown as GeoJSON.Geometry,
    });
  };

  const mapCenter: [number, number] | null = selectedSlick?.centroid 
    ? selectedSlick.centroid 
    : (selectedSlick?.geometry?.coordinates?.[0]?.[0] as [number, number]) || null;

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest p-2">
      
      {/* Synchronized Map Panels Container */}
      <div className="w-full h-full flex flex-col lg:flex-row gap-2">
        
        {/* Left Map: Observed Slick */}
        <div className="relative flex-1 bg-[#eef4f8] border border-outline-variant rounded-lg overflow-hidden group shadow-sm">
          {mapCenter ? (
            <MapLibreCanvas center={mapCenter} zoom={10} bearing={0} pitch={0}>
              <SlickLayer center={mapCenter} visible={true} />
            </MapLibreCanvas>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-mono text-xs text-on-surface-variant">
              <Satellite className="w-8 h-8 text-on-surface-variant/50 mb-2" />
              <span>GEOMETRY UNAVAILABLE</span>
              <span className="text-[10px] mt-1">No spatial coordinates recorded for this candidate slick.</span>
            </div>
          )}
          
          <div className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded shadow-sm pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <Satellite className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider">OBSERVED SLICK</h2>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium">Sentinel-1 SAR Candidate</p>
          </div>
        </div>
        
        {/* Right Map: Predicted Slick & Difference */}
        <div className="relative flex-1 bg-[#eef4f8] border border-outline-variant rounded-lg overflow-hidden group shadow-sm">
          {mapCenter ? (
            <MapLibreCanvas center={mapCenter} zoom={10} bearing={0} pitch={0}>
              {isAvailable && rawResult && (
                <>
                  <SimulatedSlickLayer data={rawResult.simulated_slick_geometry || (rawResult as any).simulated_geometry} />
                  
                  {/* Difference Geometries */}
                  {rawResult?.difference_geometry?.overlap_polygon && (
                     <DifferenceLayer data={rawResult.difference_geometry.overlap_polygon} type="overlap" color="#22c55e" /> // Green
                  )}
                  {rawResult?.difference_geometry?.observed_only_polygon && (
                     <DifferenceLayer data={rawResult.difference_geometry.observed_only_polygon} type="obs-only" color="#3b82f6" /> // Blue
                  )}
                  {rawResult?.difference_geometry?.simulated_only_polygon && (
                     <DifferenceLayer data={rawResult.difference_geometry.simulated_only_polygon} type="sim-only" color="#8b5cf6" /> // Purple
                  )}
                </>
              )}
            </MapLibreCanvas>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-mono text-xs text-on-surface-variant">
              <LineChart className="w-8 h-8 text-on-surface-variant/50 mb-2" />
              <span>MAP UNAVAILABLE</span>
              <span className="text-[10px] mt-1">No spatial coordinates available.</span>
            </div>
          )}

          {!isAvailable && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-surface-lowest/80 backdrop-blur-xs text-center z-20 pointer-events-none">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <div className="text-xs font-mono font-bold text-on-surface uppercase tracking-wider">
                {simulationStatus === "FAILED" 
                  ? "SIMULATION: FAILED — Forward trajectory reconstruction failed" 
                  : simulationStatus === "NO_USABLE_RESULTS"
                  ? "SIMULATION: NO USABLE RESULTS — Trajectory produced no valid surface footprint"
                  : "SIMULATION: UNAVAILABLE — No valid simulation result is available for this investigation."}
              </div>
              <p className="text-[11px] font-mono text-on-surface-variant max-w-sm mt-1">
                {candidates.length > 0 
                  ? "Select a candidate vessel and configure release parameters to run a counterfactual forward simulation."
                  : "No vessel candidate tracks or drift origin estimate available to run a forward simulation."}
              </p>
            </div>
          )}
          
          <div className="absolute top-4 right-4 z-10 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded shadow-sm text-right flex flex-col items-end pointer-events-none">
            <div className="flex items-center gap-2 mb-1 flex-row-reverse">
              <LineChart className="w-5 h-5 text-secondary" />
              <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">SIMULATED SLICK</h2>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium">Counterfactual Forward Simulation</p>
            {isAvailable && rawResult && (
              <div className="mt-2 flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 px-2 py-1 rounded w-fit">
                <span className="font-mono text-[9px] font-bold text-secondary uppercase">
                  {rawResult.provenance?.mode || (typeof rawResult.provenance === 'string' ? rawResult.provenance : "LIVE")}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Central Divider Sync Indicator */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-surface-lowest border border-outline-variant rounded-full flex items-center justify-center shadow-sm hidden lg:flex pointer-events-none">
          <ArrowRightLeft className="w-4 h-4 text-on-surface-variant" />
        </div>
        
        {/* Primary Metric Overlay */}
        {isAvailable && rawResult && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur border border-outline-variant px-6 py-4 rounded shadow-md flex flex-col items-center pointer-events-none text-center">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">SPATIAL AGREEMENT (IoU)</span>
            <span className="text-3xl text-primary font-bold tracking-wider">
              {(((rawResult.comparison?.spatial_agreement_iou ?? (rawResult as any).overlap_iou ?? 0)) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold text-on-surface mt-1">
              {(rawResult.comparison?.spatial_interpretation || (rawResult as any).interpretation_band || 'MODERATE_OVERLAP').replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Bottom HUD Layout */}
      <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col lg:flex-row gap-4 items-end pointer-events-none">
        
        {/* Vessel Selector Card */}
        <div className="w-full lg:w-96 bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm pointer-events-auto flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-low rounded-t">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Candidate Hypothesis</h3>
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </div>
          
          <div className="p-3 bg-surface border-b border-outline-variant">
             <select 
                value={selectedMmsi || ""} 
                onChange={(e) => setSelectedMmsi(e.target.value)}
                className="w-full bg-surface-lowest border border-outline-variant p-2 rounded text-xs font-bold"
             >
                <option value="" disabled>Select Candidate...</option>
                {candidates.map(c => (
                   <option key={c.identity.mmsi} value={c.identity.mmsi}>{c.identity.name || c.identity.mmsi}</option>
                ))}
             </select>
          </div>

          <div className="p-3 bg-surface-container-lowest grid grid-cols-2 gap-3">
             <div>
                <label className="text-[9px] font-bold uppercase text-on-surface-variant block mb-1">Release Lon</label>
                <input type="number" step="0.001" value={releaseLon} onChange={e => setReleaseLon(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
             </div>
             <div>
                <label className="text-[9px] font-bold uppercase text-on-surface-variant block mb-1">Release Lat</label>
                <input type="number" step="0.001" value={releaseLat} onChange={e => setReleaseLat(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
             </div>
             <div className="col-span-2">
                <label className="text-[9px] font-bold uppercase text-on-surface-variant block mb-1">Drift Duration (hrs)</label>
                <input type="range" min="1" max="72" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full" />
                <div className="text-right text-xs font-bold text-primary">{duration}h</div>
             </div>
          </div>
          
          <div className="p-3 bg-surface-container-low rounded-b border-t border-outline-variant">
             <button 
                onClick={handleRunSimulation} 
                disabled={isLoading || !selectedMmsi}
                className="w-full bg-[#00647C] hover:bg-[#005063] text-white font-bold text-xs uppercase py-2 rounded transition-colors disabled:opacity-50"
             >
                {isLoading ? "Running Simulation..." : "Run Counterfactual"}
             </button>
          </div>
        </div>
        
        {/* Validation Metrics */}
        <div className="flex-1 bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm pointer-events-auto flex flex-col min-h-[220px]">
           <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-low rounded-t">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Counterfactual Validity Analysis</h3>
          </div>
          
          {isAvailable && rawResult ? (
            <div className="p-4 flex flex-col gap-4 bg-surface-container-lowest flex-1">
              <div className="bg-surface border border-outline-variant p-3 rounded">
                 <p className="text-sm font-medium text-on-surface">
                   {rawResult.comparison?.human_readable_interpretation || (rawResult as any).interpretation || "Simulation completed."}
                 </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1 block">IoU (GEOMETRIC SIMILARITY)</span>
                    <span className="font-mono text-sm font-bold text-primary">
                      {((rawResult.comparison?.spatial_agreement_iou ?? (rawResult as any).overlap_iou ?? 0) * 100).toFixed(1)}%
                    </span>
                 </div>
                 <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1 block">CENTROID DISTANCE</span>
                    <span className="font-mono text-sm font-bold">
                      {rawResult.comparison?.centroid_distance_meters !== undefined 
                        ? (rawResult.comparison.centroid_distance_meters / 1000).toFixed(1) 
                        : typeof (rawResult as any).centroid_distance_km === 'number'
                        ? (rawResult as any).centroid_distance_km.toFixed(1)
                        : "0.0"} km
                    </span>
                 </div>
                 <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1 block">SIMULATED AREA</span>
                    <span className="font-mono text-sm font-bold">
                      {rawResult.comparison?.simulated_area_km2 !== undefined ? rawResult.comparison.simulated_area_km2.toFixed(1) : "—"} km²
                    </span>
                 </div>
                 <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1 block">MODEL PROVENANCE</span>
                    <span className="font-mono text-[9px] bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/30 font-bold text-tertiary">
                       {rawResult.provenance?.model_status ? rawResult.provenance.model_status.replace(/_/g, ' ') : "DEMO MOCK"}
                    </span>
                 </div>
              </div>
              
              <div className="mt-auto pt-3 border-t border-outline-variant flex items-start gap-2">
                 <AlertTriangle className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5" />
                 <span className="text-[10px] text-on-surface-variant leading-tight">
                    {rawResult.provenance?.limitations || "IoU is a geometric similarity metric between observed and theoretical slick extents. It does not establish legal causation or operational responsibility."}
                 </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest p-8 text-center text-on-surface-variant gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-xs font-mono font-bold text-on-surface uppercase tracking-wide">
                {simulationStatus === "FAILED"
                  ? "SIMULATION: FAILED — Numerical forward advection simulation failed."
                  : simulationStatus === "NO_USABLE_RESULTS"
                  ? "SIMULATION: NO USABLE RESULTS — Simulation produced no measurable spatial footprint."
                  : "SIMULATION: UNAVAILABLE — No valid simulation result is available for this investigation."}
              </span>
              <p className="text-[11px] font-mono text-on-surface-variant max-w-md mt-1">
                {candidates.length > 0 
                  ? "Select a candidate hypothesis above and click 'Run Counterfactual' to execute forward numerical advection."
                  : "No candidate vessel positions or drift origin available. Simulation cannot be performed without valid AIS and drift evidence."}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
