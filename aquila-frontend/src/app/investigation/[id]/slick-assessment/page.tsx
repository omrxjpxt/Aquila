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
    <div className="flex w-full h-full relative overflow-hidden bg-surface-container-lowest p-4 gap-4">
      {/* Left: SAR Scene Layer */}
      <div className="flex-1 relative rounded-lg border border-outline-variant overflow-hidden shadow-sm bg-[#eef4f8]">
        
        <MapLibreCanvas center={incident.incident.centerCoord} zoom={11}>
          <SlickLayer center={incident.incident.centerCoord} visible={true} />
        </MapLibreCanvas>

        {/* HUD Elements (Light mode styled) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-3 py-1.5 rounded flex items-center gap-2 shadow-sm">
            <span className="font-mono text-on-surface text-xs font-medium">Sensor: {incident.satellite.source}</span>
          </div>
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-3 py-1.5 rounded flex items-center gap-2 shadow-sm">
            <span className="font-mono text-on-surface text-xs font-medium">Time: {new Date(incident.satellite.acquisitionTime).toISOString().slice(11, 19)}Z</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded flex flex-col gap-1 pointer-events-none shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-error">OBSERVED SLICK</span>
          </div>
          <span className="font-mono text-xs text-on-surface-variant font-medium">LAT: {incident.incident.centerCoord[1].toFixed(4)}° N</span>
          <span className="font-mono text-xs text-on-surface-variant font-medium">LON: {incident.incident.centerCoord[0].toFixed(4)}° E</span>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
          <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary hover:border-primary transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary hover:border-primary transition-colors shadow-sm">
            <Minus className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 bg-surface/90 backdrop-blur border border-outline-variant rounded flex items-center justify-center text-on-surface hover:text-primary hover:border-primary transition-colors shadow-sm mt-1">
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Analytical Assessment Panel */}
      <div className="w-[420px] bg-surface border border-outline-variant rounded-lg flex flex-col h-full shadow-sm z-10 shrink-0">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Analytical Assessment</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Slick Forensics</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Top Level Scores */}
          <div className="flex gap-4">
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant block mb-2">EVIDENCE SCORE</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-error">{(incident.lookAlikeAssessment.evidenceScore * 100).toFixed(0)}%</span>
              </div>
              <div className="inline-block bg-error/10 px-2 py-1 rounded text-error font-mono text-[10px] font-bold border border-error/20">CONFIDENCE: {incident.lookAlikeAssessment.confidence}</div>
            </div>
            
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant block mb-2">DATA QUALITY</span>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-primary">{incident.satellite.dataQuality}</span>
              </div>
              <div className="inline-block bg-primary/10 px-2 py-1 rounded text-primary font-mono text-[10px] font-bold border border-primary/20">ADEQUATE SNRs</div>
            </div>
          </div>

          {/* Morphological Analysis */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-2 pb-1 border-b border-outline-variant">MORPHOLOGICAL CHARACTERISTICS</h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Area</span>
                <span className="text-on-surface font-bold">{incident.slick.surfaceAreaKm2} km²</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Est. Volume</span>
                <span className="text-on-surface font-bold">{incident.slick.estimatedVolumeM3.toLocaleString()} m³</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Linearity Index</span>
                <span className="text-on-surface font-bold">0.82 (High)</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Edge Gradient</span>
                <span className="text-on-surface font-bold">Sharp</span>
              </div>
            </div>
          </div>

          {/* Environmental Context */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-2 pb-1 border-b border-outline-variant">ENVIRONMENTAL CONTEXT</h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Wind Speed</span>
                <span className="text-on-surface font-bold">{incident.environmentalContext.windSpeedKnots} kts ({incident.environmentalContext.windDirection})</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-lowest p-2 rounded border border-outline-variant">
                <span className="text-on-surface-variant font-medium">Sea State</span>
                <span className="text-on-surface font-bold">{incident.environmentalContext.seaState}</span>
              </div>
            </div>
          </div>
          
          {/* Machine Learning Output */}
          <div className="bg-surface-container-low rounded p-4 border border-outline-variant">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase mb-1">Model Assessment</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mb-3 font-medium">
                  {incident.lookAlikeAssessment.modelAssessment}.
                  Natural biofilm and biogenic look-alikes weakly supported due to sharp edge gradients and high backscatter contrast.
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-mono text-[10px] font-bold">MODEL-INFERRED</span>
                  <span className="px-2 py-1 bg-error/10 text-error border border-error/20 rounded font-mono text-[10px] font-bold uppercase">{incident.slick.classification}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
