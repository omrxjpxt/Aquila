"use client";

import { use, useState } from "react";
import { Activity, AlertTriangle, Play, Map, ChevronRight, Settings } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer, GeoJSONLayer, TrajectoryLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import Link from "next/link";

export default function DriftReconstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const [showSlick, setShowSlick] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[var(--color-surface-container-lowest)]">
      
      {/* Map Layer */}
      <MapLibreCanvas center={incident.originRegion.center} zoom={10}>
        <SlickLayer center={incident.centerCoord} visible={showSlick} />
        <OriginRegionLayer center={incident.originRegion.center} radiusKm={incident.originRegion.radiusKm} visible={showOrigin} />
        <TrajectoryLayer origin={incident.originRegion.center} slick={incident.centerCoord} visible={showTrajectory} />
      </MapLibreCanvas>
      
      {/* HUD: Top Left - Current Target Info */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
        <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] rounded p-3 shadow-lg flex flex-col gap-1 min-w-[200px]">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">OBSERVED EVENT</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[var(--color-error)] rounded-sm block shadow-[0_0_8px_rgba(255,180,171,0.5)]"></span>
            <span className="font-mono text-[var(--color-on-surface)]">{incident.id}</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--color-outline)] mt-1">LAT: {incident.centerCoord[1].toFixed(4)}°N LON: {incident.centerCoord[0].toFixed(4)}°E</span>
        </div>
      </div>

      {/* HUD: Right Side Panels */}
      <div className="absolute top-4 right-4 z-20 w-80 flex flex-col gap-4 pointer-events-auto">
        
        {/* Analysis Parameters Panel */}
        <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-4 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-semibold text-base text-[var(--color-on-surface)]">Analysis Parameters</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">ESTIMATED RELEASE WINDOW (UTC)</span>
              <div className="bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded px-3 py-2 flex items-center justify-between text-xs font-mono">
                {incident.originRegion.timeWindow}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">ORIGIN CONFIDENCE STATE</span>
              <div className="flex items-center gap-3 bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded px-3 py-2">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-[var(--color-outline-variant)]" cx="18" cy="18" fill="none" r="16" stroke="currentColor" strokeWidth="3"></circle>
                    <circle className="text-[var(--color-primary)]" cx="18" cy="18" fill="none" r="16" stroke="currentColor" strokeDasharray="100" strokeDashoffset="12" strokeWidth="3"></circle>
                  </svg>
                  <span className="absolute text-[10px] font-bold text-[var(--color-primary)]">High</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--color-on-surface)] font-medium">Radius: {incident.originRegion.radiusKm} km</span>
                  <span className="text-[10px] text-[var(--color-on-surface-variant)]">Hindcast alignment</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Forcing Panel */}
        <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-4 shadow-2xl flex flex-col gap-3">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] pb-2">ENVIRONMENTAL FORCING</h3>
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center bg-[var(--color-surface-low)] px-3 py-2 rounded">
              <span className="text-[var(--color-on-surface-variant)]">Ocean Currents</span>
              <span className="text-[var(--color-on-surface)] text-right">0.3 m/s<br/><span className="text-[10px] text-[var(--color-tertiary)]">240° WSW</span></span>
            </div>
            <div className="flex justify-between items-center bg-[var(--color-surface-low)] px-3 py-2 rounded">
              <span className="text-[var(--color-on-surface-variant)]">Wind Field (ERA5)</span>
              <span className="text-[var(--color-on-surface)] text-right">4.2 m/s<br/><span className="text-[10px] text-[#4ade80]">215° SW</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-full px-6 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-6">
          <div className="flex items-center gap-3 border-r border-[var(--color-outline-variant)] pr-6">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">HINDCAST T-MINUS</span>
            <span className="font-mono text-lg text-[var(--color-primary)] font-bold">-48h</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-64 h-1.5 bg-[var(--color-surface-low)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-tertiary)] w-full relative">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]"></div>
              </div>
            </div>
            <button className="w-10 h-10 bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-[var(--color-surface-lowest)] rounded-full flex items-center justify-center transition-colors">
              <Play className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
