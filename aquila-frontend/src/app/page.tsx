"use client";

import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, MapPin, Clock, Search, Radar } from "lucide-react";

export default function CommandCenterPage() {
  const [showSlick, setShowSlick] = useState(true);

  return (
    <div className="flex-1 h-full relative bg-surface-lowest overflow-hidden flex">
      {/* Map Canvas (Centerpiece) */}
      <div className="flex-1 h-full relative bg-[#eef4f8] overflow-hidden">
        <MapLibreCanvas center={mockIncident.incident.centerCoord} zoom={8}>
          <SlickLayer center={mockIncident.incident.centerCoord} visible={showSlick} />
        </MapLibreCanvas>

        {/* Metrics Bar (Overlay on Map) */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10 pointer-events-auto">
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-error/10 rounded">
              <AlertTriangle className="w-4 h-4 text-error" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">Active Incidents</div>
              <div className="text-lg font-bold text-on-surface">1</div>
            </div>
          </div>
          
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-tertiary/10 rounded">
              <AlertTriangle className="w-4 h-4 text-tertiary" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">High Priority</div>
              <div className="text-lg font-bold text-on-surface">1</div>
            </div>
          </div>

          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">Investigations</div>
              <div className="text-lg font-bold text-on-surface">1</div>
            </div>
          </div>

          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-secondary/10 rounded">
              <Radar className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">Tracked Vessels</div>
              <div className="text-lg font-bold text-on-surface">145+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Panel (Overlaid on Desktop) */}
      <div className="absolute top-0 left-0 bottom-0 w-[360px] bg-surface-container-lowest border-r border-outline-variant flex flex-col z-20 shadow-sm pointer-events-auto">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Active Incidents</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Link href={`/investigation/${mockIncident.id}`} className="block">
            <div className="bg-surface border border-outline-variant rounded p-3 hover:bg-surface-container-high transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-sm text-primary font-bold">{mockIncident.id}</span>
                <span className="px-2 py-0.5 bg-error/10 text-error font-mono text-[10px] rounded uppercase tracking-wider border border-error/20 font-bold">
                  {mockIncident.priority}
                </span>
              </div>
              <h3 className="text-sm text-on-surface font-medium mb-2">Major Oil Slick Detected</h3>
              <div className="flex flex-col gap-1 font-mono text-[11px] text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> 
                  Gulf of Oman ({mockIncident.incident.centerCoord[1].toFixed(2)}°N, {mockIncident.incident.centerCoord[0].toFixed(2)}°E)
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> 
                  {new Date(mockIncident.incident.initialDetectionTime).toISOString().slice(11, 16)} UTC (Active)
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Right Panel (Intelligence Feed) */}
      <div className="absolute top-0 right-0 bottom-0 w-[420px] bg-surface-container-lowest border-l border-outline-variant flex flex-col z-20 shadow-sm pointer-events-auto">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Intelligence Feed</h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:bg-gradient-to-b before:from-outline-variant before:via-outline-variant before:to-transparent">
            
            {/* Feed Item */}
            <div className="relative">
              <div className="absolute -left-7 mt-1.5 h-3 w-3 rounded-full bg-surface border-2 border-primary"></div>
              <div className="bg-surface border border-outline-variant rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[10px] text-primary uppercase tracking-wider">SAR Detection</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">Just now</span>
                </div>
                <p className="text-sm text-on-surface mb-2">New surface anomaly detected via Sentinel-1 pass.</p>
                <div className="bg-surface-container-low border border-outline-variant rounded p-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-mono text-[9px] text-on-surface-variant uppercase">Confidence</div>
                    <div className="font-mono text-xs text-on-surface">{mockIncident.lookAlikeAssessment.confidence}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-on-surface-variant uppercase">Area</div>
                    <div className="font-mono text-xs text-on-surface">{mockIncident.slick.surfaceAreaKm2} sq km</div>
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
