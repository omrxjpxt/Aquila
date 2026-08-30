"use client";

import { Plus, Minus, Layers, Crosshair, Radar, AlertTriangle, Ship, Activity, Settings, Filter, ChevronRight } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import Link from "next/link";
import { useState } from "react";

export default function CommandCenterPage() {
  const [showSlick, setShowSlick] = useState(true);

  return (
    <div className="flex-grow flex flex-col relative h-full bg-[var(--color-surface-container-lowest)] overflow-hidden">
      
      {/* Main Content Area */}
      <main className="flex-grow relative overflow-hidden flex w-full h-full">
        
        {/* Map Container */}
        <div className="flex-grow relative h-full bg-[var(--color-surface-container-lowest)] overflow-hidden">
          
          <MapLibreCanvas center={mockIncident.centerCoord} zoom={8}>
            <SlickLayer center={mockIncident.centerCoord} visible={showSlick} />
          </MapLibreCanvas>
          
          {/* Floating Overlays Container (Left/Bottom) */}
          <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between z-20">
            
            {/* Top Section: System Health Indicator Bar */}
            <div className="flex gap-4 pointer-events-auto bg-[var(--color-surface-container-low)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded p-3 font-mono text-[11px] uppercase items-center w-fit shadow-md">
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">Active Incidents</span>
                <span className="text-[var(--color-error)] font-bold text-sm">1</span>
              </div>
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">High Priority</span>
                <span className="text-[var(--color-error)] font-bold text-sm">1</span>
              </div>
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">Active Investigations</span>
                <span className="text-[var(--color-primary)] font-bold text-sm">1</span>
              </div>
              <div className="flex items-center gap-3 px-4">
                <span className="text-[var(--color-on-surface-variant)]">Vessels Tracked (24H)</span>
                <span className="text-[var(--color-secondary)] font-bold text-sm">145</span>
              </div>
            </div>
            
            {/* Map Controls (Floating Top Right relative to map) */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
              <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
                <Minus className="w-4 h-4" />
              </button>
              <div className="h-px w-full bg-[var(--color-outline-variant)] my-1"></div>
              <button 
                onClick={() => setShowSlick(!showSlick)}
                className={`w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border rounded flex items-center justify-center transition-colors shadow-sm ${showSlick ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'}`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
            
            {/* Lower Section: Health & Feed */}
            <div className="flex gap-4 pointer-events-auto w-full max-w-[900px]">
              
              {/* Active Investigations */}
              <div className="flex-grow bg-[var(--color-surface-container-low)]/95 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg flex flex-col overflow-hidden h-48 shadow-lg">
                <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)] uppercase">Active Investigations</h3>
                </div>
                <div className="p-2 overflow-y-auto flex flex-col gap-1 flex-grow">
                  <Link href={`/investigation/${mockIncident.id}`} className="flex items-center justify-between p-3 hover:bg-[var(--color-surface-container-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-error)]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-[var(--color-on-surface)]">{mockIncident.id}</span>
                        <span className="px-1.5 py-0.5 bg-[var(--color-error)]/10 text-[var(--color-error)] font-mono text-[9px] font-bold rounded border border-[var(--color-error)]/30 tracking-wider">
                          CRITICAL
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">Gulf of Oman • {mockIncident.slickClassification} • {mockIncident.surfaceAreaKm2} km²</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                  </Link>
                </div>
              </div>
              
              {/* Intelligence Feed */}
              <div className="flex-grow bg-[var(--color-surface-container-low)]/95 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg flex flex-col overflow-hidden h-48 shadow-lg">
                <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)] uppercase">Intelligence Feed</h3>
                  <button className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] hover:text-[var(--color-primary-fixed)] uppercase">VIEW ALL</button>
                </div>
                <div className="p-2 overflow-y-auto flex flex-col gap-1 flex-grow">
                  <div className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-container-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-primary)]">
                    <Radar className="w-4 h-4 text-[var(--color-primary)] mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-[12px] text-[var(--color-on-surface)] leading-tight mb-1">SAR pass completed: <span className="font-mono text-[var(--color-primary-fixed)]">S1A_IW_GRDH_1SDV</span></p>
                      <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">10:42Z</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-container-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-error)]">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-error)] mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-[12px] text-[var(--color-on-surface)] leading-tight mb-1">Anomaly detected: <span className="font-mono text-[var(--color-error)]">INC-AQ-001</span> created</p>
                      <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">10:15Z</p>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
