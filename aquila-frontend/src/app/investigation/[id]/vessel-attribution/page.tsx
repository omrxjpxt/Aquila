// @ts-nocheck
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
  
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(incident.candidates[0].mmsi);
  
  const selectedVessel = incident.candidates.find(c => c.mmsi === selectedMmsi) || incident.candidates[0];

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[var(--color-surface-container-lowest)]">
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapLibreCanvas center={selectedVessel.lastKnownPosition} zoom={8}>
           <VesselTracksLayer candidates={incident.candidates} selectedMmsi={selectedMmsi} />
        </MapLibreCanvas>
        
        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-[416px] pointer-events-auto bg-[var(--color-surface-high)]/80 backdrop-blur border border-[var(--color-outline-variant)] rounded p-3 z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-[2px] bg-[var(--color-primary)]"></div>
            <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">Verified Track</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-[2px] bg-[var(--color-error)] border-dashed border-b border-[var(--color-error)]"></div>
            <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">Interpolated Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-[var(--color-tertiary-container)] rotate-45"></div>
            <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">Anomaly Marker</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex-1 p-4 flex gap-4 h-full pointer-events-none">
        
        {/* LEFT COLUMN: Ranked Candidate Vessels */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] h-full flex flex-col gap-4 pointer-events-auto">
          <div className="bg-[var(--color-surface-high)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg flex-1 flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50">
              <div className="flex items-center gap-2 text-[var(--color-on-surface)]">
                <ListOrdered className="text-[var(--color-primary)] w-5 h-5" />
                <h2 className="text-xl font-semibold">Candidate Vessels</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {incident.candidates.map((vessel, i) => (
                <div key={vessel.mmsi} onClick={() => setSelectedMmsi(vessel.mmsi)} className="cursor-pointer">
                  <CandidateVesselCard 
                    vesselName={vessel.name}
                    mmsi={vessel.mmsi}
                    type={vessel.type}
                    score={vessel.evidenceScore * 100}
                    rank={i + 1}
                    isSelected={selectedMmsi === vessel.mmsi}
                  />
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)]/30">
              <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] text-center opacity-70">
                Highest-ranked candidate based on available evidence.
              </p>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Map Space (Empty to let map show through) */}
        <div className="flex-1 h-full relative">
           <div className="absolute bottom-0 right-0 flex flex-col gap-2 pointer-events-auto">
             <button className="w-10 h-10 rounded bg-[var(--color-surface-high)]/80 backdrop-blur border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors flex items-center justify-center">
               <Plus className="w-5 h-5" />
             </button>
             <button className="w-10 h-10 rounded bg-[var(--color-surface-high)]/80 backdrop-blur border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors flex items-center justify-center">
               <Minus className="w-5 h-5" />
             </button>
             <div className="w-10 h-px bg-[var(--color-outline-variant)] my-1"></div>
             <button className="w-10 h-10 rounded bg-[var(--color-surface-high)]/80 backdrop-blur border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors flex items-center justify-center">
               <Layers className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* RIGHT COLUMN: Detailed Profile */}
        <div className="w-[420px] h-full flex flex-col pointer-events-auto">
          <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg flex-1 flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)]"></div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-2xl font-bold text-[var(--color-on-surface)]">{selectedVessel.name}</h3>
                  <span className="font-mono text-xs text-[var(--color-on-surface-variant)] block mt-1">MMSI: {selectedVessel.mmsi} | FLAG: {selectedVessel.flag}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">EVIDENCE SCORE</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[var(--color-primary)]">{(selectedVessel.evidenceScore * 100).toFixed(0)}</span>
                    <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">/100</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">{selectedVessel.status}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
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
    </div>
  );
}
