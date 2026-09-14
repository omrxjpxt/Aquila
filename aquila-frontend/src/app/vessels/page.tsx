"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Ship, Search, Filter, AlertTriangle, Anchor, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { monitoringApi } from "@/lib/api/monitoring";
import { FleetResponse, MonitoringZone } from "@/lib/api/types";

export default function VesselsPage() {
  const [fleet, setFleet] = useState<FleetResponse | null>(null);
  const [zones, setZones] = useState<MonitoringZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load available observation areas
  useEffect(() => {
    async function loadZones() {
      try {
        const fetchedZones = await monitoringApi.getZones();
        setZones(fetchedZones);
        if (fetchedZones.length > 0 && !selectedZoneId) {
          const defaultZone = fetchedZones.find(z => z.is_enabled && z.id.includes("oman")) || 
                              fetchedZones.find(z => z.is_enabled) || 
                              fetchedZones[0];
          setSelectedZoneId(defaultZone.id);
        }
      } catch (e) {
        console.warn("Could not fetch monitoring zones:", e);
      }
    }
    loadZones();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadFleet() {
      try {
        setIsLoading(true);
        const endpoint = selectedZoneId 
          ? `/ais/fleet?zone_id=${encodeURIComponent(selectedZoneId)}` 
          : '/ais/fleet';
        const data = await apiClient.get<FleetResponse>(endpoint);
        if (isMounted) {
          setFleet(data);
        }
      } catch (err) {
        console.warn("Could not fetch fleet data:", err);
        if (isMounted) {
          setFleet({
            provider: "Global Fishing Watch",
            status: "UNAVAILABLE",
            reason: "External AIS API is unavailable",
            retrieved_at: new Date().toISOString(),
            total: 0,
            vessels: [],
            active_investigations_count: 2
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadFleet();
    return () => {
      isMounted = false;
    };
  }, [selectedZoneId]);

  const filteredVessels = useMemo(() => {
    if (!fleet || !fleet.vessels) return [];
    if (!searchQuery.trim()) return fleet.vessels;
    const q = searchQuery.toLowerCase().trim();
    return fleet.vessels.filter(v => 
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.mmsi && v.mmsi.toLowerCase().includes(q)) ||
      (v.imo && v.imo.toLowerCase().includes(q))
    );
  }, [fleet, searchQuery]);

  const isLive = fleet?.status === "LIVE";

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
              <Ship className="w-6 h-6" />
              VESSELS IN OBSERVATION AREA
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              {fleet?.status === "LIVE" || fleet?.status === "EMPTY"
                ? `GFW-derived vessel presence for the selected observation area.`
                : "External AIS provider (Global Fishing Watch) is UNAVAILABLE."}
            </p>
            {(fleet?.status === "LIVE" || fleet?.status === "EMPTY") && fleet.observation_area && (
               <div className="mt-2 text-xs font-mono text-on-surface-variant flex flex-col gap-1">
                 <span>Observation Area: {fleet.observation_area.name}</span>
                 {fleet.presence_window && (
                    <span>Presence Window: {fleet.presence_window.start} to {fleet.presence_window.end}</span>
                 )}
               </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {zones.length > 0 && (
              <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded px-3 py-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-on-surface-variant font-medium">Area:</span>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="bg-transparent text-on-surface font-semibold focus:outline-none cursor-pointer"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id} className="bg-surface text-on-surface">
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              Export List
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 ${!isLive ? 'opacity-70' : ''}`}>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Vessels In Area</div>
              <div className="text-xl font-bold text-on-surface">
                {isLive ? fleet.total : "—"}
              </div>
            </div>
          </div>
          
          <div className={`bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 ${!isLive ? 'opacity-70' : ''}`}>
            <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">High Risk</div>
              <div className="text-xl font-bold text-on-surface">
                —
              </div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Investigations</div>
              <div className="text-xl font-bold text-on-surface">
                {fleet ? fleet.active_investigations_count : 2}
              </div>
            </div>
          </div>
          
          <div className={`bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 ${!isLive ? 'opacity-70' : ''}`}>
            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Anchored / Port</div>
              <div className="text-xl font-bold text-on-surface">
                Unavailable
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isLive ? "Search by Vessel Name, MMSI, or IMO number..." : "Search unavailable — Global Fishing Watch API token not configured"} 
            disabled={!isLive}
            className={`w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded text-sm focus:outline-none transition-shadow ${!isLive ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Vessel Table */}
        <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Vessel Identity</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Type & Flag</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Last Observed</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Risk</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-mono text-xs">
                    Querying AIS fleet provider...
                  </td>
                </tr>
              ) : fleet?.status === "UNAVAILABLE / REPORT_PENDING" ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-lg mx-auto">
                      <span className="text-[10px] font-bold font-mono tracking-widest bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant uppercase">
                        AIS: UNAVAILABLE / REPORT PENDING
                      </span>
                      <p className="text-sm font-semibold text-on-surface">GFW 4Wings report is still running</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Please try again later.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : fleet?.status === "EMPTY" || (isLive && filteredVessels.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                    {fleet?.status === "EMPTY" ? fleet.reason || "No verified GFW vessel presence detected in this observation area for the selected availability window." : "No vessels found matching your query."}
                  </td>
                </tr>
              ) : !isLive ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-lg mx-auto">
                      <span className="text-[10px] font-bold font-mono tracking-widest bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant uppercase">
                        AIS: UNAVAILABLE
                      </span>
                      <p className="text-sm font-semibold text-on-surface">Observation Area Fleet View is unavailable</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {fleet?.reason || "External AIS provider (Global Fishing Watch) is unavailable."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVessels.map((vessel) => (
                  <tr key={vessel.id || vessel.mmsi} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{vessel.name || 'UNKNOWN VESSEL'}</div>
                      <div className="font-mono text-xs text-on-surface-variant">
                        MMSI: {vessel.mmsi || 'N/A'}{vessel.imo ? ` • IMO: ${vessel.imo}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-on-surface">{vessel.vessel_type || 'Commercial'}</div>
                      <div className="font-mono text-[11px] text-on-surface-variant">{vessel.flag || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {vessel.last_observed_at ? (
                        <div className="font-mono text-xs text-on-surface">
                           <span className="block text-[10px] text-on-surface-variant mb-0.5">
                              {new Date(vessel.last_observed_at).toISOString().slice(0, 19).replace('T', ' ')}Z
                           </span>
                           <span className="text-[10px] text-on-surface-variant italic">
                             Aggregated Grid Cell Center ({vessel.presence_hours ?? 1}h presence)
                           </span>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant italic">Time unavailable</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-surface-variant text-on-surface-variant border border-outline-variant">
                        {vessel.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant border border-outline-variant">
                        {vessel.risk_level === 'NOT_ASSESSED' ? 'Not assessed' : vessel.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {vessel.mmsi ? (
                        <Link 
                          href={`/vessels/${vessel.mmsi}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

