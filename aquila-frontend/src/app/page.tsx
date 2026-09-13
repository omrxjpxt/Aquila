"use client";

import { MapLibreCanvas, useMap } from "@/components/map/MapLibreCanvas";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { AlertTriangle, MapPin, Radar, Layers, Ship, ChevronRight, Activity, Satellite, Play, Radio } from "lucide-react";
import { investigationsApi } from "@/lib/api/investigations";
import { monitoringApi } from "@/lib/api/monitoring";
import { systemApi } from "@/lib/api/system";
import { satelliteApi } from "@/lib/api/satellite";
import { Investigation, MonitoringJob, SystemStatus, SatelliteScene, MonitoringStatus } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { GeoJSONLayer } from "@/components/map/layers";
import { SetObservationAreaModal } from "@/components/monitoring/SetObservationAreaModal";

function ImageOverlayLayer({ 
  id, 
  sceneId, 
  bbox, 
  visible = true 
}: { 
  id: string; 
  sceneId: string; 
  bbox: [number, number, number, number]; 
  visible?: boolean 
}) {
  const map = useMap();
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [west, south, east, north] = bbox;

  useEffect(() => {
    if (!map) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    const sourceId = `source-${id}`;
    const layerId = `layer-${id}`;

    const cleanup = () => {

      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      } catch (err) {
        console.warn("Failed to remove layer:", err);
      }

      try {
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (err) {
        console.warn("Failed to remove source:", err);
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    const addLayer = (url: string) => {
      if (cancelled) return;

      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [west, north], // top-left
        [east, north], // top-right
        [east, south], // bottom-right
        [west, south]  // bottom-left
      ];

      // Remove existing layer and source if they exist
      if (map.getLayer(layerId)) {
        try { map.removeLayer(layerId); } catch {}
      }
      if (map.getSource(sourceId)) {
        try { map.removeSource(sourceId); } catch {}
      }

      map.addSource(sourceId, {
        type: "image",
        url: url,
        coordinates: coordinates
      });

      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": 0.78,
          "raster-fade-duration": 0,
          "raster-resampling": "nearest"
        },
        layout: {
          visibility: visible ? "visible" : "none"
        }
      });

      try {
        map.resize();
      } catch (e) {
        console.error("Failed to resize map:", e);
      }
    };

    const tryAddLayer = (url: string) => {
      if (cancelled) return;
      try {
        addLayer(url);
      } catch (err) {
        console.warn("Retrying SAR overlay when style loads:", err);
        const retry = () => {
          if (!cancelled && objectUrl) {
            try { addLayer(objectUrl); } catch {}
          }
        };
        map.once("style.load", retry);
        map.once("load", retry);
      }
    };

    satelliteApi.getPreviewBlob(sceneId)
      .then(url => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewError(null);
        tryAddLayer(url);
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Failed to fetch satellite preview blob:", err);
          setPreviewError("Unable to load satellite preview.");
        }
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [map, id, sceneId, west, south, east, north, visible]);

  useEffect(() => {
    if (!map) return;
    const layerId = `layer-${id}`;
    if (map.getLayer(layerId)) {
      try {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      } catch {}
    }
  }, [map, id, visible]);

  if (previewError) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="bg-surface/90 backdrop-blur p-4 rounded-lg shadow-md border border-error/30 text-center pointer-events-auto max-w-xs">
          <AlertTriangle className="w-6 h-6 text-error mx-auto mb-2" />
          <p className="text-sm font-semibold text-error">{previewError}</p>
        </div>
      </div>
    );
  }

  return null;
}

function AOIMapSynchronizer({ bbox }: { bbox?: [number, number, number, number] | null }) {
  const map = useMap();
  const lastAppliedBboxRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !bbox || bbox.length !== 4) return;

    const bboxKey = bbox.join(",");
    if (lastAppliedBboxRef.current === bboxKey) return;

    try {
      map.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        { padding: 50, maxZoom: 10, duration: 0 }
      );
      lastAppliedBboxRef.current = bboxKey;
    } catch (err) {
      console.error("[MapLibre] Failed to fit bounds to AOI:", err);
    }
  }, [map, bbox]);

  return null;
}

