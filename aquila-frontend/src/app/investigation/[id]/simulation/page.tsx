"use client";

import { use } from "react";
import { Satellite, LineChart, Anchor, SlidersHorizontal, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function CounterfactualSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[var(--color-surface-container)]">
      
      {/* Main Canvas: Map-Centric Layered View */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-[var(--color-surface-container)] overflow-hidden">
        
        {/* Synchronized Map Panels Container */}
        <div className="w-full h-full flex flex-col lg:flex-row gap-[2px]">
          
          {/* Left Map: Observed Slick */}
          <div className="relative flex-1 bg-[var(--color-surface-dim)] overflow-hidden group">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] group-hover:scale-105" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCRl4L8vvu7uzJekc-ZW7L9-LYb4fQzP-cOdAUgYOLEzEAdixUI4Ssd3Jd5k8Zwpb1KG5KF2DO6kLueXIcDPRJSEl0WrRWX_FeAng_jGBIgYYgPh5QysECG9t9nMyio3OaF5YjK3dXNr701lX53xL6TNr_ii8KMsTKoWSDBvlQ1UmobWeFFFXmkGc_zZQzX4nSnjnGm5ZnuEbF-yzgJHAJRwp9ax6yju1xyb7D4G6llcoJJtKLOZFmrxw')" }}
            ></div>
            <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(rgba(32, 55, 73, 0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            
            {/* Floating HUD: Left Panel Label */}
            <div className="absolute top-4 left-4 z-10 bg-[var(--color-surface-container)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] p-4 rounded-lg shadow-xl">
              <div className="flex items-center gap-3 mb-1">
                <Satellite className="w-6 h-6 text-[var(--color-primary)]" />
                <h2 className="text-xl font-semibold text-[var(--color-primary)] uppercase tracking-wider">OBSERVED SLICK</h2>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Satellite SAR Detection (Sentinel-1)</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse"></span>
                <span className="font-mono text-xs text-[var(--color-error)]">ANOMALY DETECTED</span>
              </div>
            </div>
          </div>
          
          {/* Right Map: Predicted Slick */}
          <div className="relative flex-1 bg-[var(--color-surface-dim)] overflow-hidden group">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] group-hover:scale-105" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC85kkmbU5bsNBp1fxUZKTpj_J0Mf7yZQ_100OVjJ_g5_kvoaqiBaNCOpHvqH_oPtcBdkRQkeWNV8tY3EF_GT43-qFvft2wlnRZQgM7NC9D7M3cDeFPXhL2Kc-W8Di_BNeo9NC2l1GHE79JHKAD6t-DJ7F94AMJsbtQbKZLnH7WvSdRL9EQIoqrgHA6AsNL_5e-2K53qnfhmt6s1biRkuFLlK_4uXuyHwjz2UQibffdGEq02Re4YknDWw')" }}
            ></div>
            <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(rgba(32, 55, 73, 0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            
            {/* Floating HUD: Right Panel Label */}
            <div className="absolute top-4 right-4 z-10 bg-[var(--color-surface-container)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] p-4 rounded-lg shadow-xl text-right flex flex-col items-end">
              <div className="flex items-center gap-3 mb-1 flex-row-reverse">
                <LineChart className="w-6 h-6 text-[#d946ef]" />
                <h2 className="text-xl font-semibold text-[#d946ef] uppercase tracking-wider">SIMULATED SLICK FROM VESSEL A</h2>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Simulation based on <span className="text-[var(--color-on-surface)] font-semibold">Vessel A</span></p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs text-[#e879f9]">MONTE CARLO T+24H</span>
              </div>
            </div>
          </div>
          
          {/* Central Divider Sync Indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-[var(--color-surface-highest)] border border-[var(--color-outline-variant)] rounded-full flex items-center justify-center shadow-md hidden lg:flex">
            <ArrowRightLeft className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          </div>
          
          {/* Primary Metric Overlay */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-[var(--color-surface-highest)]/95 backdrop-blur-xl border border-[var(--color-primary)] p-6 rounded-lg shadow-2xl flex flex-col items-center">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-primary)] uppercase mb-2">OBSERVED / SIMULATED SPATIAL OVERLAP</span>
            <span className="text-[64px] leading-[64px] text-[var(--color-primary)] font-bold drop-shadow-[0_0_16px_rgba(84,227,246,0.4)]">78%</span>
          </div>
        </div>

        {/* Bottom HUD Layout: Vessel Selector & Metrics Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col lg:flex-row gap-4 items-end pointer-events-none">
          
          {/* Vessel Selector Card */}
          <div className="w-full lg:w-80 bg-[var(--color-surface-container)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-5 shadow-2xl pointer-events-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Candidate Models</h3>
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
            </div>
            <div className="flex flex-col gap-2">
              <button className="w-full flex justify-between items-center bg-[#10283A] border border-[var(--color-primary)] p-3 rounded text-left active:scale-[0.98] transition-all relative overflow-hidden group">
                <div className="absolute inset-0 bg-[var(--color-primary)]/5 group-hover:bg-[var(--color-primary)]/10 transition-colors"></div>
                <div className="flex flex-col relative z-10">
                  <span className="text-sm text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-[var(--color-primary)]" />
                    Vessel A
                  </span>
                  <span className="font-mono text-[var(--color-primary)]/70 text-[10px] mt-0.5">MMSI: 477123900</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(84,227,246,0.8)] animate-pulse relative z-10"></span>
              </button>
              
              <button className="w-full flex justify-between items-center bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-3 rounded text-left hover:bg-[var(--color-surface-high)] active:scale-[0.98] transition-all text-[var(--color-on-surface-variant)] group">
                <div className="flex flex-col">
                  <span className="text-sm group-hover:text-[var(--color-on-surface)] transition-colors flex items-center gap-2">
                    <Anchor className="w-4 h-4" />
                    Vessel B
                  </span>
                  <span className="font-mono text-[var(--color-on-surface-variant)]/50 text-[10px] mt-0.5">MMSI: 235084120</span>
                </div>
              </button>
              
              <button className="w-full flex justify-between items-center bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-3 rounded text-left hover:bg-[var(--color-surface-high)] active:scale-[0.98] transition-all text-[var(--color-on-surface-variant)] group">
                <div className="flex flex-col">
                  <span className="text-sm group-hover:text-[var(--color-on-surface)] transition-colors flex items-center gap-2">
                    <Anchor className="w-4 h-4" />
                    Vessel C
                  </span>
                  <span className="font-mono text-[var(--color-on-surface-variant)]/50 text-[10px] mt-0.5">MMSI: 371992000</span>
                </div>
              </button>
            </div>
          </div>

          {/* Metrics Panel */}
          <div className="flex-1 bg-[var(--color-surface-container)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-6 shadow-2xl pointer-events-auto flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[var(--color-outline-variant)] pb-5 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 bg-[var(--color-primary)] rounded-sm"></span>
                  <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Counterfactual Analysis</h3>
                </div>
                <h2 className="text-2xl font-semibold text-[var(--color-on-surface)]">Model vs Reality Synchronization</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Metric 1 */}
              <div className="bg-[#0B1B2A] border border-[var(--color-outline-variant)] p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-primary)]/5 rounded-bl-full"></div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Spatial Overlap</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-on-surface)]">High Match</span>
                  </div>
                  <span className="font-mono text-base text-[var(--color-primary)] font-bold">78.0%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-surface-high)] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[var(--color-primary)] w-[78%]"></div>
                </div>
              </div>
              
              {/* Metric 2 */}
              <div className="bg-[#0B1B2A] border border-[var(--color-outline-variant)] p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-primary)]/5 rounded-bl-full"></div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Shape Similarity</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-on-surface)]">Strong Match</span>
                  </div>
                  <span className="font-mono text-base text-[var(--color-primary)] font-bold">88.9%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-surface-high)] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[var(--color-primary)] w-[88.9%]"></div>
                </div>
              </div>
              
              {/* Metric 3 */}
              <div className="bg-[#0B1B2A] border border-[#d946ef]/30 p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#d946ef]/5 rounded-bl-full"></div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Trajectory Comp.</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#d946ef]" />
                    <span className="text-sm text-[var(--color-on-surface)]">Moderate</span>
                  </div>
                  <span className="font-mono text-base text-[#d946ef] font-bold">64.1%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-surface-high)] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[#d946ef] w-[64.1%]"></div>
                </div>
              </div>
              
              {/* Metric 4 */}
              <div className="bg-[#0B1B2A] border border-[var(--color-outline-variant)] p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-primary)]/5 rounded-bl-full"></div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Temporal Comp.</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-on-surface)]">High Conf.</span>
                  </div>
                  <span className="font-mono text-base text-[var(--color-primary)] font-bold">92.4%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-surface-high)] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[var(--color-primary)] w-[92.4%]"></div>
                </div>
              </div>
              
              {/* Metric 5 */}
              <div className="bg-[#0B1B2A] border border-[var(--color-outline-variant)] p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-primary)]/5 rounded-bl-full"></div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Origin Comp.</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-on-surface)]">High Match</span>
                  </div>
                  <span className="font-mono text-base text-[var(--color-primary)] font-bold">85.2%</span>
                </div>
                <div className="w-full h-1 bg-[var(--color-surface-high)] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[var(--color-primary)] w-[85.2%]"></div>
                </div>
              </div>
              
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
