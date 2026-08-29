"use client";

import { use } from "react";
import { Activity, CheckCircle2, MinusCircle, AlertTriangle, Info, Plus, Minus, Layers } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function SlickAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-background p-4 gap-4">
      {/* Left: SAR Scene Layer */}
      <div className="flex-1 relative rounded-lg border border-[var(--color-outline-variant)] overflow-hidden group">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA8badjrnvi0gtr7zNhRbyOXEpqMUakQyXOt7VNllgiqEMMSAhFD9UR3Y-zXN55fEINNAuDcNJGYBh0Z0izZ1kBtK7yNmV3F1gMvXl5fO6H4M-zV1izk0K-1iq1oxKWmvwiP8ewlA3rbtOay0Y0q5pvId5x5-oAhhDvU0Std85yMZr0JuBdYeWAHtSuf_AFBIWdSOyV043W4c4bFFG-K8orbOAfaLWmw0AnCbfRLW4892MP1xrs8RFKnQ')" }}
        >
          <div className="absolute inset-0 bg-[var(--color-background)]/30 mix-blend-multiply"></div>
        </div>
        
        {/* Radar Scan Effect */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(180deg,rgba(84,227,246,0)_0%,rgba(84,227,246,0.1)_50%,rgba(84,227,246,0)_100%)] bg-[length:100%_200%] animate-[scan_4s_linear_infinite] pointer-events-none"></div>

        {/* Anomaly Polygon */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" preserveAspectRatio="none" viewBox="0 0 1000 1000">
          <path className="animate-pulse" d="M 300 400 C 400 350, 500 450, 600 500 C 650 520, 700 600, 680 650 C 650 700, 500 750, 450 700 C 400 650, 200 500, 300 400 Z" fill="none" stroke="var(--color-error)" strokeDasharray="10 5" strokeWidth="3"></path>
          <circle cx="500" cy="550" fill="none" r="15" stroke="var(--color-error)" strokeWidth="2"></circle>
          <line stroke="var(--color-error)" strokeWidth="2" x1="480" x2="520" y1="550" y2="550"></line>
          <line stroke="var(--color-error)" strokeWidth="2" x1="500" x2="500" y1="530" y2="570"></line>
        </svg>

        {/* HUD Elements */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] px-3 py-1.5 rounded flex items-center gap-2">
            <span className="font-mono text-[var(--color-on-surface)] text-xs">Sensor: Sentinel-1</span>
          </div>
          <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] px-3 py-1.5 rounded flex items-center gap-2">
            <span className="font-mono text-[var(--color-on-surface)] text-xs">Time: 2023-10-27T08:14:32Z</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] p-3 rounded flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-error)]">ANOMALY CENTER</span>
          </div>
          <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">LAT: 25.4312° N</span>
          <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">LON: -79.8091° W</span>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors">
            <Minus className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] rounded flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors mt-2">
            <Layers className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right: Analytical Assessment Panel */}
      <div className="w-[450px] bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg flex flex-col h-full shadow-xl z-10">
        <div className="p-4 border-b border-[var(--color-outline-variant)] flex items-center gap-3">
          <Activity className="w-6 h-6 text-[var(--color-primary)]" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">Analytical Assessment</h2>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">Automated Intelligence Report</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Top Level Scores */}
          <div className="flex gap-4">
            <div className="flex-1 bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-error)]"></div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] block mb-2">OIL LIKELIHOOD</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-[var(--color-error)]">91</span>
                <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">/100</span>
              </div>
              <div className="inline-block bg-[var(--color-error)]/10 px-2 py-1 rounded text-[var(--color-error)] font-mono text-[11px]">HIGH CONFIDENCE</div>
            </div>
            
            <div className="flex-1 bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary-container)]"></div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] block mb-2">LOOK-ALIKE RISK</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-[var(--color-primary-container)]">09</span>
                <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">/100</span>
              </div>
              <div className="inline-block bg-[var(--color-primary-container)]/10 px-2 py-1 rounded text-[var(--color-primary-container)] font-mono text-[11px]">LOW PROBABILITY</div>
            </div>
          </div>

          {/* Evidence Checklist */}
          <div>
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] pb-2 mb-4">EVIDENCE CHECKLIST</h3>
            <div className="flex flex-col gap-3">
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-3 pl-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4ade80]"></div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-[var(--color-on-surface)]">SAR Morphology</span>
                  <span className="text-[10px] font-bold tracking-widest text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded">SUPPORTING</span>
                </div>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-relaxed">High contrast dampening observed characteristic of thick emulsions.</p>
              </div>
              
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-3 pl-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-outline)]"></div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-[var(--color-on-surface)]">Temporal Persistence</span>
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-outline)] bg-[var(--color-outline)]/20 px-1.5 py-0.5 rounded">NEUTRAL</span>
                </div>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-relaxed">Present in consecutive passes, but trajectory uncertain due to current shear.</p>
              </div>
              
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-3 pl-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f87171]"></div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-[var(--color-on-surface)]">Optical Confirmation</span>
                  <span className="text-[10px] font-bold tracking-widest text-[#f87171] bg-[#f87171]/10 px-1.5 py-0.5 rounded">CONTRADICTING</span>
                </div>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-relaxed">Recent multispectral imagery shows high cloud cover; no visual confirmation possible.</p>
              </div>
            </div>
          </div>
          
          {/* Possible Look-Alikes */}
          <div>
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] pb-2 mb-4">POSSIBLE LOOK-ALIKES</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded p-3 flex flex-col justify-between">
                <span className="font-mono text-[12px] text-[var(--color-on-surface)] mb-2">Low-wind pocket</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[var(--color-surface-lowest)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-tertiary-container)] w-[12%]"></div>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-tertiary-container)]">12%</span>
                </div>
              </div>
              <div className="bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded p-3 flex flex-col justify-between">
                <span className="font-mono text-[12px] text-[var(--color-on-surface)] mb-2">Biological slick</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[var(--color-surface-lowest)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-outline)] w-[5%]"></div>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-outline)]">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-low)]">
          <div className="flex items-start gap-2 mb-4 p-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] border-dashed rounded opacity-70">
            <Info className="w-4 h-4 text-[var(--color-outline)] shrink-0" />
            <p className="text-[9px] font-bold tracking-widest text-[var(--color-outline)] leading-tight uppercase">Disclaimer: This assessment is generated by automated heuristics. It requires human analyst verification before escalating to operational intervention protocols.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 bg-transparent border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors font-mono text-xs py-2 rounded">
              REJECT
            </button>
            <button className="flex-1 bg-[var(--color-primary-container)] text-[var(--color-background)] font-mono text-xs py-2 rounded hover:brightness-110 transition-all shadow-[0_0_12px_rgba(40,199,217,0.3)]">
              VERIFY ALIAS
            </button>
          </div>
        </div>
      </div>
      
      {/* Required for the tailwind arbitrary value animation to compile if not present globally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { background-position: 0% -100%; }
          100% { background-position: 0% 200%; }
        }
      `}} />
    </div>
  );
}
