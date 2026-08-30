"use client";

import { use } from "react";
import { Activity, CheckCircle2, MinusCircle, AlertTriangle, Info, Plus, Minus, Layers } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";

export default function SlickAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[var(--color-surface-container-lowest)] p-4 gap-4">
      {/* Left: SAR Scene Layer */}
      <div className="flex-1 relative rounded-lg border border-[var(--color-outline-variant)] overflow-hidden group shadow-lg">
        
        <MapLibreCanvas center={incident.centerCoord} zoom={11}>
          <SlickLayer center={incident.centerCoord} visible={true} />
        </MapLibreCanvas>

        {/* Radar Scan Effect */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(180deg,rgba(84,227,246,0)_0%,rgba(84,227,246,0.1)_50%,rgba(84,227,246,0)_100%)] bg-[length:100%_200%] animate-[scan_4s_linear_infinite] pointer-events-none"></div>

        {/* HUD Elements */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] px-3 py-1.5 rounded flex items-center gap-2">
            <span className="font-mono text-[var(--color-on-surface)] text-xs">Sensor: Sentinel-1</span>
          </div>
          <div className="bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] px-3 py-1.5 rounded flex items-center gap-2">
            <span className="font-mono text-[var(--color-on-surface)] text-xs">Time: {incident.initialDetectionTime}</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-[var(--color-surface-high)]/90 backdrop-blur-sm border border-[var(--color-outline-variant)] p-3 rounded flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-error)]">ANOMALY CENTER</span>
          </div>
          <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">LAT: {incident.centerCoord[1].toFixed(4)}° N</span>
          <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">LON: {incident.centerCoord[0].toFixed(4)}° E</span>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
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
      <div className="w-[450px] bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg flex flex-col h-full shadow-xl z-10 shrink-0">
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
              <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] block mb-2">EVIDENCE SCORE</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-[var(--color-error)]">High</span>
              </div>
              <div className="inline-block bg-[var(--color-error)]/10 px-2 py-1 rounded text-[var(--color-error)] font-mono text-[11px]">CONFIDENCE STATE</div>
            </div>
            
            <div className="flex-1 bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary-container)]"></div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] block mb-2">DATA QUALITY</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-[var(--color-primary-container)]">Good</span>
              </div>
              <div className="inline-block bg-[var(--color-primary-container)]/10 px-2 py-1 rounded text-[var(--color-primary-container)] font-mono text-[11px]">ADEQUATE SNRs</div>
            </div>
          </div>

          {/* Morphological Analysis */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-3 pb-1 border-b border-[var(--color-outline-variant)]">MORPHOLOGICAL CHARACTERISTICS</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Area</span>
                <span className="text-[var(--color-on-surface)]">{incident.surfaceAreaKm2} km²</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Est. Volume</span>
                <span className="text-[var(--color-on-surface)]">{incident.estimatedVolumeM3.toLocaleString()} m³</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Linearity Index</span>
                <span className="text-[var(--color-on-surface)]">0.82 (High)</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Edge Gradient</span>
                <span className="text-[var(--color-on-surface)]">Sharp</span>
              </div>
            </div>
          </div>

          {/* Environmental Context */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-3 pb-1 border-b border-[var(--color-outline-variant)]">ENVIRONMENTAL CONTEXT</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Wind Speed</span>
                <span className="text-[var(--color-on-surface)]">6.2 m/s (Favorable)</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]/50">
                <span className="text-[var(--color-on-surface-variant)]">Wave Height</span>
                <span className="text-[var(--color-on-surface)]">1.1 m</span>
              </div>
            </div>
          </div>
          
          {/* Machine Learning Output */}
          <div className="bg-[var(--color-surface-container)] rounded p-4 border border-[var(--color-outline-variant)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Look-Alike Disambiguation</h4>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-3">
                  SVM classifier indicates high alignment with anthropogenic oil characteristics. Natural biofilm and biogenic look-alikes strongly deprecated.
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20 rounded font-mono text-[10px]">OIL_LIKE: CONFIRMED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
