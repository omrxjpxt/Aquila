"use client";

import { use } from "react";

import { MapPin, AlertTriangle, Droplet, Satellite, Activity, CheckCircle, ArrowRight, Fullscreen, Flag } from "lucide-react";

export default function EvidenceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[radial-gradient(ellipse_at_top,var(--color-surface-low),transparent_50%)] overflow-hidden">
      
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
                <div className="font-mono text-[var(--color-primary)]">{id}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Target</div>
                <div className="text-sm text-[var(--color-on-surface)] font-semibold flex items-center gap-2">
                  Vessel Alpha
                  <Flag className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Timeframe</div>
                <div className="font-mono text-[var(--color-on-surface)]">2023-10-27</div>
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-2 md:pl-8">
            
            {/* Vertical Line (Spine) */}
            <div className="absolute top-4 bottom-4 left-[96px] md:left-[120px] w-px bg-[var(--color-outline-variant)] hidden sm:block"></div>

            {/* Event: 08:52 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface-variant)] block sm:text-right">08:52:00</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface-variant)]">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg p-4 hover:border-[var(--color-outline)] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Vessel Alpha enters candidate region</h3>
                  <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded border border-[var(--color-outline-variant)]">Source: AIS</span>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">Target crossed the established geofence boundary corresponding to the primary search matrix.</p>
              </div>
            </div>

            {/* Event: 09:27 (Anomaly) */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-error)]/5 to-transparent rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-error)] block sm:text-right">09:27:14</span>
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

            {/* Event: 10:03 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface-variant)] block sm:text-right">10:03:00</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface-variant)]">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg p-4 hover:border-[var(--color-outline)] transition-colors">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Estimated release window begins</h3>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded border border-[var(--color-outline-variant)]">Inferred from Drift Model</span>
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30 px-2 py-1 rounded">Confidence 84%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event: 11:32 (Satellite) */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface)] block sm:text-right">11:32:45</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface)]">
                <Satellite className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-high)] border border-[var(--color-outline-variant)] rounded-lg p-0 hover:border-[var(--color-outline)] transition-colors overflow-hidden flex flex-col md:flex-row">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Satellite detects slick</h3>
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded border border-[var(--color-outline-variant)]">Source: SAR Sentinel-1</span>
                  </div>
                  <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Positive identification of anomalous surface characteristics consistent with hydrocarbon discharge.</p>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]">
                      <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Lat/Lon</div>
                      <div className="font-mono text-[var(--color-on-surface)] text-[11px]">45.123N, 12.456W</div>
                    </div>
                    <div className="bg-[var(--color-surface)] p-2 rounded border border-[var(--color-outline-variant)]">
                      <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)] mb-1">Area Extent</div>
                      <div className="font-mono text-[var(--color-on-surface)] text-[11px]">4.2 sq km</div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-[180px] h-32 md:h-auto border-t md:border-t-0 md:border-l border-[var(--color-outline-variant)] relative bg-background">
                  <img 
                    className="w-full h-full object-cover opacity-80 mix-blend-screen" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcTjaM4dv10L49XfgbzMjkjm67_V1cTqIog_BK8uq0gu9eii-vwXHDqRzZgtURaIXmLijpmIFf99b0G1HEz5wrdH_OvnPzFG48oToqKxEN4EhoR_vRQZDMS9oQPBI_fwQODiY1aeQ90CzaysK8k0174pPKAzfuf5F7nEWXBFSG3yJJRkxhTn1slA2Ip64Di4pN4VzRfKcBifQZRStuT8bB7CIMcyfONTGeNm9xOKraVPA0jIApsegfLQ" 
                    alt="SAR Image"
                  />
                  <div className="absolute inset-0 border border-[var(--color-primary)]/20 pointer-events-none"></div>
                  <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 bg-[var(--color-surface)]/80 rounded border border-[var(--color-outline-variant)] backdrop-blur cursor-pointer hover:bg-[var(--color-surface)]">
                    <Fullscreen className="w-3 h-3 text-[var(--color-on-surface)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Event: 12:10 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-8 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-on-surface-variant)] block sm:text-right">12:10:00</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] items-center justify-center z-10 mt-2 text-[var(--color-on-surface-variant)]">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded-lg p-4 hover:border-[var(--color-outline)] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-on-surface)]">Hindcast completed</h3>
                  <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded border border-[var(--color-outline-variant)]">Source: MetOcean Engine</span>
                </div>
                <div className="h-1 w-full bg-[var(--color-surface-variant)] rounded mt-4 overflow-hidden">
                  <div className="h-full bg-[var(--color-secondary)] w-full opacity-50"></div>
                </div>
              </div>
            </div>

            {/* Event: 12:25 (Conclusion) */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 relative">
              <div className="sm:w-[80px] md:w-[100px] flex-shrink-0 pt-3">
                <span className="font-mono text-[var(--color-primary)] block sm:text-right">12:25:33</span>
              </div>
              <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)] items-center justify-center z-10 mt-2 text-[var(--color-primary)] shadow-[0_0_16px_rgba(40,199,217,0.3)]">
                <Flag className="w-4 h-4" />
              </div>
              <div className="flex-grow bg-[#06111F] border border-[var(--color-primary)] rounded-lg p-4 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <h3 className="text-base font-bold text-[var(--color-primary)]">Vessel Alpha ranked highest candidate</h3>
                  <span className="text-[11px] font-bold tracking-widest uppercase bg-[var(--color-primary-container)] text-[var(--color-background)] px-2 py-1 rounded">Source: Attribution Engine</span>
                </div>
                <p className="text-sm text-[var(--color-on-surface)] relative z-10">Spatiotemporal correlation index exceeds confidence threshold. Recommended for immediate secondary review and operational escalation.</p>
                <div className="mt-4 flex justify-end relative z-10">
                  <button className="bg-[var(--color-primary-container)] text-[var(--color-background)] text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded hover:brightness-110 transition-colors flex items-center gap-2">
                    GENERATE DOSSIER
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
