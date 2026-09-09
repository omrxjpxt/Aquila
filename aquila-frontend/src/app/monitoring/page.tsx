"use client";

import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { Activity, ShieldAlert, MapPin, ExternalLink, Satellite, ServerCrash, RefreshCw } from "lucide-react";
import Link from "next/link";
import { GeoJSONLayer } from "@/components/map/layers";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { monitoringApi } from "@/lib/api/monitoring";
import { investigationsApi } from "@/lib/api/investigations";
import { MonitoringJob, Investigation, JobStatus } from "@/lib/api/types";

export default function MonitoringPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  // Use a ref for interval to clear it on unmount
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchIt = () => {
      Promise.all([
        monitoringApi.getJobs(undefined, 20),
        investigationsApi.listInvestigations()
      ]).then(([fetchedJobs, fetchedInvs]) => {
        setJobs(fetchedJobs);
        setInvestigations(fetchedInvs);
        setIsLive(true);
        setError(null);
      }).catch(err => {
        console.error("Failed to fetch monitoring data:", err);
        setError(err.message || "Lost connection to backend services.");
        setIsLive(false);
      });
    };

    fetchIt(); // Initial fetch
    
    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(fetchIt, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user]);

  const getStatusColor = (status: JobStatus) => {
    if (status === "FAILED") return "bg-error/10 text-error";
    if (status === "RESOLVED" || status === "REPORT_READY") return "bg-success/10 text-success";
    return "bg-primary/10 text-primary";
  };

  const activeJobs = jobs.filter(j => j.status !== "RESOLVED" && j.status !== "REPORT_READY" && j.status !== "FAILED");
  const failedJobs = jobs.filter(j => j.status === "FAILED");

  // Create point features for investigations
  const invPoints: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: investigations.filter(i => i.anomaly_geometry).map(i => ({
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
    <div className="flex-1 h-full relative overflow-hidden bg-surface-lowest flex">
      
      {/* Left Panel: Global Pipeline Feed */}
      <aside className="w-[400px] h-full flex flex-col border-r border-outline-variant bg-surface-lowest shrink-0 z-10">
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
          <h1 className="text-xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
            <Activity className="w-5 h-5" />
            LIVE MONITORING
            {isLive ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live Polling
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[10px] bg-error/10 text-error px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                <ServerCrash className="w-3 h-3" />
                Disconnected
              </span>
            )}
          </h1>
          <p className="text-xs text-on-surface-variant">
            Continuous SAR monitoring and forensic pipeline status.
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border-b border-error/20 p-3 flex items-start gap-2">
            <ServerCrash className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <p className="text-xs text-error font-medium">{error}</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
          {jobs.length === 0 && !error && (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              No monitoring jobs active. Waiting for satellite acquisitions...
            </div>
          )}
          
          {jobs.map(job => (
            <div key={job.job_id} className="bg-surface border border-outline-variant rounded shadow-sm p-4 hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${getStatusColor(job.status)}`}>
                    {job.status === 'FAILED' ? <ServerCrash className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
                  </div>
                  <span className="font-bold text-xs text-on-surface uppercase tracking-wider truncate max-w-[150px]" title={job.product_id}>
                    {job.product_name || job.product_id}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {new Date(job.updated_at).toISOString().slice(11,16)}Z
                </span>
              </div>
              
              <div className="text-xs font-mono mb-3 flex items-center justify-between bg-surface-lowest p-2 rounded border border-outline-variant/30">
                 <span className="text-on-surface-variant">Status</span>
                 <span className={`font-bold ${job.status === 'FAILED' ? 'text-error' : 'text-primary'}`}>{job.status}</span>
              </div>
              
              {job.last_error && (
                <p className="text-xs text-error mb-3 bg-error/10 p-2 rounded">
                  {job.last_error}
                </p>
              )}
              
              {job.investigation_ids && job.investigation_ids.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/50">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Linked Investigations</div>
                  {job.investigation_ids.map(id => (
                     <Link key={id} href={`/investigation/${id}`} className="flex items-center justify-between text-xs font-bold text-primary hover:underline bg-primary/5 p-2 rounded border border-primary/20">
                        {id} <ExternalLink className="w-3 h-3" />
                     </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="flex-1 relative bg-[#eef4f8]">
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

        {/* Global Stats Overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-4 pointer-events-none">
          <div className="bg-surface/90 backdrop-blur border border-outline-variant p-4 rounded shadow-sm pointer-events-auto min-w-[160px]">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Pipeline Jobs</div>
            <div className="text-2xl font-bold text-primary">{activeJobs.length}</div>
            <div className="text-[10px] text-on-surface-variant font-medium mt-1">Processing Scenes</div>
          </div>
          <div className="bg-surface/90 backdrop-blur border border-outline-variant p-4 rounded shadow-sm pointer-events-auto min-w-[160px]">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Open Investigations</div>
            <div className="text-2xl font-bold text-error">{investigations.filter(i => i.status !== 'CLOSED').length}</div>
            <div className="text-[10px] text-error font-medium mt-1">Requires Attention</div>
          </div>
        </div>
      </main>

    </div>
  );
}
