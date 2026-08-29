"use client";

import { Plus, Minus, Layers, Crosshair, Radar, AlertTriangle, Ship, Activity, Settings, Filter, ChevronRight } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import Link from "next/link";

export default function CommandCenterPage() {
  return (
    <div className="flex-grow flex flex-col relative h-full bg-[var(--color-surface-container-lowest)] overflow-hidden">
      
      {/* Main Content Area */}
      <main className="flex-grow relative overflow-hidden flex w-full h-full">
        
        {/* Map Container */}
        <div className="flex-grow relative h-full bg-[var(--color-surface-container-lowest)] overflow-hidden">
          
          <MapLibreCanvas center={[61.3, 15.2]} zoom={4} />
          
          {/* Grid overlay for technical feel */}
          <div className="absolute inset-0 opacity-10 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(rgba(206, 229, 253, 0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,21,37,0.6)_100%)] pointer-events-none z-10"></div>
          
          {/* Floating Overlays Container (Left/Bottom) */}
          <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between z-20">
            
            {/* Top Section: System Health Indicator Bar */}
            <div className="flex gap-4 pointer-events-auto bg-[var(--color-surface-low)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded p-3 font-mono text-[11px] uppercase items-center w-fit shadow-md">
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">Active Incidents</span>
                <span className="text-[var(--color-error)] font-bold text-sm">8</span>
              </div>
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">High Priority</span>
                <span className="text-[var(--color-tertiary)] font-bold text-sm">3</span>
              </div>
              <div className="flex items-center gap-3 px-4 border-r border-[var(--color-outline-variant)]">
                <span className="text-[var(--color-on-surface-variant)]">Active Investigations</span>
                <span className="text-[var(--color-primary)] font-bold text-sm">12</span>
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
              <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-primary)] rounded flex items-center justify-center text-[var(--color-primary)] transition-colors shadow-sm relative group">
                <Layers className="w-4 h-4" />
                <span className="opacity-0 group-hover:opacity-100 absolute right-full mr-2 bg-[var(--color-surface-high)] px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase whitespace-nowrap pointer-events-none transition-opacity z-50">Map Layers</span>
              </button>
              <button className="w-8 h-8 bg-[var(--color-surface-lowest)]/90 backdrop-blur border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
            
            {/* Lower Section: Health & Feed */}
            <div className="flex gap-4 pointer-events-auto w-full max-w-[800px]">
              
              {/* Activity Feed */}
              <div className="flex-grow bg-[var(--color-surface-low)]/95 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg flex flex-col overflow-hidden h-48 shadow-lg">
                <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)] uppercase">Intelligence Feed</h3>
                  <button className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] hover:text-[var(--color-primary-fixed)] uppercase">VIEW ALL</button>
                </div>
                <div className="p-2 overflow-y-auto flex flex-col gap-1 flex-grow">
                  <div className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-primary)]">
                    <Radar className="w-4 h-4 text-[var(--color-primary)] mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-[12px] text-[var(--color-on-surface)] leading-tight mb-1">SAR pass completed: Region <span className="font-mono text-[var(--color-primary-fixed)]">AS-09</span></p>
                      <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">10:42Z</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-error)]">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-error)] mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-[12px] text-[var(--color-on-surface)] leading-tight mb-1">Poly-confidence upgraded to <span className="text-[var(--color-error)] font-mono">92%</span></p>
                      <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">10:15Z</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-highest)] rounded cursor-pointer transition-colors border-l-2 border-[var(--color-secondary)]">
                    <Ship className="w-4 h-4 text-[var(--color-secondary)] mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-[12px] text-[var(--color-on-surface)] leading-tight mb-1">Vessel <span className="font-mono text-[var(--color-secondary)]">MMSI: 477123900</span> altered course</p>
                      <p className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">09:50Z</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* System Health */}
              <div className="w-[300px] flex-shrink-0 bg-[var(--color-surface-low)]/95 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg flex flex-col overflow-hidden h-48 shadow-lg">
                <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50">
                  <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)] uppercase">Sensor Telemetry</h3>
                </div>
                <div className="p-4 flex flex-col gap-4 flex-grow justify-center">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">Sentinel-1 (SAR)</span>
                      <span className="font-mono text-[11px] text-[var(--color-primary)]">SYNCED</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-highest)] h-1 rounded-sm overflow-hidden">
                      <div className="bg-[var(--color-primary)] h-full w-[100%] shadow-[0_0_8px_rgba(84,227,246,0.6)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">AIS Stream</span>
                      <span className="font-mono text-[11px] text-[var(--color-primary)]">LIVE</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-highest)] h-1 rounded-sm overflow-hidden">
                      <div className="bg-[var(--color-primary)] h-full w-[100%] shadow-[0_0_8px_rgba(84,227,246,0.6)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">Optical Imagery</span>
                      <span className="font-mono text-[11px] text-[var(--color-tertiary)]">LATENCY</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-highest)] h-1 rounded-sm overflow-hidden">
                      <div className="bg-[var(--color-tertiary)] h-full w-[60%]"></div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Right Panel: Active Incidents (Fixed Right) */}
        <aside className="w-[360px] bg-[var(--color-surface-low)] h-full border-l border-[var(--color-outline-variant)] flex flex-col flex-shrink-0 z-20 pointer-events-auto relative">
          
          {/* Panel Header */}
          <div className="px-4 py-4 border-b border-[var(--color-outline-variant)] flex justify-between items-center bg-[var(--color-surface)]/30">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full h-2 w-2 bg-[var(--color-error)] shadow-[0_0_6px_rgba(255,180,171,0.8)]"></span>
              <h2 className="text-[12px] font-bold tracking-widest text-[var(--color-on-surface)] m-0 uppercase">Active Incidents</h2>
            </div>
            <button className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          {/* Incident List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            
            {/* Card 1 (Selected/Highlighted State) */}
            <Link href="/investigation/AQ-9942-B" className="block border border-[var(--color-outline)] bg-[var(--color-surface-highest)]/50 p-4 rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors relative overflow-hidden group shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-error)]"></div>
              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[var(--color-on-surface)] font-bold text-sm tracking-wider">INC-AQ-001</span>
                </div>
                <span className="border border-[var(--color-error)] text-[var(--color-error)] px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider">Critical</span>
              </div>
              <div className="pl-2 grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Coordinates</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">15.2N, 61.3E</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Logged (UTC)</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">14 AUG 08:30Z</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Confidence</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[12px] text-[var(--color-error)] font-medium">94% (SAR)</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Status</span>
                  <span className="font-mono text-[12px] text-[var(--color-primary)]">Investigating</span>
                </div>
              </div>
              <div className="pl-2 pt-3 border-t border-[var(--color-outline-variant)]/50 flex justify-between items-center">
                <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">Subjects: 4 Vessels</span>
                <button className="border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] px-3 py-1.5 rounded text-[10px] font-bold tracking-widest hover:bg-[var(--color-surface-highest)] transition-colors hover:border-[var(--color-outline)] uppercase">View Details</button>
              </div>
            </Link>
            
            {/* Card 2 */}
            <div className="block border border-[var(--color-outline-variant)] bg-[var(--color-surface-lowest)] p-4 rounded-lg cursor-pointer hover:border-[var(--color-outline)] hover:bg-[var(--color-surface)]/30 transition-all relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-tertiary)]"></div>
              <div className="flex justify-between items-start mb-4 pl-2">
                <span className="font-mono text-[var(--color-on-surface)] text-sm tracking-wider">INC-AQ-002</span>
                <span className="border border-[var(--color-tertiary)] text-[var(--color-tertiary)] px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider">Elevated</span>
              </div>
              <div className="pl-2 grid grid-cols-2 gap-x-4 gap-y-4 mb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Coordinates</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">03.1N, 100.8E</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Logged (UTC)</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">14 AUG 06:15Z</span>
                </div>
              </div>
              <div className="pl-2 flex flex-col gap-1 mt-2">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Status</span>
                <span className="font-mono text-[12px] text-[var(--color-on-surface-variant)]">Pending Analysis</span>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="block border border-[var(--color-outline-variant)] bg-[var(--color-surface-lowest)] p-4 rounded-lg cursor-pointer hover:border-[var(--color-outline)] hover:bg-[var(--color-surface)]/30 transition-all relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-tertiary)]"></div>
              <div className="flex justify-between items-start mb-4 pl-2">
                <span className="font-mono text-[var(--color-on-surface)] text-sm tracking-wider">INC-AQ-003</span>
                <span className="border border-[var(--color-tertiary)] text-[var(--color-tertiary)] px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider">Elevated</span>
              </div>
              <div className="pl-2 grid grid-cols-2 gap-x-4 gap-y-4 mb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Coordinates</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">25.4N, 89.2W</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Logged (UTC)</span>
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)]">13 AUG 22:40Z</span>
                </div>
              </div>
              <div className="pl-2 flex flex-col gap-1 mt-2">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Status</span>
                <span className="font-mono text-[12px] text-[var(--color-on-surface-variant)]">Awaiting AIS</span>
              </div>
            </div>
            
          </div>
        </aside>
      </main>
    </div>
  );
}
