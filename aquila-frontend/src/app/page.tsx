"use client";

import { MapLibreCanvas, useMap } from "@/components/map/MapLibreCanvas";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Clock, Radar, Layers, Ship, ChevronRight, Activity, Satellite } from "lucide-react";
import { investigationsApi } from "@/lib/api/investigations";
import { monitoringApi } from "@/lib/api/monitoring";
import { systemApi } from "@/lib/api/system";
import { satelliteApi } from "@/lib/api/satellite";
import { Investigation, MonitoringJob, SystemStatus, SatelliteScene } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { GeoJSONLayer } from "@/components/map/layers";

function ImageOverlayLayer({ id, sceneId, bbox, visible = true }: { id: string; sceneId: string; bbox: [number, number, number, number]; visible?: boolean }) {
  const map = useMap();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    satelliteApi.getPreviewBlob(sceneId).then(url => {
      if (active) setBlobUrl(url);
    }).catch(console.error);
    return () => { active = false; };
  }, [sceneId]);

  useEffect(() => {
    if (!map || !blobUrl) return;
    
    // Coordinates format: [top-left, top-right, bottom-right, bottom-left]
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [bbox[0], bbox[3]], // min_lon, max_lat
      [bbox[2], bbox[3]], // max_lon, max_lat
      [bbox[2], bbox[1]], // max_lon, min_lat
      [bbox[0], bbox[1]]  // min_lon, min_lat
    ];

    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "image",
        url: blobUrl,
        coordinates: coordinates
      });
      map.addLayer({
        id: id,
        type: "raster",
        source: id,
        paint: {
          "raster-opacity": 0.8,
          "raster-fade-duration": 0
        },
        layout: {
          visibility: visible ? "visible" : "none"
        }
      });
    } else {
      const source = map.getSource(id) as unknown as { updateImage: (opts: { url: string; coordinates: [[number, number], [number, number], [number, number], [number, number]] }) => void };
      if (source && source.updateImage) {
        source.updateImage({ url: blobUrl, coordinates });
      }
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    }

    return () => {
      // Cleanup happens when the map itself unmounts
    };
  }, [map, id, blobUrl, bbox, visible]);

  return null;
}

export default function CommandCenterPage() {
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [scenes, setScenes] = useState<SatelliteScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("operator@aquila.system");
  const [password, setPassword] = useState("AquilaPassword123!");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [invs, fetchedJobs, fetchedStatus, fetchedScenes] = await Promise.all([
        investigationsApi.listInvestigations(),
        monitoringApi.getJobs(undefined, 20),
        systemApi.getStatus().catch(() => null),
        satelliteApi.listScenes().catch(() => [])
      ]);
      setInvestigations(invs);
      setJobs(fetchedJobs);
      setStatus(fetchedStatus);
      setScenes(fetchedScenes);
      setError(null);
    } catch (err: unknown) {
      setError("Unable to load live data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const runFetch = async () => {
      await fetchData();
    };
    
    runFetch();
    const interval = setInterval(runFetch, 10000);
    return () => clearInterval(interval);
  }, [authLoading, user]);

  if (authLoading || (isLoading && user)) {
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
            <button onClick={() => { setIsLoading(true); fetchData(); }} className="px-4 py-2 bg-error text-white rounded text-sm font-medium hover:bg-error/90 transition-colors">
              Retry Connection
            </button>
         </div>
      </div>
    );
  }

  const activeInvs = investigations.filter(i => i.status !== 'CLOSED');
  const highPriorityInvs = activeInvs.filter(i => i.priority === 'HIGH' || i.priority === 'CRITICAL');
  const activeJobs = jobs.filter(j => j.status !== 'RESOLVED' && j.status !== 'FAILED');

  const lastUpdated = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';

  return (
    <div className="flex-1 h-full bg-[#F6FAFD] flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-[28px] font-bold text-[#001f28] tracking-tight">Welcome to AQUILA</h1>
          <p className="text-[15px] text-outline">Maritime environmental monitoring and forensic analysis</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className={`w-2.5 h-2.5 rounded-full ${status?.status === 'online' ? 'bg-success' : 'bg-error'}`} />
             <span className="text-[13px] font-bold text-on-surface">System {status?.status === 'online' ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-[13px] text-outline">Last updated: {lastUpdated}</span>
        </div>
      </header>

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
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden flex-1">
             <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface">
                <h2 className="text-[15px] font-bold text-on-surface">Recent Monitoring Activity</h2>
                <Link href="/monitoring" className="text-[13px] font-medium text-primary hover:underline flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-0.5" />
                </Link>
             </div>
             <div className="flex-1 p-0 overflow-y-auto">
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
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden relative">
           <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
              <div className="bg-surface/95 backdrop-blur shadow-sm border border-outline-variant p-3 rounded-lg pointer-events-auto">
                 <h2 className="text-[15px] font-bold text-on-surface mb-0.5">Live Satellite View</h2>
                 <p className="text-[12px] text-outline">Latest Sentinel-1 acquisitions and detected anomalies</p>
              </div>
              <div className="bg-surface border border-outline-variant px-3 py-1.5 rounded shadow-sm text-[13px] font-bold text-on-surface pointer-events-auto flex items-center gap-2">
                 <span>Sentinel-1 (SAR)</span>
                 <ChevronRight className="w-3 h-3 rotate-90" />
              </div>
           </div>

           <div className="flex-1 relative bg-[#eef4f8]">
              <MapLibreCanvas center={[112, 12]} zoom={4}>
                 
                 {/* Empty State Overlay */}
                 {scenes.length === 0 && (
                   <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-surface/90 backdrop-blur p-6 rounded-lg shadow-lg border border-outline-variant text-center pointer-events-auto">
                         <Satellite className="w-10 h-10 text-outline-variant mx-auto mb-3" />
                         <h3 className="text-lg font-bold text-on-surface mb-2">NO SATELLITE SCENES AVAILABLE</h3>
                         <p className="text-sm text-outline">Waiting for the next acquisition...</p>
                      </div>
                   </div>
                 )}

                 {/* Imagery Overlays */}
                 {scenes.map(scene => (
                   <ImageOverlayLayer 
                     key={scene.id} 
                     id={`preview-${scene.id}`} 
                     sceneId={scene.id} 
                     bbox={scene.bbox} 
                     visible={true}
                   />
                 ))}

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
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-outline" />
                    <span className="text-[11px] font-bold text-on-surface">Vessel (AIS)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-outline border border-white" />
                    <span className="text-[11px] font-bold text-on-surface">Sentinel-1 Coverage</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
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
