"use client";

import { Satellite, MapPin, Clock, Radar, RadioTower, Waves, Camera, Play, FolderOpen, Target, UploadCloud } from "lucide-react";
import Link from "next/link";
import { mockIncident } from "@/lib/mockData";

export default function NewInvestigationPage() {
  return (
    <div className="w-full h-full overflow-y-auto bg-surface p-6 relative z-0">
      
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-[-1]" style={{ backgroundImage: "radial-gradient(var(--color-outline-variant) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        
        {/* Page Header */}
        <div className="mb-8 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">New Spill Investigation</h2>
          </div>
          <p className="text-sm text-on-surface-variant font-medium max-w-2xl leading-relaxed">Initialize a new geospatial analysis workspace. Upload raw SAR imagery or define geographic parameters to fetch available archival intelligence.</p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start pb-8">
          
          {/* Left Column: Inputs & Definition (Spans 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Dropzone */}
            <div className="border border-dashed border-outline-variant bg-surface-container-lowest hover:bg-primary/5 hover:border-primary transition-all duration-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] group shadow-sm">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors border border-outline-variant group-hover:border-primary/30">
                <UploadCloud className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Upload Satellite Scene</h3>
              <p className="text-[11px] text-on-surface-variant mb-4 font-medium max-w-md">Drag &amp; drop raw SAR (Sentinel-1), Optical (Sentinel-2), or proprietary commercial datasets here.</p>
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant px-3 py-1 border border-outline-variant rounded bg-surface-container-low uppercase">SUPPORTED: .TIFF, .SAFE, .ZIP (MAX 5GB)</span>
            </div>
            
            <div className="flex items-center gap-4 py-2">
              <div className="flex-grow h-px bg-outline-variant"></div>
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase">OR MANUAL ENTRY</span>
              <div className="flex-grow h-px bg-outline-variant"></div>
            </div>

            {/* Manual Coordinate & Time Entry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Spatial Parameters */}
              <div className="bg-surface border border-outline-variant rounded p-4 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-outline-variant to-transparent opacity-50"></div>
                <h4 className="text-[10px] font-bold tracking-widest text-primary mb-4 flex items-center gap-2 uppercase">
                  <MapPin className="w-4 h-4" />
                  SPATIAL PARAMETERS
                </h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">MMSI (TARGET VESSEL)</label>
                    <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant shadow-sm" placeholder="e.g. 311000921" type="text" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">LATITUDE</label>
                      <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant shadow-sm" placeholder="00.000000" type="text" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">LONGITUDE</label>
                      <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant shadow-sm" placeholder="00.000000" type="text" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Temporal Parameters */}
              <div className="bg-surface border border-outline-variant rounded p-4 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-outline-variant to-transparent opacity-50"></div>
                <h4 className="text-[10px] font-bold tracking-widest text-primary mb-4 flex items-center gap-2 uppercase">
                  <Clock className="w-4 h-4" />
                  TEMPORAL PARAMETERS
                </h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">START WINDOW (UTC)</label>
                    <div className="relative">
                      <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm" type="datetime-local" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">END WINDOW (UTC)</label>
                    <div className="relative">
                      <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm" type="datetime-local" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Status & Actions (Spans 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            
            {/* Data Availability Dashboard */}
            <div className="bg-surface border border-outline-variant rounded p-4 flex-grow flex flex-col shadow-sm">
              <h4 className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant pb-2 uppercase">DATA AVAILABILITY ESTIMATE</h4>
              <div className="flex flex-col gap-3 flex-grow">
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <Radar className="w-4 h-4 text-primary" />
                    <span className="font-mono text-[11px] font-bold text-on-surface">Sentinel-1 (SAR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-primary uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <RadioTower className="w-4 h-4 text-primary" />
                    <span className="font-mono text-[11px] font-bold text-on-surface">AIS Telemetry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-primary uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <Waves className="w-4 h-4 text-primary" />
                    <span className="font-mono text-[11px] font-bold text-on-surface">Ocean Current Models</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-primary uppercase">AVAILABLE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant opacity-70">
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-on-surface-variant" />
                    <span className="font-mono text-[11px] font-bold text-on-surface-variant">Optical (S-2/L-8)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-outline-variant uppercase">UNAVAILABLE (CLOUD)</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-outline-variant bg-surface-container-lowest -mx-4 -mb-4 p-4 rounded-b text-[10px] text-on-surface-variant font-mono font-medium">
                <p>Estimates based on nominal orbital passes for the default 72h window around current UTC time. Refine parameters for exact coverage.</p>
              </div>
            </div>

            {/* Actions Stack */}
            <div className="flex flex-col gap-3 mt-auto pt-4">
              <Link href={`/investigation/${mockIncident.id}`} className="w-full bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase py-3.5 rounded hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Play className="w-4 h-4" fill="currentColor" />
                START INVESTIGATION
              </Link>
              <button className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-[10px] font-bold tracking-widest uppercase py-3.5 rounded hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 shadow-sm">
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
