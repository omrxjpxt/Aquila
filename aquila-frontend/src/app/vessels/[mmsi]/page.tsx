"use client";

import { use } from "react";
import { mockVessels } from "@/lib/mockData";
import Link from "next/link";
import { ArrowLeft, Ship, Navigation, MapPin, Radio, Activity, ShieldAlert } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { GeoJSONLayer } from "@/components/map/layers";

export default function VesselDetailPage({ params }: { params: Promise<{ mmsi: string }> }) {
  const { mmsi } = use(params);
  const vessel = mockVessels.find(v => v.mmsi === mmsi) || mockVessels[0];

  // We are creating a simple track layer from the trackHistory
  const hasHistory = vessel.mmsi === "477123900" || vessel.mmsi === "538007412" || vessel.mmsi === "636092145";
  const trackLine = {
    type: "Feature",
    geometry: {
      type: "LineString",
      // Use mock track or a generated one based on last known pos
      coordinates: hasHistory 
        ? [ [vessel.lastKnownPosition[0]-1, vessel.lastKnownPosition[1]+0.5], vessel.lastKnownPosition ]
        : [ [vessel.lastKnownPosition[0]-0.5, vessel.lastKnownPosition[1]-0.2], vessel.lastKnownPosition ]
    },
    properties: {}
  };

  const pointGeoJSON = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: vessel.lastKnownPosition
    },
    properties: {}
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden flex-col bg-surface">
      <div className="h-14 border-b border-outline-variant bg-surface-container-lowest flex items-center px-4 shrink-0 shadow-sm z-10">
        <Link href="/vessels" className="p-2 mr-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="h-4 w-px bg-outline-variant mx-2"></div>
        <Ship className="w-4 h-4 text-primary mr-2" />
        <h1 className="text-sm font-bold text-on-surface uppercase tracking-wider">{vessel.name}</h1>
        <span className="ml-3 font-mono text-[10px] text-on-surface-variant bg-surface px-2 py-0.5 rounded border border-outline-variant">
          MMSI: {vessel.mmsi}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Info Panel */}
        <aside className="w-[400px] h-full flex flex-col border-r border-outline-variant bg-surface-lowest shrink-0 z-10 overflow-y-auto">
          
          <div className="p-6 border-b border-outline-variant">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-2xl font-bold text-primary tracking-tight mb-1">{vessel.name}</div>
                <div className="text-sm font-medium text-on-surface-variant flex items-center gap-2">
                  <span>{vessel.type}</span>
                  <span>•</span>
                  <span className="font-mono">{vessel.flag}</span>
                </div>
              </div>
              <div className="w-12 h-8 bg-surface-container-high border border-outline-variant rounded flex items-center justify-center font-mono text-xs font-bold shadow-sm">
                {vessel.flag}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface border border-outline-variant p-3 rounded">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Status</div>
                <div className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${vessel.status === 'UNDERWAY' ? 'bg-success' : 'bg-outline'}`}></span>
                  {vessel.status}
                </div>
              </div>
              <div className="bg-surface border border-outline-variant p-3 rounded">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Destination</div>
                <div className="font-bold text-sm text-on-surface truncate" title={vessel.destination}>{vessel.destination}</div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-4 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              Risk Profile & Involvement
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface">Overall Risk Score</span>
                {vessel.riskScore === 'HIGH' ? (
                  <span className="px-2 py-1 bg-error/10 text-error font-bold text-[10px] rounded uppercase tracking-widest border border-error/20">High</span>
                ) : (
                  <span className="px-2 py-1 bg-success/10 text-success font-bold text-[10px] rounded uppercase tracking-widest border border-success/20">Low</span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface">Active Investigations</span>
                <span className="font-mono text-sm font-bold text-on-surface">{vessel.activeInvestigations}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface">Historical AIS Gaps</span>
                <span className="font-mono text-sm font-bold text-on-surface">{vessel.aisGapCount}</span>
              </div>

              {vessel.activeInvestigations > 0 && (
                <div className="mt-4 p-3 bg-error/5 border border-error/20 rounded">
                  <div className="text-[10px] font-bold text-error uppercase tracking-widest mb-2">Related Incidents</div>
                  <Link href="/investigation/INC-AQ-001" className="text-sm font-mono text-primary font-bold hover:underline">
                    INC-AQ-001
                  </Link>
                  <div className="text-xs text-on-surface-variant mt-1">Currently ranked as high-probability candidate in active spill investigation.</div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Vessel Particulars
            </h3>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">MMSI</div>
                <div className="font-mono text-sm text-on-surface">{vessel.mmsi}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">IMO Number</div>
                <div className="font-mono text-sm text-on-surface">{vessel.imo}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Gross Tonnage</div>
                <div className="font-mono text-sm text-on-surface">{vessel.grossTonnage.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Deadweight</div>
                <div className="font-mono text-sm text-on-surface">{vessel.deadweight.toLocaleString()} t</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Dimensions</div>
                <div className="font-mono text-sm text-on-surface">{vessel.lengthM}m × {vessel.beamM}m</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Year Built</div>
                <div className="font-mono text-sm text-on-surface">{vessel.yearBuilt}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Map Panel */}
        <main className="flex-1 relative bg-[#eef4f8] flex flex-col">
          <div className="h-16 bg-surface/90 backdrop-blur absolute top-4 left-4 right-4 z-10 rounded border border-outline-variant shadow-sm flex items-center px-6 gap-8">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Last Signal</div>
                <div className="font-mono text-sm font-bold text-on-surface">
                  {new Date(vessel.lastKnownTime).toISOString().slice(0, 16).replace('T', ' ')}Z
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Heading / Speed</div>
                <div className="font-mono text-sm font-bold text-on-surface">
                  {vessel.heading}° / {vessel.speed} kn
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Coordinates</div>
                <div className="font-mono text-sm font-bold text-on-surface">
                  {vessel.lastKnownPosition[1].toFixed(4)}°N, {vessel.lastKnownPosition[0].toFixed(4)}°E
                </div>
              </div>
            </div>
          </div>

          <MapLibreCanvas center={vessel.lastKnownPosition} zoom={7}>
            <GeoJSONLayer
              id="vessel-track-hist"
              data={trackLine as GeoJSON.Feature}
              type="line"
              paint={{
                "line-color": "#00647C",
                "line-width": 2,
                "line-opacity": 0.6,
                "line-dasharray": [2, 2]
              }}
            />
            <GeoJSONLayer
              id="vessel-pos"
              data={pointGeoJSON as GeoJSON.Feature}
              type="circle"
              paint={{
                "circle-color": "#00647C",
                "circle-radius": 8,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff"
              }}
            />
          </MapLibreCanvas>
        </main>
      </div>
    </div>
  );
}
