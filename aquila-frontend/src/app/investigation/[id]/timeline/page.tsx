"use client";

import { use } from "react";
import { MapPin, AlertTriangle, Droplet, Satellite, Activity, CheckCircle, ArrowRight, Fullscreen, Flag } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

export default function EvidenceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[radial-gradient(ellipse_at_top,var(--color-surface-container-low),transparent_50%)] overflow-hidden">
      
      {/* Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10">
        <div className="max-w-4xl mx-auto w-full pb-16">
          
          {/* Header Panel */}
          <div className="bg-[var(--color-surface-high)]/80 backdrop-blur border border-[var(--color-outline-variant)] rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-black/20">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-on-surface)] mb-1">Forensic Evidence Log</h1>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Reconstruction of events leading to target prioritization.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 bg-[var(--color-surface-low)] p-4 rounded border border-[var(--color-outline-variant)] w-full md:w-auto">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Incident ID</div>
                <div className="font-mono text-[var(--color-primary)]">{incident.id}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Target</div>
                <div className="text-sm text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
                  {incident.candidates[0].name}
                  <Flag className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Timeframe</div>
                <div className="font-mono text-[var(--color-on-surface)]">2023-10-23</div>
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-2 md:pl-8">
            
            {/* Vertical Line (Spine) */}
            <div className="absolute top-4 bottom-4 left-[96px] md:left-[120px] w-px bg-[var(--color-outline-variant)] hidden sm:block"></div>

            {/* Event: T-minus */ }
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface-variant)] block sm:text-right">T-48h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface-variant)]">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg p-4 hover:border-[var(--color-outline)] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Target enters candidate region</h3>
                  <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded border border-[var(--color-outline-variant)]">Source: AIS</span>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">Target crossed the established geofence boundary corresponding to the primary search matrix.</p>
              </div>
            </div>

            {/* Event: Anomaly */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-error)]/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-error)] block sm:text-right">T-36h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-error)] items-center justify-center z-10 mt-2 text-[var(--color-error)] shadow-[0_0_12px_rgba(255,180,171,0.2)]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-high)] border border-[var(--color-error)]/50 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-error)_4px,var(--color-error)_8px)] opacity-50"></div>
                <div className="flex justify-between items-start mb-2 pl-3">
                  <h3 className="text-base font-semibold text-[var(--color-error)]">AIS anomaly/gap detected</h3>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-error)]/10 text-[var(--color-error)] px-2 py-1 rounded border border-[var(--color-error)]/30 flex items-center gap-1">
                      Criticality: HIGH
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)] pl-3">Transponder signal lost abruptly without navigational justification. Last known trajectory intersects modeled slick origin point.</p>
              </div>
            </div>

            {/* Event: T-24 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface-variant)] block sm:text-right">T-24h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface-variant)]">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg p-4 hover:border-[var(--color-outline)] transition-colors">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Estimated release window begins</h3>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-tertiary-container)] text-[var(--color-tertiary)] px-2 py-1 rounded border border-[var(--color-tertiary)]/50">Hindcast Calculation</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">Backward simulation from detection time indicates release likely commenced within this window. <strong>Confidence state: HIGH</strong> based on prevailing ERA5 wind parameters.</p>
              </div>
            </div>
            
            {/* Event: Detection */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-primary)] block sm:text-right">T-0h</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)] items-center justify-center z-10 mt-2 text-[var(--color-primary)] shadow-[0_0_12px_rgba(84,227,246,0.3)]">
                <Satellite className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-high)] border border-[var(--color-primary)]/50 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]"></div>
                <div className="flex justify-between items-start mb-2 pl-3">
                  <h3 className="text-base font-semibold text-[var(--color-primary)]">Initial SAR Detection</h3>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded border border-[var(--color-primary)]/30 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Confirmed Oil
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)] pl-3 mb-3">Sentinel-1 GRD observation confirms presence of surface anomaly spanning {incident.surfaceAreaKm2} km².</p>
                <div className="ml-3 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded p-2">
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">Coords</span>
                    <span className="font-mono text-xs text-[var(--color-on-surface)]">{incident.centerCoord[1].toFixed(4)}N, {incident.centerCoord[0].toFixed(4)}E</span>
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
