"use client";

import { use } from "react";
import { mockVessels } from "@/lib/mockData";
import Link from "next/link";
import { Ship, ArrowLeft, Navigation, MapPin, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";

export default function VesselDetailPage({ params }: { params: Promise<{ mmsi: string }> }) {
  const { mmsi } = use(params);
  
  const vessel = mockVessels.find(v => v.mmsi === mmsi);
  
  if (!vessel) {
    return (
      <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-on-surface mb-2">Vessel Not Found</h2>
          <p className="text-on-surface-variant mb-4">No tracking data available for MMSI {mmsi}</p>
          <Link href="/vessels" className="text-primary hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" /> Back to Fleet Monitoring
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        
        {/* Header */}
        <div className="mb-6">
          <Link href="/vessels" className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Fleet Monitoring
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2 flex items-center gap-3">
                <Ship className="w-8 h-8 text-primary" />
                {vessel.name}
              </h1>
              <div className="flex gap-4 items-center">
                <span className="text-xs font-mono font-medium text-on-surface-variant">MMSI: {vessel.mmsi}</span>
                <span className="text-xs font-mono font-medium text-on-surface-variant">IMO: {vessel.imo}</span>
                <span className="text-xs font-mono font-medium text-on-surface-variant">FLAG: {vessel.flag}</span>
              </div>
            </div>
            {vessel.riskScore === 'HIGH' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-error/10 text-error font-bold text-xs rounded uppercase tracking-widest border border-error/20">
                <AlertTriangle className="w-4 h-4" /> High Risk Target
              </span>
            ) : vessel.riskScore === 'MEDIUM' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-tertiary/10 text-tertiary font-bold text-xs rounded uppercase tracking-widest border border-tertiary/20">
                Medium Risk
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success font-bold text-xs rounded uppercase tracking-widest border border-success/20">
                <ShieldCheck className="w-4 h-4" /> Low Risk
              </span>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Map Area */}
            <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden h-[400px] relative">
              <MapLibreCanvas center={vessel.lastKnownPosition as [number, number]} zoom={10}>
                {/* Just render the canvas without interactive layers for DEMO */}
              </MapLibreCanvas>
              <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 shadow-sm z-10 pointer-events-none">
                <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">LAST POSITION</div>
                <div className="font-mono text-xs text-on-surface font-bold">{vessel.lastKnownPosition[1].toFixed(4)}°N, {vessel.lastKnownPosition[0].toFixed(4)}°E</div>
                <div className="text-[10px] text-on-surface-variant mt-1">{new Date(vessel.lastKnownTime).toISOString().replace('T', ' ').slice(0, 16)}Z</div>
              </div>
            </div>

            {/* Vessel Particulars */}
            <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
              <h3 className="px-6 py-4 border-b border-outline-variant bg-surface-container-low text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Ship className="w-4 h-4" /> Vessel Particulars
              </h3>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Type</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.type}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Flag State</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.flagCountry}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Year Built</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.yearBuilt}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Dimensions</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.lengthM}m × {vessel.beamM}m</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Gross Tonnage</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.grossTonnage.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Deadweight</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.deadweight.toLocaleString()}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Owner / Operator</div>
                  <div className="font-medium text-sm text-on-surface">{vessel.owner} / {vessel.operator}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Voyage Data */}
            <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
              <h3 className="px-5 py-4 border-b border-outline-variant bg-surface-container-low text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Current Voyage
              </h3>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                  <span className="text-xs text-on-surface-variant font-medium">Navigational Status</span>
                  <span className="font-bold text-xs text-on-surface uppercase">{vessel.status}</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                  <span className="text-xs text-on-surface-variant font-medium">Destination</span>
                  <span className="font-bold text-xs text-on-surface">{vessel.destination}</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                  <span className="text-xs text-on-surface-variant font-medium">Speed Over Ground</span>
                  <span className="font-mono text-xs font-bold text-on-surface">{vessel.speed} kn</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs text-on-surface-variant font-medium">True Heading</span>
                  <span className="font-mono text-xs font-bold text-on-surface">{vessel.heading}°</span>
                </div>
              </div>
            </div>

            {/* Alerts & Investigations */}
            <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
              <h3 className="px-5 py-4 border-b border-outline-variant bg-surface-container-low text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> Record
              </h3>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded p-3">
                  <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-on-surface">Active Investigations</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">{vessel.activeInvestigations} ongoing inquiries</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded p-3">
                  <div className="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-on-surface">AIS Anomalies</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">{vessel.aisGapCount} recorded telemetry gaps</div>
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
