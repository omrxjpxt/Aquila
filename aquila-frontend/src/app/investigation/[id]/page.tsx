// @ts-nocheck
"use client";

import { use, useState } from "react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer, VesselTracksLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import { CandidateVesselCard } from "@/components/investigation/CandidateVesselCard";
import { 
  Droplet, 
  CheckCircle2, 
  MinusCircle, 
  HelpCircle,
  Layers,
  ZoomIn,
  ZoomOut,
  Play,
  SkipBack,
  SkipForward,
  Settings,
  Crosshair
} from "lucide-react";
import Link from "next/link";

export default function InvestigationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Interactive State
  const [showSlick, setShowSlick] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(mockIncident.candidates[0].mmsi);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const incident = mockIncident; // Uses INC-AQ-001 universally

  return (
    <div className="flex w-full h-full relative overflow-hidden flex-col bg-[var(--color-surface-container-lowest)]">
      
      {/* 4-Pane Layout: Left, Center, Right, Bottom */}
      <div className="flex flex-1 overflow-hidden h-[calc(100%-180px)]">
        
        {/* LEFT PANEL: Incident Overview */}
        <aside className="w-[320px] h-full flex flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/95 backdrop-blur-md z-10 shrink-0 shadow-lg">
          
          <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-high)]/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-on-surface)] mb-1">{incident.id}</h2>
                <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">ACTIVE INCIDENT</span>
              </div>
              <span className="px-2 py-1 bg-[var(--color-error)]/10 text-[var(--color-error)] font-mono text-[11px] font-bold rounded border border-[var(--color-error)]/30 tracking-wider">
                {incident.priority}
              </span>
            </div>
            
            <div className="space-y-3 font-mono text-xs mt-6">
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Center Coord</span>
                <span className="text-[var(--color-primary)]">
                  {incident.centerCoord[1].toFixed(4)}° N, {incident.centerCoord[0].toFixed(4)}° E
                </span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Est. Volume</span>
                <span className="text-[var(--color-on-surface)]">{incident.estimatedVolumeM3.toLocaleString()} m³</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-outline-variant)]/50 pb-2">
                <span className="text-[var(--color-on-surface-variant)]">Surface Area</span>
                <span className="text-[var(--color-on-surface)]">{incident.surfaceAreaKm2} km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-on-surface-variant)]">Initial Detection</span>
                <span className="text-[var(--color-on-surface)]">{incident.initialDetectionTime.split('T')[1].slice(0,5)}Z</span>
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
                  <span className="font-mono text-sm text-[var(--color-on-surface)]">{incident.slickClassification}</span>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-1">WEATHERING STATE</div>
                <div className="font-mono text-sm text-[var(--color-on-surface)]">{incident.weatheringState}</div>
              </div>
              
              <div className="pt-4 border-t border-[var(--color-outline-variant)]/50">
                <div className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] mb-2">EVIDENCE CATEGORIES</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">SAR Backscatter</span>
                    <div className="flex items-center gap-1 text-[#4ade80]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">{incident.evidenceScores.sarBackscatter}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">Optical Corroboration</span>
                    <div className="flex items-center gap-1 text-[var(--color-tertiary)]">
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">{incident.evidenceScores.opticalConfirmation}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">Wind Hindcast</span>
                    <div className="flex items-center gap-1 text-[#4ade80]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">{incident.evidenceScores.windHindcast}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--color-surface-container)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">AIS Correlation</span>
                    <div className="flex items-center gap-1 text-[#4ade80]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">{incident.evidenceScores.aisCorrelation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL: Map Workspace */}
        <main className="flex-1 relative bg-[var(--color-surface-lowest)]">
          
          <MapLibreCanvas 
            center={incident.centerCoord} 
            zoom={9}
          >
            {/* Layer Components controlled by state */}
            <SlickLayer center={incident.centerCoord} visible={showSlick} />
            <OriginRegionLayer center={incident.originRegion.center} radiusKm={incident.originRegion.radiusKm} visible={showOrigin} />
            <VesselTracksLayer candidates={incident.candidates} selectedMmsi={selectedMmsi} visible={showVessels} />
          </MapLibreCanvas>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
            <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px w-full bg-[var(--color-outline-variant)] my-1"></div>
            
            <button 
              onClick={() => setShowSlick(!showSlick)}
              className={`w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showSlick ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'}`}
              title="Toggle Slick"
            >
              <Droplet className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowOrigin(!showOrigin)}
              className={`w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showOrigin ? 'border-[var(--color-tertiary)] text-[var(--color-tertiary)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'}`}
              title="Toggle Origin Region"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowVessels(!showVessels)}
              className={`w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showVessels ? 'border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'}`}
              title="Toggle Vessel Tracks"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
          
        </main>

        {/* RIGHT PANEL: Attribution & Candidates */}
        <aside className="w-[380px] h-full flex flex-col border-l border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/95 backdrop-blur-md z-10 shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.2)]">
          <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-high)]/50">
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-2">
              SOURCE ATTRIBUTION
            </h3>
            <p className="text-sm text-[var(--color-on-surface)] leading-relaxed mb-4">
              Analyzed AIS data overlapping with backward drift simulation. 
              <span className="text-[var(--color-primary)] font-mono ml-1">3 candidates</span> identified within the probable origin spatio-temporal window.
            </p>
            
            <div className="flex gap-2">
              <Link href={`/investigation/${id}/vessel-attribution`} className="flex-1 bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] text-xs text-center py-2 rounded transition-colors text-[var(--color-on-surface)] font-medium">
                Detailed Matrix
              </Link>
              <Link href={`/investigation/${id}/report`} className="flex-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs text-center py-2 rounded transition-colors font-medium">
                Generate Report
              </Link>
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] px-1 mb-1">
              CANDIDATE RANKING
            </h4>
            
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
        </aside>

      </div>

      {/* BOTTOM PANEL: Evidence Timeline */}
      <div className="h-[180px] w-full border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]/95 backdrop-blur flex flex-col z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        
        {/* Timeline Header & Controls */}
        <div className="h-12 border-b border-[var(--color-outline-variant)] flex items-center justify-between px-6 bg-[var(--color-surface-container-highest)]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">INVESTIGATION TIMELINE</span>
            <div className="h-4 w-px bg-[var(--color-outline-variant)]"></div>
            <span className="font-mono text-xs text-[var(--color-primary)]">T-48h to Present</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-lowest)] transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-surface-lowest)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] transition-colors">
              <Play className="w-4 h-4 ml-0.5" />
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-lowest)] transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-[var(--color-outline-variant)] mx-2"></div>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">2023-10-23 12:00:00Z</span>
          </div>
          
          <Link href={`/investigation/${id}/timeline`} className="text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] flex items-center gap-1 font-medium transition-colors">
            Full Timeline
          </Link>
        </div>
        
        {/* Timeline Track (Mock implementation) */}
        <div className="flex-1 relative flex items-center px-8">
          {/* Main Track Line */}
          <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-[var(--color-outline-variant)]/50 -translate-y-1/2"></div>
          
          {/* Current Time Indicator */}
          <div className="absolute left-[65%] top-1/4 bottom-1/4 w-px bg-[var(--color-primary)] z-10 shadow-[0_0_8px_var(--color-primary)]">
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
          </div>
          
          {/* Timeline Events */}
          <div className="absolute left-[20%] top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10">
            <div className="w-3 h-3 rounded-full bg-[#4ade80] border-2 border-[var(--color-surface-container-high)] shadow-sm"></div>
            <div className="absolute top-6 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-lowest)] text-[10px] px-2 py-1 border border-[var(--color-outline-variant)] rounded font-mono text-[var(--color-on-surface)] shadow-md">
              AIS Target Confirmed
            </div>
          </div>
          
          <div className="absolute left-[45%] top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10">
            <div className="w-4 h-4 rounded bg-[var(--color-error)] border-2 border-[var(--color-surface-container-high)] rotate-45 shadow-sm"></div>
            <div className="absolute top-6 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-lowest)] text-[10px] px-2 py-1 border border-[var(--color-error)]/50 rounded font-mono text-[var(--color-on-surface)] shadow-md z-50">
              Initial SAR Detection
            </div>
          </div>
          
          <div className="absolute left-[80%] top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10">
            <div className="w-3 h-3 rounded-full bg-[var(--color-tertiary)] border-2 border-[var(--color-surface-container-high)] shadow-sm"></div>
            <div className="absolute top-6 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-lowest)] text-[10px] px-2 py-1 border border-[var(--color-outline-variant)] rounded font-mono text-[var(--color-on-surface)] shadow-md">
              Drift Hindcast Updated
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
