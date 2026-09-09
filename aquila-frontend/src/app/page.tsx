"use client";

import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Clock, Search, Radar, ShieldAlert } from "lucide-react";
import { investigationsApi } from "@/lib/api/investigations";
import { monitoringApi } from "@/lib/api/monitoring";
import { Investigation, MonitoringJob } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { GeoJSONLayer } from "@/components/map/layers";

export default function CommandCenterPage() {
  const { user } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      investigationsApi.listInvestigations(),
      monitoringApi.getJobs(undefined, 10)
    ]).then(([invs, fetchedJobs]) => {
      setInvestigations(invs);
      setJobs(fetchedJobs);
      setIsLoading(false);
    }).catch(console.error);
  }, [user]);

  const activeInvs = investigations.filter(i => i.status !== 'CLOSED');

  const invPoints: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: activeInvs.filter(i => i.anomaly_geometry).map(i => ({
      type: "Feature",
      geometry: i.anomaly_geometry as GeoJSON.Geometry,
      properties: { 
        id: i.id,
        priority: i.priority,
        status: i.status 
      }
    }))
  };

  return (
    <div className="flex-1 h-full relative bg-surface-lowest overflow-hidden flex">
      <div className="flex-1 h-full relative bg-[#eef4f8] overflow-hidden">
        <MapLibreCanvas center={[58.2, 24.4]} zoom={4}>
          <GeoJSONLayer
            id="investigation-locations"
            data={invPoints}
            type="circle"
            paint={{
              "circle-color": [
                "match",
                ["get", "priority"],
                "CRITICAL", "#ba1a1a",
                "HIGH", "#a86516",
                "#00647c"
              ],
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.8
            }}
          />
        </MapLibreCanvas>

        {/* Metrics Bar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10 pointer-events-auto">
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-error/10 rounded">
              <AlertTriangle className="w-4 h-4 text-error" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">Active Investigations</div>
              <div className="text-lg font-bold text-on-surface">{activeInvs.length}</div>
            </div>
          </div>
          
          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-tertiary/10 rounded">
              <ShieldAlert className="w-4 h-4 text-tertiary" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">High Priority</div>
              <div className="text-lg font-bold text-on-surface">{activeInvs.filter(i => i.priority === 'HIGH' || i.priority === 'CRITICAL').length}</div>
            </div>
          </div>

          <div className="bg-surface/90 backdrop-blur border border-outline-variant px-4 py-2 rounded shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded">
              <Radar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase font-medium">Monitoring Jobs</div>
              <div className="text-lg font-bold text-on-surface">{jobs.filter(j => j.status !== 'RESOLVED' && j.status !== 'FAILED').length} active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Panel */}
      <div className="absolute top-0 left-0 bottom-0 w-[360px] bg-surface-container-lowest border-r border-outline-variant flex flex-col z-20 shadow-sm pointer-events-auto">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Active Investigations</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && <div className="text-center text-sm text-on-surface-variant p-4">Loading...</div>}
          {!isLoading && activeInvs.length === 0 && (
             <div className="text-center text-sm text-on-surface-variant p-4 border border-dashed border-outline-variant rounded">No active investigations</div>
          )}
          {activeInvs.map(inv => (
            <Link key={inv.id} href={`/investigation/${inv.id}`} className="block">
              <div className="bg-surface border border-outline-variant rounded p-3 hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-sm text-primary font-bold">{inv.id}</span>
                  <span className={`px-2 py-0.5 font-mono text-[10px] rounded uppercase tracking-wider font-bold ${
                    inv.priority === 'CRITICAL' ? 'bg-error/10 text-error border border-error/20' : 
                    inv.priority === 'HIGH' ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' :
                    'bg-primary/10 text-primary border border-primary/20'
                  }`}>
                    {inv.priority}
                  </span>
                </div>
                <h3 className="text-sm text-on-surface font-medium mb-2">{inv.title || 'Anomaly Investigation'}</h3>
                <div className="flex flex-col gap-1 font-mono text-[11px] text-on-surface-variant">
                  {inv.anomaly_geometry && (
                     <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> 
                        Has Geometry
                     </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> 
                    {new Date(inv.created_at).toISOString().slice(11, 16)} UTC (Opened)
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
