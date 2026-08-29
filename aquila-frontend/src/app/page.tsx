"use client";

import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { HudPanel } from "@/components/layout/HudPanel";
import { AlertCircle, Target, Navigation2, FileText } from "lucide-react";

export default function CommandCenterPage() {
  return (
    <div className="w-full h-full relative">
      <MapLibreCanvas 
        center={[2.5, 42.5]} // Mediterranean Sea proxy
        zoom={4}
      />
      
      <div className="absolute top-6 right-6 w-96 flex flex-col gap-6 z-10 max-h-[calc(100vh-120px)]">
        <HudPanel title="Intelligence Feed" className="h-[400px]">
          <div className="flex flex-col gap-4">
            
            {/* Mock Incident Item */}
            <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-primary-container)]/30 rounded-lg hover:border-[var(--color-primary)] transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                  <span className="text-xs font-mono text-[var(--color-primary)]">INC-8492-MED</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">14:02Z</span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Suspected Discharge</h4>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-3">SAR anomaly detected in Sentinel-1 pass.</p>
              
              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-on-surface-variant)] bg-[var(--color-surface-low)] px-2 py-1 rounded">
                  <Target className="w-3 h-3" /> 0.85 Conf
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-on-surface-variant)] bg-[var(--color-surface-low)] px-2 py-1 rounded">
                  <Navigation2 className="w-3 h-3" /> 12 Candidates
                </div>
              </div>
            </div>

            {/* Mock Report Item */}
            <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-lg hover:border-[var(--color-outline)] transition-colors cursor-pointer opacity-70">
               <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-outline)]"></div>
                  <span className="text-xs font-mono text-[var(--color-on-surface-variant)]">RPT-8491-ATL</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">09:15Z</span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">Attribution Concluded</h4>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Vessel matched with 6-factor evidence.</p>
            </div>
            
          </div>
        </HudPanel>
        
        <HudPanel title="System Status" className="shrink-0">
          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Sentinel-1 Ingestion</span>
                <span className="font-mono text-[var(--color-primary)]">ACTIVE</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-on-surface-variant)]">AIS Stream (Spire)</span>
                <span className="font-mono text-[var(--color-primary)]">SYNCED</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-on-surface-variant)]">OpenDrift GPU Nodes</span>
                <span className="font-mono text-[var(--color-tertiary)]">85% LOAD</span>
             </div>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
