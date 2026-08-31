"use client";

import { use, useState } from "react";
import { CandidateVesselCard } from "@/components/investigation/CandidateVesselCard";
import { AttributionBreakdown } from "@/components/investigation/AttributionBreakdown";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { VesselTracksLayer } from "@/components/map/layers";
import { ListOrdered, ShieldCheck, Activity, Map, Plus, Minus, Layers } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

export default function VesselAttributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;
  
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(incident.vesselCandidates[0].mmsi);
  
  const selectedVessel = incident.vesselCandidates.find(c => c.mmsi === selectedMmsi) || incident.vesselCandidates[0];

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest">
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0 bg-[#eef4f8]">
        <MapLibreCanvas center={selectedVessel.lastKnownPosition} zoom={8}>
           <VesselTracksLayer candidates={incident.vesselCandidates} selectedMmsi={selectedMmsi} />
        </MapLibreCanvas>
        
        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-[340px] pointer-events-auto bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 z-10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-primary"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">Verified Track</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-tertiary/50 border-dashed border-b-2 border-tertiary"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">Interpolated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error border-2 border-surface shadow-sm"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">Target Anomaly</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex-1 flex h-full pointer-events-none">
        
        {/* LEFT COLUMN: Ranked Candidate Vessels */}
        <div className="w-[320px] h-full flex flex-col pointer-events-auto border-r border-outline-variant bg-surface shrink-0 shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2 text-on-surface">
              <ListOrdered className="text-primary w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Candidate Vessels</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
            {incident.vesselCandidates.map((vessel, i) => (
              <div key={vessel.mmsi} onClick={() => setSelectedMmsi(vessel.mmsi)} className="cursor-pointer">
                <CandidateVesselCard 
                  vesselName={vessel.name}
                  mmsi={vessel.mmsi}
                  type={vessel.type}
                  score={vessel.evidenceScore * 100}
                  rank={i + 1}
                  status={vessel.status}
                  isSelected={selectedMmsi === vessel.mmsi}
                />
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
            <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant text-center opacity-70">
              Select candidate to view detailed matrix.
            </p>
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
             <div className="w-8 h-px bg-outline-variant my-0.5"></div>
             <button className="w-8 h-8 rounded bg-surface/90 backdrop-blur border border-outline-variant text-on-surface hover:text-primary hover:border-primary transition-colors flex items-center justify-center">
               <Layers className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* RIGHT COLUMN: Detailed Profile */}
        <div className="w-[420px] h-full flex flex-col pointer-events-auto border-l border-outline-variant bg-surface shrink-0 shadow-sm">
            
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface">{selectedVessel.name}</h3>
                <span className="font-mono text-[10px] font-medium text-on-surface-variant block mt-1 uppercase tracking-wider">MMSI {selectedVessel.mmsi} • FLAG {selectedVessel.flag}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">OVERALL MATCH</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">{(selectedVessel.evidenceScore * 100).toFixed(0)}</span>
                  <span className="font-mono text-[10px] font-bold text-on-surface-variant">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 bg-primary/10 w-fit px-3 py-1.5 rounded border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">{selectedVessel.status}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-surface-container-lowest">
            <AttributionBreakdown 
              vesselId={selectedVessel.mmsi}
              vesselName={selectedVessel.name}
              overallScore={selectedVessel.evidenceScore * 100}
              factors={{
                spatial: 95,
                temporal: 90,
                trajectory: 85,
                drift: 88,
                behavioural: 70,
                aisQuality: 98
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
