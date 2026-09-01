"use client";

import { use, useEffect, useState } from "react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { VesselTracksLayer, OriginRegionLayer } from "@/components/map/layers";
import { ListOrdered, ShieldCheck, Plus, Minus, Layers, Search, AlertTriangle, Info, Map as MapIcon } from "lucide-react";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function VesselAttributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    scene, 
    candidates: slicks, 
    selectedCandidateId, 
    loadInvestigation, 
    driftResults, 
    vesselCandidates, 
    findVesselCandidates,
    isLoading
  } = useInvestigation();
  
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);

  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  const selectedSlick = slicks.find(c => c.id === selectedCandidateId) || slicks[0];
  
  // Scenario defaults to hindcast-24h
  const scenarioId = `hindcast-${id}-24h`;
  const driftResult = driftResults[scenarioId];
  const candidates = vesselCandidates[scenarioId] || [];

  const handleDiscover = () => {
    if (driftResult && driftResult.origin_estimate) {
      // Mock scenario window for demo
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      findVesselCandidates(
        scenarioId, 
        driftResult.origin_estimate, 
        startTime,
        endTime
      );
    }
  };

  const selectedVessel = candidates.find(c => c.identity.mmsi === selectedMmsi) || candidates[0];

  const mapCenter: [number, number] = driftResult && driftResult.origin_estimate
    ? [
        driftResult.origin_estimate.geometry.coordinates[0][0][0], 
        driftResult.origin_estimate.geometry.coordinates[0][0][1]
      ]
    : [0, 0];

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest">
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0 bg-[#eef4f8]">
        {driftResult && driftResult.origin_estimate && (
          <MapLibreCanvas center={mapCenter} zoom={8}>
             <OriginRegionLayer geometry={driftResult.origin_estimate.geometry} visible={true} />
             <VesselTracksLayer candidates={candidates} selectedMmsi={selectedMmsi} />
          </MapLibreCanvas>
        )}
        
        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-[340px] pointer-events-auto bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 z-10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-[#00647C]"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">Observed Track</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 border-dashed border-b-2 border-[#eab308]"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">AIS GAP (&gt;1h)</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex-1 flex h-full pointer-events-none">
        
        {/* LEFT COLUMN: Candidate Vessels */}
        <div className="w-[320px] h-full flex flex-col pointer-events-auto border-r border-outline-variant bg-surface shrink-0 shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface">
              <ListOrdered className="text-primary w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Candidate Discovery</h2>
            </div>
            
            {(!candidates || candidates.length === 0) ? (
              <button 
                onClick={handleDiscover}
                disabled={!driftResult || isLoading}
                className="w-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs uppercase tracking-wider py-2 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {isLoading ? "Querying AIS..." : "Discover Vessels"}
              </button>
            ) : (
              <div className="bg-[#ffeedd]/90 border border-[#e5ab35] rounded p-2 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-[#e5ab35]" />
                <span className="text-[9px] font-bold tracking-widest uppercase text-[#8c6b22]">DEMO / MOCK PROVIDER</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
            {candidates.map((vessel) => {
              const isSelected = selectedMmsi === vessel.identity.mmsi;
              return (
                <div 
                  key={vessel.identity.mmsi} 
                  onClick={() => setSelectedMmsi(vessel.identity.mmsi)} 
                  className={`cursor-pointer p-3 border rounded transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-on-surface">{vessel.identity.name || "UNKNOWN VESSEL"}</span>
                    <span className="text-[9px] bg-surface-container border border-outline px-1.5 py-0.5 rounded text-on-surface-variant font-mono">MMSI: {vessel.identity.mmsi}</span>
                  </div>
                  <div className="flex gap-2">
                    {vessel.spatially_relevant && <span className="text-[9px] font-bold text-[#00647C] bg-[#00647C]/10 px-1.5 py-0.5 rounded uppercase">Spatial Match</span>}
                    {vessel.temporally_relevant && <span className="text-[9px] font-bold text-[#00647C] bg-[#00647C]/10 px-1.5 py-0.5 rounded uppercase">Time Match</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Map Space (Empty to let map show through) */}
        <div className="flex-1 h-full relative">
           <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto z-10 shadow-sm">
             <button className="w-8 h-8 rounded bg-surface/90 backdrop-blur border border-outline-variant text-on-surface hover:text-primary hover:border-primary transition-colors flex items-center justify-center">
               <Plus className="w-4 h-4" />
             </button>
             <button className="w-8 h-8 rounded bg-surface/90 backdrop-blur border border-outline-variant text-on-surface hover:text-primary hover:border-primary transition-colors flex items-center justify-center">
               <Minus className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* RIGHT COLUMN: Detailed Profile */}
        {selectedVessel && (
          <div className="w-[420px] h-full flex flex-col pointer-events-auto border-l border-outline-variant bg-surface shrink-0 shadow-sm">
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{selectedVessel.identity.name || "UNKNOWN"}</h3>
                  <span className="font-mono text-[10px] font-medium text-on-surface-variant block mt-1 uppercase tracking-wider">MMSI {selectedVessel.identity.mmsi} • FLAG {selectedVessel.identity.flag || "N/A"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4 bg-surface-container border border-outline-variant px-3 py-2 rounded">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface">Candidate Status</span>
                <span className="text-xs text-on-surface-variant font-medium">This vessel was operating near the inferred origin region during the estimated release window.</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-4 flex flex-col gap-4">
              
              <div className="flex flex-col gap-2 border border-outline-variant rounded p-3 bg-surface">
                <div className="flex items-center gap-2 mb-1">
                  <MapIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface">Spatial Relevance</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-xs font-mono text-on-surface-variant">Inside Origin Region?</span>
                  <span className="text-xs font-bold text-on-surface">{selectedVessel.inside_origin_region ? "YES" : "NO"}</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-xs font-mono text-on-surface-variant">Closest Approach</span>
                  <span className="text-xs font-bold text-on-surface">{selectedVessel.closest_approach_meters ? `${(selectedVessel.closest_approach_meters / 1000).toFixed(1)} km` : "N/A"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 border border-outline-variant rounded p-3 bg-surface">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface">AIS Evidence Quality</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-xs font-mono text-on-surface-variant">Total Observations</span>
                  <span className="text-xs font-bold text-on-surface">{selectedVessel.track.total_observations}</span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-xs font-mono text-on-surface-variant">Coverage Quality</span>
                  <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${
                    selectedVessel.track.coverage_quality === 'GOOD' ? 'bg-primary/20 text-primary' :
                    selectedVessel.track.coverage_quality === 'MODERATE' ? 'bg-[#e5ab35]/20 text-[#e5ab35]' :
                    'bg-error/20 text-error'
                  }`}>
                    {selectedVessel.track.coverage_quality}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
                  <span className="text-xs font-mono text-on-surface-variant">Longest AIS Gap</span>
                  <span className="text-xs font-bold text-error">{selectedVessel.track.longest_gap_hours.toFixed(1)} hrs</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