export default function CommandCenterPage() {
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [scenes, setScenes] = useState<SatelliteScene[]>([]);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("operator@aquila.system");
  const [password, setPassword] = useState("AquilaPassword123!");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    let ignore = false;
    const loadData = async () => {
      try {
        const [invs, fetchedJobs, fetchedStatus, fetchedScenes, fetchedMonitoringStatus] = await Promise.all([
          investigationsApi.listInvestigations(),
          monitoringApi.getJobs(undefined, 20),
          systemApi.getStatus().catch(() => null),
          satelliteApi.listScenes().catch(() => []),
          monitoringApi.getStatus().catch(() => null)
        ]);
        if (!ignore) {
          setInvestigations(invs);
          setJobs(fetchedJobs);
          setStatus(fetchedStatus);
          setScenes(fetchedScenes);
          setMonitoringStatus(fetchedMonitoringStatus);
          setError(null);
          setDataLoaded(true);
        }
      } catch {
        if (!ignore) {
          setError("Unable to load live data.");
          setDataLoaded(true);
        }
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [authLoading, user, retryTrigger]);

  if (authLoading || (!dataLoaded && user)) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#F6FAFD]">
        <div className="flex items-center gap-2 text-on-surface-variant">
           <RefreshCw className="w-5 h-5 animate-spin" />
           <span>Loading AQUILA Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setAuthError(null);
      try {
        await login(email, password);
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : "Failed to sign in");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleGoogle = async () => {
      setIsSubmitting(true);
      setAuthError(null);
      try {
        await loginWithGoogle();
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : "Failed to sign in with Google");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#F6FAFD] p-4">
        <div className="bg-white rounded-xl shadow-lg border border-outline-variant/40 max-w-md w-full p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              🦅
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#001f28]">AQUILA Command Center</h2>
              <p className="text-xs text-outline">Maritime Intelligence & Surveillance</p>
            </div>
          </div>

          <div className="mb-5 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary">
            🔐 <strong>Authentication Required</strong> &mdash; Sign in to access live satellite feeds, investigations, and monitoring jobs.
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-xs text-error">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Operator Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-[#001f28]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-[#001f28]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In as Operator</span>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-outline">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full py-2.5 border border-outline-variant bg-surface hover:bg-surface-container-high text-[#001f28] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#F6FAFD]">
         <div className="bg-error/10 p-6 rounded-lg text-center max-w-md border border-error/20">
            <AlertTriangle className="w-10 h-10 text-error mx-auto mb-4" />
            <h2 className="text-error font-bold text-lg mb-2">Unable to load live data.</h2>
            <p className="text-sm text-error/80 mb-6">There was a problem connecting to the AQUILA scientific engine.</p>
            <button onClick={() => { setDataLoaded(false); setError(null); setRetryTrigger(c => c + 1); }} className="px-4 py-2 bg-error text-white rounded text-sm font-medium hover:bg-error/90 transition-colors">
              Retry Connection
            </button>
         </div>
      </div>
    );
  }

  const activeInvs = investigations.filter(i => i.status !== 'CLOSED');
  const highPriorityInvs = activeInvs.filter(i => i.priority === 'HIGH' || i.priority === 'CRITICAL');
  const activeJobs = jobs.filter(j => j.status !== 'RESOLVED' && j.status !== 'FAILED');

  // Select the latest usable processed Sentinel-1 SAR scene
  const processedScenes = scenes.filter(s => s.is_processed);
  const sortedProcessedScenes = [...processedScenes].sort(
    (a, b) => new Date(b.acquisition_time).getTime() - new Date(a.acquisition_time).getTime()
  );
  const activeScene = sortedProcessedScenes[0] || null;

  const defaultCenter: [number, number] = monitoringStatus?.monitored_bbox
    ? [(monitoringStatus.monitored_bbox[0] + monitoringStatus.monitored_bbox[2]) / 2, (monitoringStatus.monitored_bbox[1] + monitoringStatus.monitored_bbox[3]) / 2]
    : (activeScene
      ? [(activeScene.bbox[0] + activeScene.bbox[2]) / 2, (activeScene.bbox[1] + activeScene.bbox[3]) / 2]
      : [58.025, 24.474]);
  const defaultZoom = activeScene ? 7.8 : 6;

  const lastUpdated = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';

  return (
    <div className="flex-1 h-full bg-[#F6FAFD] flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-end mb-4 shrink-0">
        <div>
          <h1 className="text-[28px] font-bold text-[#001f28] tracking-tight">Welcome to AQUILA</h1>
          <p className="text-[15px] text-outline">Maritime environmental monitoring and forensic analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAreaModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-high text-on-surface rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Set Observation Area</span>
          </button>
          <Link
            href="/investigation/new"
            className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 tracking-wider uppercase"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Investigate Now</span>
          </Link>
          <div className="h-6 w-px bg-outline-variant/60 mx-1" />
          <div className="flex items-center gap-2">
             <div className={`w-2.5 h-2.5 rounded-full ${status?.status === 'online' ? 'bg-success' : 'bg-error'}`} />
             <span className="text-[13px] font-bold text-on-surface">System {status?.status === 'online' ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* Observation Area & Provider Status Bar */}
      <div className="mb-5 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 flex items-center justify-between shadow-sm text-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-on-surface-variant">Observation Area:</span>
          <span className="font-bold text-on-surface">
            {monitoringStatus?.monitored_zone_name || "Gulf of Oman (Standard AOI)"}
          </span>
          {monitoringStatus?.monitored_bbox && (
            <span className="font-mono text-[11px] text-outline">
              [{monitoringStatus.monitored_bbox.map(n => n.toFixed(2)).join(", ")}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-outline">MONITORING:</span>
            <span className={`font-bold px-2 py-0.5 rounded border ${
              monitoringStatus?.monitoring_active
                ? "bg-success/15 text-success border-success/30"
                : "bg-surface-variant text-on-surface-variant border-outline-variant"
            }`}>
              {monitoringStatus?.monitoring_active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-outline">GFW AIS:</span>
            <span className={`font-bold px-2 py-0.5 rounded border ${
              monitoringStatus?.gfw_status === "LIVE"
                ? "bg-success/15 text-success border-success/30"
                : "bg-error/15 text-error border-error/30"
            }`}>
              {monitoringStatus?.gfw_status || "LIVE"}
            </span>
          </div>
          <span className="text-[11px] text-outline">Updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
             <Layers className="w-6 h-6 text-primary" />
           </div>
           <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Investigations</div>
              <div className="text-2xl font-bold text-on-surface leading-none mb-1">{activeInvs.length}</div>
              <div className="text-[11px] text-outline">from live pipeline</div>
           </div>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
             <Radar className="w-6 h-6 text-secondary" />
           </div>
           <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Monitoring Jobs</div>
              <div className="text-2xl font-bold text-on-surface leading-none mb-1">{activeJobs.length}</div>
              <div className="text-[11px] text-outline">Processing scenes</div>
           </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
             <Ship className="w-6 h-6 text-primary" />
           </div>
           <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Tracked Vessels</div>
              <div className="text-2xl font-bold text-on-surface leading-none mb-1">—</div>
              <div className="text-[11px] text-outline">No data</div>
           </div>
        </div>

        <div className={`bg-surface-container-lowest border rounded-lg p-5 flex items-center gap-4 shadow-sm ${highPriorityInvs.length > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
           <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${highPriorityInvs.length > 0 ? 'bg-error/10' : 'bg-surface-variant'}`}>
             <AlertTriangle className={`w-6 h-6 ${highPriorityInvs.length > 0 ? 'text-error' : 'text-outline'}`} />
           </div>
           <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">High Priority</div>
              <div className={`text-2xl font-bold leading-none mb-1 ${highPriorityInvs.length > 0 ? 'text-error' : 'text-on-surface'}`}>{highPriorityInvs.length}</div>
              <div className={`text-[11px] ${highPriorityInvs.length > 0 ? 'text-error' : 'text-outline'}`}>
                {highPriorityInvs.length > 0 ? 'Requires attention' : 'All clear'}
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Left Column */}
        <div className="w-[34%] flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* Recent Investigations */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface">
                <h2 className="text-[15px] font-bold text-on-surface">Recent Investigations</h2>
                <Link href="/investigations" className="text-[13px] font-medium text-primary hover:underline flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-0.5" />
                </Link>
             </div>
             <div className="flex-1 p-0 overflow-y-auto max-h-[300px]">
                {activeInvs.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <Layers className="w-8 h-8 text-outline-variant mb-3" />
                    <div className="text-[14px] font-bold text-on-surface mb-1">No active investigations</div>
                    <div className="text-[13px] text-outline max-w-[200px]">
                       New investigations will appear when the monitoring pipeline identifies a candidate anomaly.
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/50">
                    {activeInvs.slice(0, 5).map(inv => (
                      <Link key={inv.id} href={`/investigation/${inv.id}`} className="p-4 flex gap-4 hover:bg-surface-container-low transition-colors block group">
                         <div className="w-16 h-16 bg-surface-variant rounded flex shrink-0 items-center justify-center border border-outline-variant/50">
                            {inv.anomaly_geometry ? (
                              <MapPin className="w-6 h-6 text-outline" />
                            ) : (
                              <Activity className="w-6 h-6 text-outline" />
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-bold text-on-surface truncate group-hover:text-primary transition-colors">{inv.title || 'Anomaly Investigation'}</h3>
                            <div className="text-[12px] font-mono text-outline mb-1">{inv.id}</div>
                            <div className="text-[12px] text-outline">{new Date(inv.created_at).toISOString().slice(11, 16)} UTC</div>
                         </div>
                         <div className="shrink-0 flex flex-col items-end justify-between">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                inv.priority === 'CRITICAL' || inv.priority === 'HIGH' ? 'bg-error/10 text-error border-error/20' : 
                                inv.priority === 'MEDIUM' ? 'bg-warning/10 text-warning border-warning/20 text-[#a86516]' :
                                'bg-success/10 text-success border-success/20'
                            }`}>
                              {inv.priority}
                            </span>
                            <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary" />
                         </div>
                      </Link>
                    ))}
                  </div>
                )}
             </div>
          </div>

          {/* Recent Monitoring Activity */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface">
                <h2 className="text-[15px] font-bold text-on-surface">Recent Monitoring Activity</h2>
                <Link href="/monitoring" className="text-[13px] font-medium text-primary hover:underline flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-0.5" />
                </Link>
             </div>
             <div className="flex-1 p-0 overflow-y-auto max-h-[350px]">
                {jobs.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <Activity className="w-8 h-8 text-outline-variant mb-3" />
                    <div className="text-[14px] font-bold text-on-surface mb-1">No monitoring jobs</div>
                    <div className="text-[13px] text-outline max-w-[200px]">
                       Waiting for satellite acquisitions...
                    </div>
                  </div>
                ) : (
                  <div className="p-4 relative">
                    <div className="absolute left-[23px] top-6 bottom-6 w-px bg-outline-variant/40" />
                    <div className="space-y-6">
                      {jobs.slice(0, 8).map(job => (
                        <div key={job.job_id} className="flex gap-4 relative z-10">
                          <div className={`w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 ${job.status === 'FAILED' ? 'bg-error/10 border-error' : 'bg-surface-container-lowest border-primary'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                               <div className="text-[13px] font-bold text-on-surface">
                                 {job.status === 'CANDIDATES_FOUND' ? 'Candidates Detected' : 
                                  job.status === 'PROCESSING' ? 'Scene Processing' : 
                                  job.status === 'FAILED' ? 'Job Failed' :
                                  'Job Status Updated'}
                               </div>
                               <div className="text-[11px] text-outline">{new Date(job.updated_at).toISOString().slice(11, 16)} UTC</div>
                            </div>
                            <div className="text-[12px] font-mono text-outline truncate">
                              {job.product_id || job.job_id}
                            </div>
                            <div className={`text-[12px] font-medium mt-0.5 ${job.status === 'FAILED' ? 'text-error' : 'text-primary'}`}>
                              {job.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

        </div>

        {/* Right Column - Map */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden relative min-h-[450px] h-full">
           <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
              <div className="bg-surface/95 backdrop-blur shadow-sm border border-outline-variant p-3 rounded-lg pointer-events-auto">
                 <h2 className="text-[15px] font-bold text-on-surface mb-0.5 uppercase tracking-wide">LIVE SATELLITE VIEW</h2>
                 <p className="text-[12px] text-outline">Latest Sentinel-1 acquisitions and detected anomalies</p>
              </div>
              <div className="bg-surface border border-outline-variant px-3 py-1.5 rounded shadow-sm text-[13px] font-bold text-on-surface pointer-events-auto flex items-center gap-2">
                 <span>Sentinel-1 (SAR)</span>
                 <ChevronRight className="w-3 h-3 rotate-90" />
              </div>
           </div>

           <div className="flex-1 relative bg-[#eef4f8] min-h-[400px] h-full">
              <MapLibreCanvas center={defaultCenter} zoom={defaultZoom} className="h-full min-h-[400px]">
                 <AOIMapSynchronizer bbox={monitoringStatus?.monitored_bbox} />
                 
                 {/* Empty State Overlay */}
                 {!activeScene && (
                   <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-surface/90 backdrop-blur p-6 rounded-lg shadow-lg border border-outline-variant text-center pointer-events-auto max-w-sm">
                         <Satellite className="w-10 h-10 text-outline-variant mx-auto mb-3" />
                         <h3 className="text-sm font-bold text-on-surface mb-1">NO PROCESSED SATELLITE SCENES AVAILABLE</h3>
                         <p className="text-xs text-outline">Waiting for satellite acquisitions...</p>
                      </div>
                   </div>
                 )}

                 {/* Active Processed Sentinel-1 SAR Imagery Overlay */}
                 {activeScene && (
                   <>
                     <ImageOverlayLayer 
                       key={activeScene.id} 
                       id={`sar-${activeScene.id}`} 
                       sceneId={activeScene.id} 
                       bbox={activeScene.bbox} 
                       visible={true}
                     />
                     <GeoJSONLayer
                       id={`scene-bbox-${activeScene.id}`}
                       data={{
                         type: "Feature",
                         geometry: {
                           type: "Polygon",
                           coordinates: [[
                             [activeScene.bbox[0], activeScene.bbox[1]],
                             [activeScene.bbox[2], activeScene.bbox[1]],
                             [activeScene.bbox[2], activeScene.bbox[3]],
                             [activeScene.bbox[0], activeScene.bbox[3]],
                             [activeScene.bbox[0], activeScene.bbox[1]],
                           ]]
                         },
                         properties: {}
                       }}
                       type="line"
                       paint={{
                         "line-color": "#00e5ff",
                         "line-width": 2,
                         "line-dasharray": [3, 2]
                       }}
                     />
                   </>
                 )}

                 {/* Configured Observation Area AOI */}
                 {monitoringStatus?.monitored_bbox && (
                   <GeoJSONLayer
                     id="monitored-observation-bbox"
                     data={{
                       type: "Feature",
                       geometry: {
                         type: "Polygon",
                         coordinates: [[
                           [monitoringStatus.monitored_bbox[0], monitoringStatus.monitored_bbox[1]],
                           [monitoringStatus.monitored_bbox[2], monitoringStatus.monitored_bbox[1]],
                           [monitoringStatus.monitored_bbox[2], monitoringStatus.monitored_bbox[3]],
                           [monitoringStatus.monitored_bbox[0], monitoringStatus.monitored_bbox[3]],
                           [monitoringStatus.monitored_bbox[0], monitoringStatus.monitored_bbox[1]],
                         ]]
                       },
                       properties: {}
                     }}
                     type="line"
                     paint={{
                       "line-color": "#00647c",
                       "line-width": 2,
                       "line-dasharray": [3, 2]
                     }}
                   />
                 )}

                 {/* Anomaly Polygons from Investigations */}
                 <GeoJSONLayer
                    id="investigation-polygons"
                    data={{
                      type: "FeatureCollection",
                      features: activeInvs.filter(i => i.anomaly_geometry).map(i => ({
                        type: "Feature",
                        geometry: i.anomaly_geometry as GeoJSON.Geometry,
                        properties: { 
                          id: i.id,
                          priority: i.priority
                        }
                      }))
                    }}
                    type="line"
                    paint={{
                      "line-color": [
                        "match",
                        ["get", "priority"],
                        "CRITICAL", "#ba1a1a",
                        "HIGH", "#a86516",
                        "#00647c"
                      ],
                      "line-width": 3,
                      "line-opacity": 0.9
                    }}
                 />
              </MapLibreCanvas>

              {/* Legend */}
              <div className="absolute bottom-6 left-4 bg-surface/90 backdrop-blur border border-outline-variant p-3 rounded shadow-sm z-10 pointer-events-auto">
                 <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 bg-[#ba1a1a] border border-white" />
                    <span className="text-[11px] font-bold text-on-surface">High Priority</span>
                 </div>
                 <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 bg-[#a86516] border border-white" />
                    <span className="text-[11px] font-bold text-on-surface">Medium Priority</span>
                 </div>
                 <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 border-2 border-dashed border-[#00647c] bg-[#00647c]/10" />
                    <span className="text-[11px] font-bold text-on-surface">Monitored AOI</span>
                 </div>
                 <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-outline" />
                    <span className="text-[11px] font-bold text-on-surface">Vessel (AIS)</span>
                 </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 border-2 border-dashed border-[#00e5ff] bg-[#00e5ff]/20" />
                     <span className="text-[11px] font-bold text-on-surface">Sentinel-1 Coverage</span>
                  </div>
              </div>
           </div>
        </div>

      </div>

      {/* Set Observation Area Modal */}
      <SetObservationAreaModal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        onAreaSaved={(savedZone) => {
          setMonitoringStatus(prev => prev ? {
            ...prev,
            monitored_zone: savedZone.name,
            monitored_zone_name: savedZone.name,
            monitored_zone_id: savedZone.id,
            monitored_bbox: savedZone.bbox as [number, number, number, number]
          } : null);
          setRetryTrigger(c => c + 1);
        }}
        currentZone={monitoringStatus?.monitored_bbox ? {
          id: monitoringStatus.monitored_zone_id || "configured-zone",
          name: monitoringStatus.monitored_zone_name || "Configured Observation Area",
          bbox: monitoringStatus.monitored_bbox,
          owner_uid: "current-user"
        } : null}
      />
    </div>
  );
}

function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
