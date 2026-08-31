"use client";

import { use, useState } from "react";
import { Satellite, LineChart, Anchor, SlidersHorizontal, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { SlickLayer, OriginRegionLayer, TrajectoryLayer, GeoJSONLayer } from "@/components/map/layers";
import { mockIncident } from "@/lib/mockData";

function SimulatedSlickLayer({ center }: { center: [number, number] }) {
  // Offset mock polygon to show "simulation"
  const offsetCenter = [center[0] + 0.02, center[1] - 0.01];
  const data = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [offsetCenter[0] - 0.04, offsetCenter[1] - 0.02],
              [offsetCenter[0] - 0.02, offsetCenter[1] + 0.02],
              [offsetCenter[0] + 0.05, offsetCenter[1] + 0.03],
              [offsetCenter[0] + 0.05, offsetCenter[1] - 0.02],
              [offsetCenter[0] - 0.04, offsetCenter[1] - 0.02],
            ],
          ],
        },
      },
    ],
  };

  return (
    <>
      <GeoJSONLayer
        id="simulated-slick-fill"
        data={data as GeoJSON.FeatureCollection}
        type="fill"
        paint={{
          "fill-color": "#8b5cf6",
          "fill-opacity": 0.3,
        }}
      />
      <GeoJSONLayer
        id="simulated-slick-outline"
        data={data as GeoJSON.FeatureCollection}
        type="line"
        paint={{
          "line-color": "#8b5cf6",
          "line-width": 2,
          "line-opacity": 1,
        }}
      />
    </>
  );
}

export default function CounterfactualSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(incident.vesselCandidates[0].mmsi);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest p-2">
      
      {/* Synchronized Map Panels Container */}
      <div className="w-full h-full flex flex-col lg:flex-row gap-2">
        
        {/* Left Map: Observed Slick */}
        <div className="relative flex-1 bg-[#eef4f8] border border-outline-variant rounded-lg overflow-hidden group shadow-sm">
          <MapLibreCanvas center={incident.incident.centerCoord} zoom={10} bearing={0} pitch={0}>
            <SlickLayer center={incident.incident.centerCoord} visible={true} />
          </MapLibreCanvas>
          
          {/* Floating HUD: Left Panel Label */}
          <div className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded shadow-sm pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <Satellite className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider">OBSERVED SLICK</h2>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium">Satellite SAR Detection ({incident.satellite.source})</p>
            <div className="mt-2 flex items-center gap-1.5 bg-error/10 border border-error/20 px-2 py-1 rounded w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              <span className="font-mono text-[9px] font-bold text-error uppercase">ANOMALY DETECTED</span>
            </div>
          </div>
        </div>
        
        {/* Right Map: Predicted Slick */}
        <div className="relative flex-1 bg-[#eef4f8] border border-outline-variant rounded-lg overflow-hidden group shadow-sm">
          <MapLibreCanvas center={incident.incident.centerCoord} zoom={10} bearing={0} pitch={0}>
            <SimulatedSlickLayer center={incident.incident.centerCoord} />
            <TrajectoryLayer origin={incident.originEstimate.center} slick={incident.incident.centerCoord} />
          </MapLibreCanvas>
          
          {/* Floating HUD: Right Panel Label */}
          <div className="absolute top-4 right-4 z-10 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded shadow-sm text-right flex flex-col items-end pointer-events-none">
            <div className="flex items-center gap-2 mb-1 flex-row-reverse">
              <LineChart className="w-5 h-5 text-secondary" />
              <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">SIMULATED SLICK</h2>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium">Counterfactual Forward Simulation</p>
            <div className="mt-2 flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 px-2 py-1 rounded w-fit">
              <span className="font-mono text-[9px] font-bold text-secondary uppercase">MONTE CARLO T+24H</span>
            </div>
          </div>
        </div>
        
        {/* Central Divider Sync Indicator */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-surface-lowest border border-outline-variant rounded-full flex items-center justify-center shadow-sm hidden lg:flex pointer-events-none">
          <ArrowRightLeft className="w-4 h-4 text-on-surface-variant" />
        </div>
        
        {/* Primary Metric Overlay */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur border border-outline-variant px-6 py-4 rounded shadow-md flex flex-col items-center pointer-events-none">
          <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">OBSERVED / SIMULATED OVERLAP SCORE</span>
          <span className="text-3xl text-primary font-bold uppercase tracking-wider">{(incident.simulation.overlapScore * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Bottom HUD Layout: Vessel Selector & Metrics Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col lg:flex-row gap-4 items-end pointer-events-none">
        
        {/* Vessel Selector Card */}
        <div className="w-full lg:w-96 bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm pointer-events-auto flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-low rounded-t">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Candidate Models</h3>
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div className="flex flex-col p-3 gap-2 max-h-[300px] overflow-y-auto bg-surface-container-lowest">
            
            {incident.vesselCandidates.map((c) => {
              const isSelected = selectedMmsi === c.mmsi;
              return (
                <button 
                  key={c.mmsi} 
                  onClick={() => setSelectedMmsi(c.mmsi)}
                  className={`w-full flex justify-between items-center border p-3 rounded text-left active:scale-[0.98] transition-all relative overflow-hidden group ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-outline-variant hover:border-primary/50'}`}
                >
                  <div className="flex flex-col relative z-10">
                    <span className="text-xs text-on-surface font-bold flex items-center gap-2">
                      <Anchor className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} />
                      {c.name}
                    </span>
                    <span className={`font-mono text-[10px] font-medium mt-1 ${isSelected ? 'text-primary/80' : 'text-on-surface-variant'}`}>
                      MMSI: {c.mmsi}
                    </span>
                  </div>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary shadow-sm relative z-10"></span>}
                </button>
              );
            })}

          </div>
        </div>
        
        {/* Validation Metrics */}
        <div className="flex-1 bg-surface/95 backdrop-blur border border-outline-variant rounded shadow-sm pointer-events-auto flex flex-col">
           <div className="flex items-center justify-between border-b border-outline-variant p-3 bg-surface-container-low rounded-t">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Counterfactual Validity Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-surface-container-lowest rounded-b">
            <div className="flex flex-col bg-surface border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">EVIDENCE SCORE</span>
              <span className="font-mono text-lg text-primary font-bold flex items-center gap-2">
                {(incident.lookAlikeAssessment.evidenceScore * 100).toFixed(0)}% <CheckCircle2 className="w-4 h-4 text-primary" />
              </span>
            </div>
            <div className="flex flex-col bg-surface border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">MORPHOLOGY MATCH</span>
              <span className="font-mono text-sm font-bold text-on-surface">Strong Alignment</span>
            </div>
            <div className="flex flex-col bg-surface border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">ENVIRONMENTAL DRAG</span>
              <span className="font-mono text-sm font-bold text-on-surface">Nominal</span>
            </div>
            <div className="flex flex-col bg-surface border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">ATTRIBUTION STATUS</span>
              <span className="font-mono text-[10px] text-tertiary font-bold px-2 py-1 bg-tertiary/10 rounded border border-tertiary/30 w-fit mt-1">
                REQUIRES CORROBORATION
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
