"use client";

import { use } from "react";
import { CandidateVesselCard } from "@/components/investigation/CandidateVesselCard";
import { AttributionBreakdown } from "@/components/investigation/AttributionBreakdown";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { ListOrdered, ShieldCheck, Activity, Map, Plus, Minus, Layers } from "lucide-react";

export default function VesselAttributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-background">
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapLibreCanvas center={[-12.341, 45.124]} zoom={6} />
        
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
              <CandidateVesselCard 
                rank={1}
                vesselName="VESSEL ALPHA"
                mmsi="412345678"
                type="OIL TANKER"
                score={88}
                isSelected={true}
              />
              <CandidateVesselCard 
                rank={2}
                vesselName="POLARIS"
                mmsi="234567890"
                type="CARGO"
                score={74}
                isSelected={false}
              />
              <CandidateVesselCard 
                rank={3}
                vesselName="OCEANIC WANDERER"
                mmsi="345678901"
                type="BULK CARRIER"
                score={62}
                isSelected={false}
              />
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

        {/* RIGHT COLUMN: Detailed Profile (Vessel Alpha) */}
        <div className="w-[420px] h-full flex flex-col pointer-events-auto">
          <div className="bg-[var(--color-surface-high)]/95 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg h-full flex flex-col shadow-xl overflow-hidden">
            
            <div className="p-6 border-b border-[var(--color-outline-variant)] relative bg-[var(--color-surface)]/50">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 px-2 py-0.5 rounded text-[10px]">MMSI: 412345678</span>
                <span className="font-mono bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-0.5 rounded text-[10px]">IMO: 9123456</span>
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-on-surface)] leading-none mb-4 tracking-tight">VESSEL ALPHA</h2>
              
              <div className="flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">EVIDENCE SCORE</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[var(--color-primary)]">88</span>
                    <span className="font-mono text-[var(--color-on-surface-variant)]">/100</span>
                  </div>
                </div>
                <button className="bg-[var(--color-primary-container)] text-[var(--color-background)] font-mono px-4 py-2 rounded hover:brightness-110 transition-colors">
                  GENERATE REPORT
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
               <AttributionBreakdown 
                  vesselId="412345678"
                  vesselName="VESSEL ALPHA"
                  overallScore={88}
                  factors={{
                    spatial: 92,
                    temporal: 96,
                    trajectory: 89,
                    drift: 84,
                    behavioural: 71,
                    aisQuality: 86
                  }}
               />
               
               {/* WHY THIS VESSEL RANKED #1 */}
               <div className="space-y-3 pt-2">
                  <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] pb-2">
                    WHY THIS VESSEL RANKED #1
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex gap-3 bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 p-3 rounded items-start">
                       <ShieldCheck className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                       <div>
                         <h4 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Temporal Alignment</h4>
                         <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">Present during inferred release window 02:00Z - 06:00Z.</p>
                       </div>
                    </li>
                    <li className="flex gap-3 bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 p-3 rounded items-start">
                       <Map className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                       <div>
                         <h4 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Spatial Intersection</h4>
                         <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">Track directly intersects probable origin cloud centroid at 04:12Z.</p>
                       </div>
                    </li>
                    <li className="flex gap-3 bg-[var(--color-tertiary-container)]/10 border border-[var(--color-tertiary-container)]/30 p-3 rounded items-start relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-tertiary-container)]"></div>
                       <Activity className="w-5 h-5 text-[var(--color-tertiary)] mt-0.5 ml-1 shrink-0" />
                       <div>
                         <h4 className="text-sm font-semibold text-[var(--color-tertiary)] mb-1">Behavioral Anomaly</h4>
                         <p className="font-mono text-xs text-[var(--color-tertiary)]/80">Unexplained speed drop 14kts → 4kts detected prior to intersection.</p>
                       </div>
                    </li>
                  </ul>
               </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
