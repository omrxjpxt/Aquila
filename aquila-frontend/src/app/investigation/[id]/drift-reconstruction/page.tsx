"use client";

import { use } from "react";
import { Activity, AlertTriangle, Play, Map, ChevronRight, Settings } from "lucide-react";

export default function DriftReconstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-background">
      {/* Base Map Layer */}
      <div 
        className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen bg-cover bg-center" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA59s8xGmDMez_dzIeGWZ19NH_VCIJEw9Z8NR96yx9TG_gmOPBpQsN44urmgpWw3A4bZBd8jwmtXD4wR78hHN48q-nSbtBOSo0DZTQtxtXvtPHanCgjwM19hvCKgr4V5ajO8oVdsff1tcLDKns9ZqTkK6qqovpD0UOoNd1ugPx6zwnajSAhMG6uXxFA6juwzQG_ZNzCENGMYOK7pI-HeAxbtovD2XSuhsKO4NOVvwzw7D9HpQWPRKxZaw')" }}
      ></div>
      
      {/* Cartesian Grid Overlay */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(#3c494b 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>

      {/* Vector Data Overlay (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1920 1080">
        <defs>
          <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" id="origin-glow" r="50%">
            <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity="0.6"></stop>
            <stop offset="50%" stopColor="var(--color-tertiary)" stopOpacity="0.2"></stop>
            <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity="0"></stop>
          </radialGradient>
          <filter height="140%" id="blur-glow" width="140%" x="-20%" y="-20%">
            <feGaussianBlur result="blur" stdDeviation="8"></feGaussianBlur>
            <feComposite in="SourceGraphic" in2="blur" operator="over"></feComposite>
          </filter>
        </defs>

        {/* PROBABLE ORIGIN */}
        <circle cx="850" cy="490" fill="url(#origin-glow)" r="120"></circle>
        <path d="M780,450 Q850,420 920,470 T860,560 Q790,540 760,490 Z" fill="var(--color-tertiary-container)" opacity="0.2" stroke="var(--color-tertiary)" strokeDasharray="4,4" strokeWidth="1"></path>
        <circle cx="845" cy="485" fill="var(--color-tertiary)" r="4"></circle>
        <circle cx="845" cy="485" fill="none" opacity="0.6" r="12" stroke="var(--color-tertiary)" strokeWidth="1"></circle>

        {/* OBSERVED SLICK */}
        <g transform="translate(1200, 600)">
          <path d="M0,-20 L40,-50 L120,-30 L160,20 L100,60 L20,40 Z" fill="rgba(255, 180, 171, 0.2)" filter="url(#blur-glow)" stroke="var(--color-error)" strokeWidth="2"></path>
          <path d="M20,-20 L100,20 M40,-40 L120,0 M0,0 L80,40" opacity="0.5" stroke="var(--color-error)" strokeWidth="0.5"></path>
        </g>
        
        {/* HINDCAST */}
        <g fill="none" opacity="0.5" stroke="var(--color-secondary)" strokeLinecap="round" strokeWidth="1.5">
          <path d="M1200,600 C1100,580 950,550 850,480" strokeDasharray="10 10"></path>
        </g>
        
        {/* FORECAST */}
        <g fill="none" opacity="0.8" stroke="var(--color-primary)" strokeLinecap="round" strokeWidth="2">
          <path d="M1360,620 C1460,640 1550,700 1650,780" strokeDasharray="10 10"></path>
          <polygon fill="var(--color-primary)" points="1650,780 1635,770 1640,780 1635,790" stroke="none"></polygon>
        </g>
      </svg>

      {/* WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <span className="text-[12vw] font-bold text-[var(--color-surface-high)]/40 tracking-tighter transform -rotate-12 select-none whitespace-nowrap">RECONSTRUCTION</span>
      </div>

      {/* HUD: Top Left - Current Target Info */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
        <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] rounded p-3 shadow-lg flex flex-col gap-1 min-w-[200px]">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">OBSERVED EVENT</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[var(--color-error)] rounded-sm block shadow-[0_0_8px_rgba(255,180,171,0.5)]"></span>
            <span className="font-mono text-[var(--color-on-surface)]">SLICK-ID: α-7892</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--color-outline)] mt-1">LAT: 35.882°N LON: 05.410°W</span>
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
              <div className="bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-[var(--color-tertiary)]">09:00</span>
                <span className="w-8 h-px bg-[var(--color-outline-variant)]"></span>
                <span className="font-mono text-[var(--color-tertiary)]">10:30</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">ORIGIN CONFIDENCE</span>
              <div className="flex items-center gap-3 bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded px-3 py-2">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[var(--color-surface-variant)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-[var(--color-tertiary)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="78, 100" strokeWidth="3"></path>
                  </svg>
                  <span className="absolute font-mono text-[10px] text-[var(--color-tertiary)]">78</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-[var(--color-on-surface)]">MEDIUM-HIGH</span>
                  <span className="text-[11px] text-[var(--color-outline)]">Variance: ±2.4nm</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-[var(--color-surface)]/50 border border-[var(--color-outline-variant)] rounded p-2 flex flex-col">
                <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">MODEL</span>
                <span className="font-mono text-[11px] text-[var(--color-on-surface)] truncate">GNOME V4.1</span>
              </div>
              <div className="bg-[var(--color-surface)]/50 border border-[var(--color-outline-variant)] rounded p-2 flex flex-col">
                <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">WIND DATA</span>
                <span className="font-mono text-[11px] text-[var(--color-on-surface)] truncate">GFS 0.25°</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Forecast Impact Zones Panel */}
        <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-4 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-semibold text-base text-[var(--color-on-surface)]">Forecast Impact</h2>
            </div>
            <span className="px-2 py-0.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded text-[var(--color-primary)] font-mono text-[10px]">T+24h</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="group border border-[var(--color-outline-variant)] rounded p-2.5 bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-colors relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-error)]/80"></div>
              <div className="pl-2 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)] font-semibold">Coastal Sector 7</span>
                  <span className="font-mono text-[11px] text-[var(--color-error)]">ETA: T+18h</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">PROBABILITY</span>
                    <span className="font-mono text-[11px] text-[var(--color-on-surface)]">85%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">TYPE</span>
                    <span className="font-mono text-[11px] text-[var(--color-on-surface)]">Rocky Shore</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="group border border-[var(--color-outline-variant)] rounded p-2.5 bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-colors relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-tertiary)]/80"></div>
              <div className="pl-2 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[12px] text-[var(--color-on-surface)] font-semibold">Marine Sanctuary Alpha</span>
                  <span className="font-mono text-[11px] text-[var(--color-tertiary)]">ETA: T+22h</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">PROBABILITY</span>
                    <span className="font-mono text-[11px] text-[var(--color-on-surface)]">42%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-outline)]">TYPE</span>
                    <span className="font-mono text-[11px] text-[var(--color-on-surface)]">Protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-2 py-2 bg-transparent border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] rounded font-mono text-[11px] transition-colors flex items-center justify-center gap-2">
            <Map className="w-4 h-4" />
            GENERATE IMPACT REPORT
          </button>
        </div>
      </div>

      {/* HUD: Bottom Timeline Scrubber */}
      <div className="absolute bottom-4 left-4 right-[350px] z-20 pointer-events-auto">
        <div className="bg-[var(--color-surface-high)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-4 shadow-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed)] transition-colors">
                <Play className="w-4 h-4" fill="currentColor" />
              </button>
              <span className="font-mono text-[var(--color-on-surface)]"><span className="text-[var(--color-outline)]">TIME:</span> T+04:15:00</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">HINDCAST</span>
              <div className="w-8 h-px bg-[var(--color-secondary)] opacity-50"></div>
              <span className="text-[var(--color-outline)] mx-1">|</span>
              <div className="w-8 h-px bg-[var(--color-primary)] opacity-50"></div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">FORECAST</span>
            </div>
          </div>
          
          <div className="relative w-full h-10 mt-2 flex items-center">
            <input type="range" min="0" max="100" defaultValue="45" className="w-full h-1 bg-[var(--color-surface-low)] rounded appearance-none outline-none accent-[var(--color-primary)] z-20" />
            
            {/* T0 Marker */}
            <div className="absolute left-[33%] top-0 bottom-0 flex flex-col items-center justify-start -ml-[2px] z-10 pointer-events-none">
              <div className="w-[4px] h-3 bg-[var(--color-error)] rounded-sm shadow-[0_0_5px_rgba(255,180,171,0.8)] mt-2.5"></div>
              <span className="font-mono text-[10px] text-[var(--color-error)] font-bold mt-1 bg-[var(--color-surface-high)] px-1 absolute top-5 whitespace-nowrap -ml-4">T0 DETECTION</span>
            </div>
            
            {/* Tick marks */}
            <div className="absolute left-0 right-0 h-full flex justify-between px-4 pointer-events-none opacity-20">
              {[...Array(6)].map((_, i) => (
                 <div key={i} className="w-px h-1 bg-[var(--color-on-surface)] mt-4"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
