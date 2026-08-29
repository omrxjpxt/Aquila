"use client";

import { Satellite, MapPin, Clock, Radar, RadioTower, Waves, Camera, Play, FolderOpen, Target, UploadCloud } from "lucide-react";

export default function NewInvestigationPage() {
  return (
    <div className="w-full h-full overflow-y-auto bg-[var(--color-background)] p-6 relative z-0">
      
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[-1]" style={{ backgroundImage: "radial-gradient(var(--color-outline) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        
        {/* Page Header */}
        <div className="mb-8 border-b border-[var(--color-outline-variant)] pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-[var(--color-primary)]" />
            <h2 className="text-2xl font-semibold text-[var(--color-on-surface)]">New Spill Investigation</h2>
          </div>
          <p className="text-sm text-[var(--color-on-surface-variant)] max-w-2xl">Initialize a new geospatial analysis workspace. Upload raw SAR imagery or define geographic parameters to fetch available archival intelligence.</p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start pb-8">
          
          {/* Left Column: Inputs & Definition (Spans 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Dropzone */}
            <div className="border-2 border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/50 hover:bg-[var(--color-surface-low)] hover:border-[var(--color-primary)] transition-all duration-300 rounded p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] group">
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface-variant)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                <UploadCloud className="w-8 h-8 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)] mb-2">Upload Satellite Scene</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Drag &amp; drop raw SAR (Sentinel-1), Optical (Sentinel-2), or proprietary commercial datasets here.</p>
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-outline)] px-3 py-1 border border-[var(--color-outline-variant)] rounded uppercase">SUPPORTED: .TIFF, .SAFE, .ZIP (MAX 5GB)</span>
            </div>
            
            <div className="flex items-center gap-4 py-2">
              <div className="flex-grow h-px bg-[var(--color-outline-variant)]"></div>
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">OR MANUAL ENTRY</span>
              <div className="flex-grow h-px bg-[var(--color-outline-variant)]"></div>
            </div>

            {/* Manual Coordinate & Time Entry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Spatial Parameters */}
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-outline-variant)] to-transparent opacity-50"></div>
                <h4 className="text-[11px] font-bold tracking-widest text-[var(--color-primary)] mb-4 flex items-center gap-2 uppercase">
                  <MapPin className="w-4 h-4" />
                  SPATIAL PARAMETERS
                </h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] block mb-1 uppercase">MMSI (TARGET VESSEL)</label>
                    <input className="w-full bg-[var(--color-background)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-outline)]" placeholder="e.g. 311000921" type="text" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] block mb-1 uppercase">LATITUDE</label>
                      <input className="w-full bg-[var(--color-background)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-outline)]" placeholder="00.000000" type="text" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] block mb-1 uppercase">LONGITUDE</label>
                      <input className="w-full bg-[var(--color-background)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-outline)]" placeholder="00.000000" type="text" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Temporal Parameters */}
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-outline-variant)] to-transparent opacity-50"></div>
                <h4 className="text-[11px] font-bold tracking-widest text-[var(--color-primary)] mb-4 flex items-center gap-2 uppercase">
                  <Clock className="w-4 h-4" />
                  TEMPORAL PARAMETERS
                </h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] block mb-1 uppercase">START WINDOW (UTC)</label>
                    <div className="relative">
                      <input className="w-full bg-[var(--color-background)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-90" type="datetime-local" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] block mb-1 uppercase">END WINDOW (UTC)</label>
                    <div className="relative">
                      <input className="w-full bg-[var(--color-background)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-90" type="datetime-local" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Status & Actions (Spans 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            
            {/* Data Availability Dashboard */}
            <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded p-4 flex-grow flex flex-col">
              <h4 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface)] mb-6 border-b border-[var(--color-outline-variant)] pb-2 uppercase">DATA AVAILABILITY ESTIMATE</h4>
              <div className="flex flex-col gap-4 flex-grow">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Radar className="w-4 h-4 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-colors" />
                    <span className="font-mono text-sm text-[var(--color-on-surface)]">Sentinel-1 (SAR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse shadow-[0_0_8px_rgba(40,199,217,0.8)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <RadioTower className="w-4 h-4 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-colors" />
                    <span className="font-mono text-sm text-[var(--color-on-surface)]">AIS Telemetry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse shadow-[0_0_8px_rgba(40,199,217,0.8)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Waves className="w-4 h-4 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-colors" />
                    <span className="font-mono text-sm text-[var(--color-on-surface)]">Ocean Current Models</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse shadow-[0_0_8px_rgba(40,199,217,0.8)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group opacity-60">
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                    <span className="font-mono text-sm text-[var(--color-on-surface-variant)]">Optical (S-2/L-8)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--color-outline)] uppercase">UNAVAILABLE (CLOUD COVER)</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-outline)]"></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-background)] -mx-4 -mb-4 p-4 rounded-b text-[11px] text-[var(--color-on-surface-variant)] font-mono">
                <p className="opacity-70">Estimates based on nominal orbital passes for the default 72h window around current UTC time. Refine parameters for exact coverage.</p>
              </div>
            </div>

            {/* Actions Stack */}
            <div className="flex flex-col gap-3 mt-auto pt-4">
              <button className="w-full bg-[var(--color-primary-container)] text-[var(--color-background)] text-[11px] font-bold tracking-widest uppercase py-4 rounded hover:bg-[var(--color-primary)] transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(40,199,217,0.2)]">
                <Play className="w-4 h-4" fill="currentColor" />
                START INVESTIGATION
              </button>
              <button className="w-full bg-transparent border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-[11px] font-bold tracking-widest uppercase py-3 rounded hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-2">
                <FolderOpen className="w-4 h-4" />
                LOAD HISTORICAL CASE
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
