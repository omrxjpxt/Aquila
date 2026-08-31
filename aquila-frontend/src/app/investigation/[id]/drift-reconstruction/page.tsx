"use client";

import { use, useState } from "react";
import { Activity, AlertTriangle, Play, Map, ChevronRight, Settings } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer, TrajectoryLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import Link from "next/link";

export default function DriftReconstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const [showSlick, setShowSlick] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[#eef4f8]">
      
      {/* Map Layer */}
      <MapLibreCanvas center={incident.originEstimate.center} zoom={10}>
        <SlickLayer center={incident.incident.centerCoord} visible={showSlick} />
        <OriginRegionLayer center={incident.originEstimate.center} radiusKm={incident.originEstimate.radiusKm} visible={showOrigin} />
        <TrajectoryLayer origin={incident.originEstimate.center} slick={incident.incident.centerCoord} visible={showTrajectory} />
      </MapLibreCanvas>
      
      {/* HUD: Top Left - Current Target Info */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
        <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
          <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">OBSERVED EVENT</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-error rounded-sm block"></span>
            <span className="font-mono font-bold text-sm text-on-surface">{incident.id}</span>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant mt-1 font-medium">LAT: {incident.incident.centerCoord[1].toFixed(4)}°N LON: {incident.incident.centerCoord[0].toFixed(4)}°E</span>
        </div>
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
          </div>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">ESTIMATED RELEASE WINDOW (UTC)</span>
              <div className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 flex items-center justify-between text-xs font-mono font-medium text-on-surface">
                {incident.originEstimate.timeWindow}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">ORIGIN CONFIDENCE STATE</span>
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded px-3 py-2">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-outline-variant/30" cx="18" cy="18" fill="none" r="16" stroke="currentColor" strokeWidth="4"></circle>
                    <circle className="text-primary" cx="18" cy="18" fill="none" r="16" stroke="currentColor" strokeDasharray="100" strokeDashoffset="15" strokeWidth="4"></circle>
                  </svg>
                  <span className="absolute text-[9px] font-bold text-primary">{incident.originEstimate.confidenceState}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface font-bold">Radius: {incident.originEstimate.radiusKm} km</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Hindcast alignment</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Forcing Panel */}
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm flex flex-col gap-3">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant border-b border-outline-variant p-3 bg-surface-container-low rounded-t">ENVIRONMENTAL FORCING</h3>
          <div className="flex flex-col gap-2 font-mono text-[11px] px-4 pb-4">
            <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
              <span className="text-on-surface-variant font-medium">Ocean Currents</span>
              <span className="text-on-surface text-right font-bold">0.3 m/s<br/><span className="text-[9px] text-tertiary">240° WSW</span></span>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant">
              <span className="text-on-surface-variant font-medium">Wind Field (ERA5)</span>
              <span className="text-on-surface text-right font-bold">{incident.environmentalContext.windSpeedKnots} kts<br/><span className="text-[9px] text-primary">{incident.environmentalContext.windDirection}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="bg-surface/95 backdrop-blur border border-outline-variant rounded-full px-6 py-3 shadow-md flex items-center gap-6">
          <div className="flex items-center gap-3 border-r border-outline-variant pr-6">
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">HINDCAST T-MINUS</span>
            <span className="font-mono text-base text-primary font-bold">-48h</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-64 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-tertiary w-full relative">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-sm"></div>
              </div>
            </div>
            <button className="w-8 h-8 bg-primary text-on-primary hover:bg-primary-container rounded-full flex items-center justify-center transition-colors">
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
