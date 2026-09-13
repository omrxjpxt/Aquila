"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Target, 
  Satellite, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Compass,
  ArrowRight,
  Info
} from "lucide-react";
import { investigationsApi } from "@/lib/api/investigations";
import { monitoringApi } from "@/lib/api/monitoring";
import { satelliteApi } from "@/lib/api/satellite";
import { SatelliteScene, MonitoringStatus, ManualInvestigationResponse } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function NewInvestigationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("Manual AOI Forensic Audit");
  const [minLon, setMinLon] = useState("58.0");
  const [minLat, setMinLat] = useState("24.0");
  const [maxLon, setMaxLon] = useState("58.5");
  const [maxLat, setMaxLat] = useState("24.5");
  
  const [sourceMode, setSourceMode] = useState<"live_cdse" | "explicit_scene">("live_cdse");
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [availableScenes, setAvailableScenes] = useState<SatelliteScene[]>([]);

  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [result, setResult] = useState<ManualInvestigationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    monitoringApi.getStatus()
      .then((st) => {
        setMonitoringStatus(st);
        if (st.monitored_bbox && st.monitored_bbox.length === 4) {
          setMinLon(st.monitored_bbox[0].toString());
          setMinLat(st.monitored_bbox[1].toString());
          setMaxLon(st.monitored_bbox[2].toString());
          setMaxLat(st.monitored_bbox[3].toString());
        }
      })
      .catch(() => {});

    satelliteApi.listScenes()
      .then((sc) => {
        setAvailableScenes(sc);
        if (sc.length > 0) {
          setSelectedSceneId(sc[0].id);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleStartInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsedMinLon = parseFloat(minLon);
    const parsedMinLat = parseFloat(minLat);
    const parsedMaxLon = parseFloat(maxLon);
    const parsedMaxLat = parseFloat(maxLat);

    if (
      isNaN(parsedMinLon) ||
      isNaN(parsedMinLat) ||
      isNaN(parsedMaxLon) ||
      isNaN(parsedMaxLat)
    ) {
      setError("Please provide valid coordinates for AOI bounding box.");
      return;
    }

    if (parsedMinLon >= parsedMaxLon || parsedMinLat >= parsedMaxLat) {
      setError("Invalid BBOX bounds: Min coordinates must be smaller than Max coordinates.");
      return;
    }

    setLoading(true);
    setProgressStage("1/5 Querying Live Satellite & SAR Data...");

    try {
      // Simulate live stage feedback while async call runs on backend
      const timer1 = setTimeout(() => setProgressStage("2/5 Ingesting SAR Raster & Running RBF SVM..."), 1200);
      const timer2 = setTimeout(() => setProgressStage("3/5 Querying Open-Meteo & OpenDrift 24h Hindcast..."), 2400);
      const timer3 = setTimeout(() => setProgressStage("4/5 Querying GFW v3 Live AIS & Fishing Vessel Events..."), 3600);
      const timer4 = setTimeout(() => setProgressStage("5/5 Synthesizing 6-Factor Heuristic Attribution & Report..."), 4800);

      const payload = {
        title: title.trim() || "Manual AOI Forensic Audit",
        aoi_bbox: [parsedMinLon, parsedMinLat, parsedMaxLon, parsedMaxLat] as [number, number, number, number],
        scene_id: sourceMode === "explicit_scene" ? selectedSceneId : undefined,
        monitoring_zone_id: monitoringStatus?.monitored_zone_id || undefined,
        max_days: 7
      };

      const res = await investigationsApi.createManualInvestigation(payload);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);

      setResult(res);
      setProgressStage("Complete");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invId = res.id || (res as any).investigation_id;

      // Redirect directly to investigation detail page after 1s
      setTimeout(() => {
        router.push(`/investigation/${invId}`);
      }, 1000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute manual investigation.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-surface p-6 relative z-0">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-[-1]" 
        style={{ backgroundImage: "radial-gradient(var(--color-outline-variant) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      
      <div className="max-w-4xl mx-auto flex flex-col h-full">
        {/* Page Header */}
        <div className="mb-6 border-b border-outline-variant pb-4 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-on-surface">Investigate Now</h1>
            </div>
            <p className="text-sm text-on-surface-variant font-medium max-w-2xl">
              Trigger an on-demand forensic investigation across live satellite, ML classification, OpenDrift trajectory, and Global Fishing Watch AIS sources.
            </p>
          </div>
          <Link
            href="/monitoring"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Configure Observation Area <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          {error && (
            <div className="mb-5 p-3.5 bg-error/10 border border-error/20 rounded-lg text-xs text-error flex items-start gap-2.5 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Investigation Execution Halted</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {result && (
            <div className="mb-5 p-4 bg-success/10 border border-success/30 rounded-lg text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-success text-sm">
                <CheckCircle2 className="w-5 h-5 text-success" />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span>Investigation Created: {result.id || (result as any).investigation_id} ({result.status})</span>
              </div>
              <p className="text-on-surface font-medium">
                {result.evidence_count} evidence events gathered. Navigating to forensic workspace...
              </p>
              {result.coverage && (
                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-success/20 font-mono text-[11px]">
                  {Object.entries(result.coverage).map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-surface p-1.5 rounded border border-outline-variant/40">
                      <span className="text-outline uppercase">{k}:</span>
                      <span className={v === "LIVE" || v === "READY" ? "text-success font-bold" : "text-tertiary"}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleStartInvestigation} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Investigation Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                placeholder="e.g. Manual AOI Forensic Audit - Gulf of Oman"
              />
            </div>

            {/* Satellite Source Selection */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Satellite Acquisition Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceMode("live_cdse")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    sourceMode === "live_cdse"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-outline-variant bg-surface hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-on-surface mb-1">
                    <Satellite className="w-4 h-4 text-primary" />
                    <span>Live CDSE Catalog Search</span>
                  </div>
                  <p className="text-[11px] text-outline leading-tight">
                    Queries Copernicus Data Space for fresh Sentinel-1 scenes over the AOI. If unavailable, reports truthfully.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("explicit_scene")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    sourceMode === "explicit_scene"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-outline-variant bg-surface hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-on-surface mb-1">
                    <ShieldCheck className="w-4 h-4 text-secondary" />
                    <span>Ingested Granule / Baseline Scene</span>
                  </div>
                  <p className="text-[11px] text-outline leading-tight">
                    Select an existing ingested Sentinel-1 scene with verified SAR radar rasters.
                  </p>
                </button>
              </div>

              {sourceMode === "explicit_scene" && (
                <div className="mt-3">
                  <label className="block text-[11px] font-mono text-outline uppercase mb-1">
                    Select Ingested Scene
                  </label>
                  <select
                    value={selectedSceneId}
                    onChange={(e) => setSelectedSceneId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary"
                  >
                    {availableScenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} ({s.provider || "Sentinel-1"}, {new Date(s.acquisition_time).toISOString().slice(0, 16)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* AOI Bounding Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Target Area of Interest (AOI Bounding Box)
                </label>
                {monitoringStatus?.monitored_bbox && (
                  <button
                    type="button"
                    onClick={() => {
                      if (monitoringStatus.monitored_bbox) {
                        setMinLon(monitoringStatus.monitored_bbox[0].toString());
                        setMinLat(monitoringStatus.monitored_bbox[1].toString());
                        setMaxLon(monitoringStatus.monitored_bbox[2].toString());
                        setMaxLat(monitoringStatus.monitored_bbox[3].toString());
                      }
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Reset to Monitored AOI
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase">West (Min Lon)</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={minLon}
                    onChange={(e) => setMinLon(e.target.value)}
                    required
                    className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase">South (Min Lat)</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={minLat}
                    onChange={(e) => setMinLat(e.target.value)}
                    required
                    className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase">East (Max Lon)</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={maxLon}
                    onChange={(e) => setMaxLon(e.target.value)}
                    required
                    className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase">North (Max Lat)</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={maxLat}
                    onChange={(e) => setMaxLat(e.target.value)}
                    required
                    className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Provider Coverage Disclosure */}
            <div className="bg-surface-container-low/50 border border-outline-variant/60 rounded-lg p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-on-surface font-bold">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>Truthful Forensic Evidence Protocol</span>
              </div>
              <p className="text-[11px] text-outline leading-relaxed">
                AQUILA triggers live multi-source forensics: CDSE Satellite Catalog, Lookalike ML SVM Classifier, Open-Meteo marine wind/currents, OpenDrift 24-hour hydrodynamic reverse drift hindcast, and authenticated Global Fishing Watch (GFW) AIS presence. Individual provider unavailability is explicitly reported and will not synthesize mock data.
              </p>
            </div>

            {/* Trigger Button & Progress */}
            <div className="pt-2 flex flex-col gap-3">
              {loading && progressStage && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg font-mono text-xs text-primary animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{progressStage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 text-xs font-bold bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 tracking-wider uppercase"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing Forensics Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Investigate Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
