"use client";

import { use } from "react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { HudPanel } from "@/components/layout/HudPanel";
import { CandidateVesselCard } from "@/components/investigation/CandidateVesselCard";
import { 
  Map as MapIcon, 
  Clock, 
  Anchor, 
  AlertTriangle, 
  ShieldCheck, 
  Layers,
  ZoomIn,
  ZoomOut,
  Play,
  SkipBack,
  SkipForward,
  FileText,
  Share2,
  Droplet,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
  Satellite,
  Wind
} from "lucide-react";
import Link from "next/link";

export default function InvestigationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <div className="flex w-full h-full relative overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden h-[calc(100%-180px)]">
        
        {/* Left Panel: Incident Overview */}
        <aside className="w-[320px] h-full flex flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/80 backdrop-blur-md z-10 shrink-0">
          <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-high)]/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-on-surface)] mb-1">{id}</h2>
                <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">ACTIVE INCIDENT</span>
              </div>
              <span className="px-2 py-1 bg-[var(--color-error)]/10 text-[var(--color-error)] font-mono text-[11px] font-bold rounded border border-[var(--color-error)]/30 tracking-wider">
                CRITICAL
              </span>
            </div>
            
            <div className="space-y-3 font-mono text-xs mt-6">
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Center Coord</span>
                <span className="text-[var(--color-primary)]">24° 30&apos; 12&quot; N, 58° 12&apos; 45&quot; E</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Est. Volume</span>
                <span className="text-[var(--color-on-surface)]">1,450 m³</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Surface Area</span>
                <span className="text-[var(--color-on-surface)]">6.8 km²</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Initial Detection</span>
                <span className="text-[var(--color-on-surface)]">2023-10-23 08:42:15Z</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Last Update</span>
                <span className="text-[var(--color-on-surface)]">2023-10-24 14:15:00Z</span>
              </div>
            </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-4 flex items-center gap-2">
              <Droplet className="w-4 h-4" />
              SLICK ASSESSMENT
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-1">OIL TYPE CLASSIFICATION</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-error)]"></span>
                  <span className="font-mono text-sm text-[var(--color-on-surface)]">Heavy Crude / HFO</span>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-1">WEATHERING STATE</div>
                <div className="font-mono text-sm text-[var(--color-on-surface)]">Moderate (Est. 36-48hrs)</div>
              </div>
              
              <div className="pt-2 border-t border-[var(--color-outline-variant)]/50">
                <div className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-2">EVIDENCE CATEGORIES</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">SAR Backscatter</span>
                    <div className="flex items-center gap-1 text-[#4ade80]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-mono text-[10px]">SUPPORTING</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">Optical Imagery</span>
                    <div className="flex items-center gap-1 text-[#94a3b8]">
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span className="font-mono text-[10px]">NEUTRAL</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">Wind Alignment</span>
                    <div className="flex items-center gap-1 text-[#4ade80]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-mono text-[10px]">SUPPORTING</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">Current Drift</span>
                    <div className="flex items-center gap-1 text-[#475569]">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span className="font-mono text-[10px]">UNAVAILABLE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                 <Link href={`/investigation/${id}/slick-assessment`} className="w-full py-2 bg-[var(--color-surface-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] text-[11px] font-bold tracking-widest rounded border border-[var(--color-outline-variant)] flex items-center justify-center transition-colors">
                    FULL SLICK ASSESSMENT
                 </Link>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Center Map */}
        <section className="flex-1 h-full relative bg-[var(--color-surface-lowest)] overflow-hidden">
          <MapLibreCanvas center={[58.2, 24.5]} zoom={7} />
          
          <div className="absolute top-4 left-4 z-20 w-48 bg-[var(--color-surface-container)]/90 backdrop-blur-md rounded border border-[var(--color-outline-variant)] p-3">
            <h4 className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-2 uppercase">MAP LEGEND</h4>
            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[var(--color-error)]/30 border border-[var(--color-error)]"></div>
                <span className="text-[var(--color-on-surface)]">Observed Slick</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[var(--color-tertiary)]/20 border border-[var(--color-tertiary)]"></div>
                <span className="text-[var(--color-on-surface)]">Probable Origin Area</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[var(--color-primary)]"></div>
                <span className="text-[var(--color-on-surface)]">Observed AIS Track</span>
              </div>
            </div>
          </div>
          
          <div className="absolute top-4 right-4 z-20 bg-[var(--color-surface-container)]/90 backdrop-blur-md rounded border border-[var(--color-outline-variant)] flex flex-col overflow-hidden shadow-lg">
             <div className="px-3 py-2 border-b border-[var(--color-outline-variant)] flex justify-between items-center bg-[var(--color-surface-high)]/50">
               <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)]">LAYER CONTROLS</span>
               <Layers className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
             </div>
             <div className="p-2 space-y-1">
                {['Satellite Imagery', 'Observed Slick', 'Probable Origin', 'Simulated Hindcast', 'AIS Tracks'].map(layer => (
                  <label key={layer} className="flex items-center justify-between p-1.5 hover:bg-[var(--color-surface)] rounded cursor-pointer gap-4">
                     <span className="text-xs font-mono text-[var(--color-on-surface)]">{layer}</span>
                     <input type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
                  </label>
                ))}
             </div>
          </div>
        </section>
        
        {/* Right Panel: Source Attribution */}
        <aside className="w-[380px] h-full flex flex-col border-l border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/80 backdrop-blur-md z-10 shrink-0">
          <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-high)]/50 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-[var(--color-on-surface)] flex items-center gap-2 mb-1">
              <ShieldCheck className="text-[var(--color-primary)] w-5 h-5" />
              SOURCE ATTRIBUTION
            </h2>
            <p className="font-mono text-[var(--color-on-surface-variant)] text-xs">Candidates ranked by aggregate evidence</p>
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
               vesselName="OCEAN TRADER"
               mmsi="234567890"
               type="CARGO"
               score={64}
               isSelected={false}
             />
             <CandidateVesselCard 
               rank={3}
               vesselName="BALTIC SEA"
               mmsi="345678901"
               type="BULK CARRIER"
               score={42}
               isSelected={false}
             />
             
             <div className="pt-4">
                <Link href={`/investigation/${id}/vessel-attribution`} className="w-full py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[11px] font-bold tracking-widest rounded border border-[var(--color-primary)]/30 flex justify-center items-center gap-2 transition-colors">
                   REVIEW EVIDENCE PACKAGE
                </Link>
             </div>
          </div>
        </aside>
        
      </div>
      
      {/* Bottom Panel: Evidence Timeline */}
      <div className="h-[180px] w-full bg-[var(--color-surface-container)]/90 backdrop-blur-md border-t border-[var(--color-outline-variant)] flex shrink-0 z-20">
        <div className="flex-1 p-4 flex flex-col relative">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] flex items-center gap-2 uppercase">
                <Clock className="w-4 h-4" />
                Evidence Timeline
              </h3>
              <div className="flex items-center gap-4 bg-[var(--color-surface-lowest)] p-1 rounded border border-[var(--color-outline-variant)]/50">
                 <button className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"><SkipBack className="w-4 h-4" /></button>
                 <button className="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary-fixed)] transition-colors"><Play className="w-4 h-4" fill="currentColor" /></button>
                 <button className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"><SkipForward className="w-4 h-4" /></button>
              </div>
           </div>
           
           <div className="relative flex-1 mt-6">
              <div className="absolute w-full flex justify-between px-2 -top-6 text-[10px] font-mono text-[var(--color-on-surface-variant)]">
                <span>T-48h</span>
                <span>T-24h</span>
                <span className="text-[var(--color-error)] font-bold">T=0 (OBSERVED)</span>
                <span>T+24h</span>
                <span>T+48h</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="50" className="w-full h-1 bg-[var(--color-surface-high)] rounded appearance-none outline-none accent-[var(--color-primary)]" />
           </div>
        </div>
        
        <div className="w-[380px] border-l border-[var(--color-outline-variant)] p-4 flex flex-col justify-center bg-[var(--color-surface-high)]/30">
           <div className="text-sm text-[var(--color-on-surface-variant)] mb-4">Export Analysis Package</div>
           <div className="flex gap-2">
              <Link href={`/investigation/${id}/report`} className="flex-1 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-highest)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-[11px] font-bold tracking-widest rounded transition-colors flex justify-center items-center gap-2">
                <FileText className="w-4 h-4" />
                PDF REPORT
              </Link>
              <button className="flex-1 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-background)] border border-[var(--color-primary)] text-[11px] font-bold tracking-widest rounded transition-colors flex justify-center items-center gap-2">
                <Share2 className="w-4 h-4" />
                SHARE DOSSIER
              </button>
           </div>
        </div>
      </div>
      
    </div>
  );
}
