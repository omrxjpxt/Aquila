"use client";

import { use } from "react";
import { MapPin, AlertTriangle, Droplet, Satellite, Activity, CheckCircle, ArrowRight, Fullscreen, Flag } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

export default function EvidenceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#eef4f8] overflow-hidden">
      
      {/* Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10">
        <div className="max-w-4xl mx-auto w-full pb-16">
          
          {/* Header Panel */}
          <div className="bg-surface/90 backdrop-blur border border-outline-variant rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-on-surface mb-1">Forensic Evidence Log</h1>
              <p className="text-[11px] text-on-surface-variant font-medium">Reconstruction of events leading to target prioritization.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 bg-surface-container-low p-4 rounded border border-outline-variant w-full md:w-auto">
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Incident ID</div>
                <div className="font-mono text-primary font-bold text-sm">{incident.id}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Target</div>
                <div className="text-sm text-on-surface font-bold flex items-center gap-2">
                  {incident.vesselCandidates[0].name}
                  <Flag className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Timeframe</div>
                <div className="font-mono text-on-surface text-xs font-bold">2023-10-23</div>
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-2 md:pl-8">
            
            {/* Vertical Line (Spine) */}
            <div className="absolute top-4 bottom-4 left-[96px] md:left-[120px] w-px bg-outline-variant hidden sm:block"></div>

            {/* Event: T-minus */ }
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-on-surface-variant block sm:text-right font-medium text-xs">T-48h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant items-center justify-center z-10 mt-2 text-on-surface-variant">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-surface border border-outline-variant rounded p-4 shadow-sm hover:border-outline transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-on-surface">Target enters candidate region</h3>
                  <span className="text-[9px] font-bold tracking-widest uppercase bg-surface-container-high text-on-surface-variant px-2 py-1 rounded border border-outline-variant">Source: AIS</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">Target crossed the established geofence boundary corresponding to the primary search matrix.</p>
              </div>
            </div>

            {/* Event: Anomaly */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-error block sm:text-right font-bold text-xs">T-36h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-surface border-2 border-error items-center justify-center z-10 mt-2 text-error shadow-sm">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-surface border border-error/30 rounded p-4 relative overflow-hidden shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-error)_4px,var(--color-error)_8px)] opacity-30"></div>
                <div className="flex justify-between items-start mb-2 pl-3">
                  <h3 className="text-sm font-bold text-error">AIS anomaly/gap detected</h3>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase bg-error/10 text-error px-2 py-1 rounded border border-error/20 flex items-center gap-1">
                      Criticality: HIGH
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant pl-3 leading-relaxed font-medium">Transponder signal lost abruptly without navigational justification. Last known trajectory intersects modeled slick origin point.</p>
              </div>
            </div>

            {/* Event: T-24 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-on-surface-variant block sm:text-right font-medium text-xs">T-24h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant items-center justify-center z-10 mt-2 text-on-surface-variant">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-surface border border-outline-variant rounded p-4 shadow-sm hover:border-outline transition-colors">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <h3 className="text-sm font-bold text-on-surface">Estimated release window begins</h3>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase bg-tertiary/10 text-tertiary px-2 py-1 rounded border border-tertiary/20">Hindcast Calculation</span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">Backward simulation from detection time indicates release likely commenced within this window. <strong className="text-on-surface">Confidence state: HIGH</strong> based on prevailing ERA5 wind parameters.</p>
              </div>
            </div>
            
            {/* Event: Detection */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-primary block sm:text-right font-bold text-xs">T-0h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-surface border-2 border-primary items-center justify-center z-10 mt-2 text-primary shadow-sm">
                <Satellite className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-surface border border-primary/30 rounded p-4 relative overflow-hidden shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <div className="flex justify-between items-start mb-2 pl-3">
                  <h3 className="text-sm font-bold text-primary">Initial SAR Detection</h3>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Confirmed Oil
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant pl-3 mb-4 leading-relaxed font-medium">Sentinel-1 GRD observation confirms presence of surface anomaly spanning {incident.slick.surfaceAreaKm2} km².</p>
                <div className="ml-3 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded p-2">
                    <span className="block text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-0.5">Coords</span>
                    <span className="font-mono text-[10px] font-bold text-on-surface">{incident.incident.centerCoord[1].toFixed(4)}N, {incident.incident.centerCoord[0].toFixed(4)}E</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
