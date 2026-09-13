"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Ship, ChevronLeft, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { VesselDetailResponse } from "@/lib/api/types";

export default function VesselDetailsPage({ params }: { params: Promise<{ mmsi: string }> }) {
  const { mmsi } = use(params);
  const [detail, setDetail] = useState<VesselDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadVessel() {
      try {
        setIsLoading(true);
        const data = await apiClient.get<VesselDetailResponse>(`/ais/vessels/${mmsi}`);
        if (isMounted) setDetail(data);
      } catch (err) {
        console.warn("Could not fetch vessel details:", err);
        if (isMounted) {
          setDetail({
            mmsi,
            provider: "Global Fishing Watch",
            status: "UNAVAILABLE",
            reason: "External AIS API is unavailable",
            vessel: null,
            historical_track_available: false,
            historical_track_message: "Historical track unavailable from current provider.",
            retrieved_at: new Date().toISOString()
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadVessel();
    return () => {
      isMounted = false;
    };
  }, [mmsi]);

  const vessel = detail?.vessel;
  const isLive = detail?.status === "LIVE" && vessel;

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      
      {/* Top Banner */}
      <div className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/vessels" className="p-2 -ml-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Ship className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-on-surface leading-tight tracking-tight">
                  {vessel?.name || "Vessel Details"}
                </h1>
                <div className="font-mono text-[11px] text-on-surface-variant font-medium tracking-wider uppercase mt-0.5">
                  MMSI: {mmsi} {vessel?.flag ? `• FLAG: ${vessel.flag}` : ""}
                </div>
              </div>
            </div>
          </div>
          {detail && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
              detail.status === "LIVE" 
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
                : "bg-surface-container-high text-on-surface-variant border-outline-variant"
            }`}>
              {detail.status === "LIVE" ? "LIVE GFW" : "AIS: UNAVAILABLE"}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {isLoading ? (
          <div className="bg-surface border border-outline-variant p-8 rounded text-center text-on-surface-variant font-mono text-xs">
            Querying AIS vessel registry for MMSI {mmsi}...
          </div>
        ) : isLive ? (
          <div className="space-y-6">
            <div className="bg-surface border border-outline-variant rounded p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Vessel Identification</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">Ship Name</span>
                  <span className="font-bold text-on-surface">{vessel.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">MMSI</span>
                  <span className="font-bold text-on-surface">{vessel.mmsi}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">IMO</span>
                  <span className="font-bold text-on-surface">{vessel.imo || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">Vessel Type</span>
                  <span className="font-bold text-on-surface">{vessel.vessel_type || "Commercial"}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant rounded p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                Global Registry & Identity Data
              </h2>
              <div className="mb-4 p-3 bg-surface-container-high/50 border border-outline-variant/60 rounded text-xs text-on-surface-variant flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>
                  This identity record is fetched from the global registry. <strong>It is not proof of presence</strong> in the currently selected Observation Area. Area-specific presence is verified separately during investigations.
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs mb-4">
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">Global Last Known Position</span>
                  <span className="font-bold text-on-surface">
                    {vessel.last_position_lat !== null && vessel.last_position_lon !== null 
                      ? `${vessel.last_position_lat.toFixed(4)}° N, ${vessel.last_position_lon.toFixed(4)}° E (Global)` 
                      : "Position unavailable"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">Timestamp</span>
                  <span className="font-bold text-on-surface">
                    {vessel.last_timestamp ? new Date(vessel.last_timestamp).toISOString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase">Provider</span>
                  <span className="font-bold text-on-surface">{detail.provider}</span>
                </div>
              </div>
              <div className="p-3 bg-surface-container-high/50 border border-outline-variant/60 rounded text-xs text-on-surface-variant">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 text-tertiary" />
                {detail.historical_track_message}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-outline-variant p-8 rounded text-center text-on-surface-variant flex flex-col items-center gap-3">
            <span className="text-[10px] font-bold font-mono tracking-widest bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded border border-outline-variant uppercase">
              AIS: UNAVAILABLE
            </span>
            <h2 className="text-base font-bold text-on-surface">Global vessel lookup is unavailable</h2>
            <p className="text-sm max-w-md">
              External AIS provider (Global Fishing Watch) credentials (<code>GFW_API_TOKEN</code>) are not configured in the backend environment.
            </p>
            <div className="border-t border-outline-variant/50 pt-4 mt-2 text-xs text-on-surface-variant max-w-md flex flex-col gap-1">
              <p className="font-mono text-[11px] text-tertiary">Notice: Historical track unavailable from current provider.</p>
              <p>Vessels are tracked and evaluated dynamically within active investigations.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

