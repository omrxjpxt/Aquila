"use client";

import { use, useState } from "react";
import { Satellite, LineChart, Anchor, SlidersHorizontal, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer, TrajectoryLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import { GeoJSONLayer } from "@/components/map/layers";

function SimulatedSlickLayer({ center }: { center: [number, number] }) {
  // Offset mock polygon to show "simulation"
  const offsetCenter = [center[0] + 0.02, center[1] - 0.01];
  const data = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [offsetCenter[0] - 0.04, offsetCenter[1] - 0.02],
              [offsetCenter[0] - 0.02, offsetCenter[1] + 0.02],
              [offsetCenter[0] + 0.05, offsetCenter[1] + 0.03],
              [offsetCenter[0] + 0.05, offsetCenter[1] - 0.02],
              [offsetCenter[0] - 0.04, offsetCenter[1] - 0.02],
            ],
          ],
        },
      },
    ],
  };

  return (
    <>
      <GeoJSONLayer
        id="simulated-slick-fill"
        data={data}
        type="fill"
        paint={{
          "fill-color": "#d946ef",
          "fill-opacity": 0.3,
        }}
      />
      <GeoJSONLayer
        id="simulated-slick-outline"
        data={data}
        type="line"
        paint={{
          "line-color": "#e879f9",
          "line-width": 2,
          "line-opacity": 1,
        }}
      />
    </>
  );
}

export default function CounterfactualSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(incident.candidates[0].mmsi);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[var(--color-surface-container-lowest)]">
      
      {/* Main Canvas: Map-Centric Layered View */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-[var(--color-surface-container)] overflow-hidden">
        
        {/* Synchronized Map Panels Container */}
        <div className="w-full h-full flex flex-col lg:flex-row gap-[2px]">
          
          {/* Left Map: Observed Slick */}
          <div className="relative flex-1 bg-[var(--color-surface-dim)] overflow-hidden group">
            <MapLibreCanvas center={incident.centerCoord} zoom={10} bearing={0} pitch={0}>
              <SlickLayer center={incident.centerCoord} visible={true} />
            </MapLibreCanvas>
            
            {/* Floating HUD: Left Panel Label */}
            <div className="absolute top-4 left-4 z-10 bg-[var(--color-surface-container)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] p-4 rounded-lg shadow-xl pointer-events-none">
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
            <MapLibreCanvas center={incident.centerCoord} zoom={10} bearing={0} pitch={0}>
              <SimulatedSlickLayer center={incident.centerCoord} />
              <TrajectoryLayer origin={incident.originRegion.center} slick={incident.centerCoord} />
            </MapLibreCanvas>
            
            {/* Floating HUD: Right Panel Label */}
            <div className="absolute top-4 right-4 z-10 bg-[var(--color-surface-container)]/90 backdrop-blur-md border border-[var(--color-outline-variant)] p-4 rounded-lg shadow-xl text-right flex flex-col items-end pointer-events-none">
              <div className="flex items-center gap-3 mb-1 flex-row-reverse">
                <LineChart className="w-6 h-6 text-[#d946ef]" />
                <h2 className="text-xl font-semibold text-[#d946ef] uppercase tracking-wider">SIMULATED SLICK</h2>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Counterfactual Forward Simulation</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs text-[#e879f9]">MONTE CARLO T+24H</span>
              </div>
            </div>
          </div>
          
          {/* Central Divider Sync Indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-[var(--color-surface-highest)] border border-[var(--color-outline-variant)] rounded-full flex items-center justify-center shadow-md hidden lg:flex pointer-events-none">
            <ArrowRightLeft className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          </div>
          
          {/* Primary Metric Overlay */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-[var(--color-surface-highest)]/95 backdrop-blur-xl border border-[var(--color-primary)] p-6 rounded-lg shadow-2xl flex flex-col items-center pointer-events-none">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-primary)] uppercase mb-2">OBSERVED / SIMULATED OVERLAP SCORE</span>
            <span className="text-[48px] leading-[48px] text-[var(--color-primary)] font-bold drop-shadow-[0_0_16px_rgba(84,227,246,0.4)] uppercase text-center tracking-wider">High</span>
          </div>
        </div>

        {/* Bottom HUD Layout: Vessel Selector & Metrics Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col lg:flex-row gap-4 items-end pointer-events-none">
          
          {/* Vessel Selector Card */}
          <div className="w-full lg:w-96 bg-[var(--color-surface-container)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-5 shadow-2xl pointer-events-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Candidate Models</h3>
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              
              {incident.candidates.map((c) => {
                const isSelected = selectedMmsi === c.mmsi;
                return (
                  <button 
                    key={c.mmsi} 
                    onClick={() => setSelectedMmsi(c.mmsi)}
                    className={`w-full flex justify-between items-center border p-3 rounded text-left active:scale-[0.98] transition-all relative overflow-hidden group ${isSelected ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-[var(--color-surface-low)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50'}`}
                  >
                    <div className="flex flex-col relative z-10">
                      <span className="text-sm text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
                        <Anchor className={`w-4 h-4 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`} />
                        {c.name}
                      </span>
                      <span className={`font-mono text-[10px] mt-0.5 ${isSelected ? 'text-[var(--color-primary)]/70' : 'text-[var(--color-on-surface-variant)]'}`}>
                        MMSI: {c.mmsi}
                      </span>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(84,227,246,0.8)] animate-pulse relative z-10"></span>}
                  </button>
                );
              })}

            </div>
          </div>
          
          {/* Validation Metrics */}
          <div className="flex-1 bg-[var(--color-surface-container)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)] rounded-lg p-5 shadow-2xl pointer-events-auto flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
              <h3 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Counterfactual Validity Analysis</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">EVIDENCE SCORE</span>
                <span className="font-mono text-lg text-[#4ade80] flex items-center gap-2">
                  High <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">MORPHOLOGY MATCH</span>
                <span className="font-mono text-lg text-[var(--color-on-surface)]">Strong Alignment</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">ENVIRONMENTAL DRAG</span>
                <span className="font-mono text-lg text-[var(--color-on-surface)]">Nominal</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">ATTRIBUTION STATUS</span>
                <span className="font-mono text-sm text-[var(--color-error)] font-bold px-2 py-1 bg-[var(--color-error)]/10 rounded border border-[var(--color-error)]/30 w-fit mt-1">
                  HIGHEST-RANKED CANDIDATE
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
