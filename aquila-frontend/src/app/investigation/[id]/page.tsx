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
  Layers,
  ZoomIn,
  ZoomOut,
  Play,
  SkipBack,
  SkipForward,
  Crosshair,
  MapPin,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function InvestigationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Interactive State
  const [showSlick, setShowSlick] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(mockIncident.vesselCandidates[0].mmsi);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const incident = mockIncident; // Uses INC-AQ-001 universally

  return (
    <div className="flex w-full h-full relative overflow-hidden flex-col bg-surface">
      
      {/* 3-Pane Layout: Left, Center, Right */}
      <div className="flex flex-1 overflow-hidden h-[calc(100%-120px)]">
        
        {/* LEFT PANEL: Incident Overview */}
        <aside className="w-[340px] h-full flex flex-col border-r border-outline-variant bg-surface shrink-0 z-10 shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-primary mb-1">{incident.id}</h2>
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">ACTIVE INVESTIGATION</span>
              </div>
              <span className="px-2 py-1 bg-error/10 text-error font-mono text-[10px] font-bold rounded uppercase tracking-wider border border-error/20">
                {incident.priority}
              </span>
            </div>
            
            <div className="space-y-3 font-mono text-[11px] mt-4">
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant">Center Coord</span>
                <span className="text-on-surface">
                  {incident.incident.centerCoord[1].toFixed(4)}° N, {incident.incident.centerCoord[0].toFixed(4)}° E
                </span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant">Est. Volume</span>
                <span className="text-on-surface">{incident.slick.estimatedVolumeM3.toLocaleString()} m³</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant">Surface Area</span>
                <span className="text-on-surface">{incident.slick.surfaceAreaKm2} km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Initial Detection</span>
                <span className="text-on-surface">{new Date(incident.incident.initialDetectionTime).toISOString().slice(11, 16)}Z</span>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold tracking-wider uppercase text-on-surface mb-4 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-primary" />
              SLICK CHARACTERISTICS
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-1">OIL TYPE CLASSIFICATION</div>
                <div className="font-mono text-xs text-on-surface font-medium">{incident.slick.classification}</div>
              </div>
              
              <div>
                <div className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-1">WEATHERING STATE</div>
                <div className="font-mono text-xs text-on-surface font-medium">{incident.slick.weatheringState}</div>
              </div>
              
              <div className="pt-4 border-t border-outline-variant/30">
                <div className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-3">EVIDENCE CATEGORIES</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border border-outline-variant rounded bg-surface-container-lowest">
                    <span className="text-[11px] font-medium text-on-surface">SAR Backscatter</span>
                    <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Confirmed</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border border-outline-variant rounded bg-surface-container-lowest">
                    <span className="text-[11px] font-medium text-on-surface">Optical Corroboration</span>
                    <span className="text-[10px] font-bold uppercase text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">Pending</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border border-outline-variant rounded bg-surface-container-lowest">
                    <span className="text-[11px] font-medium text-on-surface">Wind Hindcast</span>
                    <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Aligned</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border border-outline-variant rounded bg-surface-container-lowest">
                    <span className="text-[11px] font-medium text-on-surface">AIS Correlation</span>
                    <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Strong Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL: Map Workspace */}
        <main className="flex-1 relative bg-[#eef4f8]">
          
          <MapLibreCanvas 
            center={incident.incident.centerCoord} 
            zoom={9}
          >
            {/* Layer Components controlled by state */}
            <SlickLayer center={incident.incident.centerCoord} visible={showSlick} />
            <OriginRegionLayer center={incident.originEstimate.center} radiusKm={incident.originEstimate.radiusKm} visible={showOrigin} />
            <VesselTracksLayer candidates={incident.vesselCandidates} selectedMmsi={selectedMmsi} visible={showVessels} />
          </MapLibreCanvas>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto shadow-sm">
            <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px w-full bg-outline-variant my-1"></div>
            
            <button 
              onClick={() => setShowSlick(!showSlick)}
              className={`w-8 h-8 bg-surface/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showSlick ? 'border-primary text-primary' : 'border-outline-variant text-on-surface-variant'}`}
              title="Toggle Slick"
            >
              <Droplet className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowOrigin(!showOrigin)}
              className={`w-8 h-8 bg-surface/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showOrigin ? 'border-tertiary text-tertiary' : 'border-outline-variant text-on-surface-variant'}`}
              title="Toggle Origin Region"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowVessels(!showVessels)}
              className={`w-8 h-8 bg-surface/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showVessels ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}
              title="Toggle Vessel Tracks"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
          
        </main>

        {/* RIGHT PANEL: Attribution & Candidates */}
        <aside className="w-[380px] h-full flex flex-col border-l border-outline-variant bg-surface z-10 shrink-0 shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-xs font-bold tracking-wider uppercase text-on-surface mb-2">
              SOURCE ATTRIBUTION
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Analyzed AIS data overlapping with backward drift simulation. 
              <span className="text-primary font-mono ml-1 font-medium">{incident.vesselCandidates.length} candidates</span> identified within the probable origin spatio-temporal window.
            </p>
            
            <div className="flex gap-2">
              <Link href={`/investigation/${id}/vessel-attribution`} className="flex-1 bg-surface border border-outline-variant hover:border-primary text-xs text-center py-2 rounded transition-colors text-on-surface font-medium shadow-sm">
                Detailed Matrix
              </Link>
              <Link href={`/investigation/${id}/report`} className="flex-1 bg-primary text-on-primary text-xs text-center py-2 rounded transition-colors font-medium shadow-sm">
                Generate Report
              </Link>
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-surface-container-lowest">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant px-1 mb-2">
              CANDIDATE RANKING
            </h4>
            
            {incident.vesselCandidates.map((vessel, i) => (
              <div key={vessel.mmsi} onClick={() => setSelectedMmsi(vessel.mmsi)} className="cursor-pointer">
                 <CandidateVesselCard 
                  vesselName={vessel.name}
                  mmsi={vessel.mmsi}
                  type={vessel.type}
                  score={vessel.evidenceScore * 100}
                  rank={i + 1} 
                  isSelected={selectedMmsi === vessel.mmsi}
                  status={vessel.status}
                />
              </div>
            ))}
          </div>
        </aside>

      </div>

      {/* BOTTOM PANEL: Evidence Timeline */}
      <div className="h-[120px] w-full border-t border-outline-variant bg-surface flex flex-col z-20 shadow-sm shrink-0">
        
        {/* Timeline Header & Controls */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">INVESTIGATION TIMELINE</span>
            <div className="h-3 w-px bg-outline-variant"></div>
            <span className="font-mono text-[11px] text-primary font-medium">T-48h to Present</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <SkipBack className="w-3 h-3" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-6 h-6 rounded flex items-center justify-center text-on-primary bg-primary hover:bg-primary-container transition-colors">
              <Play className="w-3 h-3 ml-0.5" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <SkipForward className="w-3 h-3" />
            </button>
            <div className="h-3 w-px bg-outline-variant mx-2"></div>
            <span className="font-mono text-xs text-on-surface font-medium">{new Date(incident.incident.initialDetectionTime).toISOString().slice(0,19)}Z</span>
          </div>
          
          <Link href={`/investigation/${id}/timeline`} className="text-[11px] text-primary hover:underline font-medium transition-colors">
            Full Timeline
          </Link>
        </div>
        
        {/* Timeline Track */}
        <div className="flex-1 relative flex items-center px-8 bg-surface">
          {/* Main Track Line */}
          <div className="absolute left-8 right-8 top-1/2 h-px bg-outline-variant -translate-y-1/2"></div>
          
          {/* Current Time Indicator */}
          <div className="absolute left-[65%] top-1/4 bottom-1/4 w-px bg-primary z-10">
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"></div>
          </div>
          
          {/* Timeline Events */}
          {incident.timeline.map((event, idx) => {
            const positions = ["20%", "45%", "80%"]; // Mock positions for visual timeline
            const pos = positions[idx % positions.length];
            const isCritical = event.importance === "CRITICAL";
            const isHigh = event.importance === "HIGH";
            
            return (
              <div key={idx} className={`absolute left-[${pos}] top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10`} style={{ left: pos }}>
                <div className={`w-3 h-3 rounded-full border-2 border-surface shadow-sm ${isCritical ? 'bg-error' : (isHigh ? 'bg-tertiary' : 'bg-primary')}`}></div>
                <div className="absolute top-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest text-[10px] px-2 py-1 border border-outline-variant rounded font-mono text-on-surface shadow-md z-50">
                  {event.eventType}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
