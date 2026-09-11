"use client";

import { useState, useEffect } from "react";
import { systemApi } from "@/lib/api/system";
import { SystemStatus, SourceHealthItem } from "@/lib/api/types";
import { Database, Satellite, Radio, Activity, Cloud, Cpu, Compass } from "lucide-react";

export default function SourcesPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    systemApi.getStatus()
      .then(res => setStatus(res))
      .catch(err => console.error("Failed to fetch system status", err));
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'cdse': return <Satellite className="w-5 h-5" />;
      case 'firebase': return <Cloud className="w-5 h-5" />;
      case 'gfw': return <Radio className="w-5 h-5" />;
      case 'open_meteo': return <Cloud className="w-5 h-5" />;
      case 'opendrift': return <Compass className="w-5 h-5" />;
      case 'ml_model': return <Cpu className="w-5 h-5" />;
      case 'sqlite': return <Database className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getProviderName = (type: string) => {
    switch(type) {
      case 'cdse': return 'Copernicus Data Space Ecosystem';
      case 'firebase': return 'Firebase Backend Services';
      case 'gfw': return 'Global Fishing Watch';
      case 'open_meteo': return 'Open-Meteo Environmental Service';
      case 'opendrift': return 'OpenDrift Trajectory Engine';
      case 'ml_model': return 'Look-Alike ML Model';
      case 'sqlite': return 'Local Database';
      default: return type;
    }
  };

  const getStatusBadge = (rawStatus: string) => {
    const s = (rawStatus || '').toUpperCase();
    switch (s) {
      case 'LIVE':
        return {
          label: 'LIVE',
          classes: 'bg-success/10 text-success border-success/20',
        };
      case 'READY':
        return {
          label: 'READY',
          classes: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'CONFIGURED':
        return {
          label: 'CONFIGURED',
          classes: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'UNAVAILABLE':
        return {
          label: 'UNAVAILABLE',
          classes: 'bg-surface-variant/80 text-on-surface-variant border-outline-variant',
        };
      case 'DEGRADED':
        return {
          label: 'DEGRADED',
          classes: 'bg-tertiary/10 text-tertiary border-tertiary/20',
        };
      case 'DEMO_MOCK':
        return {
          label: 'DEMO_MOCK',
          classes: 'bg-secondary/10 text-secondary border-secondary/20',
        };
      case 'ERROR':
      default:
        return {
          label: s || 'ERROR',
          classes: 'bg-error/10 text-error border-error/20',
        };
    }
  };

  const sourcesList: { key: string; item: Partial<SourceHealthItem> & { status: string } }[] = [];

  if (status?.sources) {
    for (const [k, v] of Object.entries(status.sources)) {
      sourcesList.push({ key: k, item: v });
    }
  } else if (status?.providers) {
    for (const [k, v] of Object.entries(status.providers)) {
      sourcesList.push({
        key: k,
        item: {
          id: k,
          name: getProviderName(k),
          provider: k.toUpperCase(),
          status: v,
          mode: v === 'READY' ? 'LOCAL' : v,
          configured: v !== 'UNAVAILABLE',
          available: v === 'LIVE' || v === 'READY',
          last_checked: '',
          reason: null,
          provenance: null,
        }
      });
    }
  }

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
              <Database className="w-6 h-6" />
              INTELLIGENCE SOURCES
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Status and health monitoring for all connected satellite constellations, telemetry APIs, and environmental models.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface hover:text-primary hover:bg-surface-container-high transition-colors shadow-sm opacity-50 cursor-not-allowed" title="Alert policies configured via environment">
              Configure Alerts
            </button>
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm opacity-50 cursor-not-allowed" title="System profile: Forensic Intelligence Runtime">
              System Profile
            </button>
          </div>
        </div>

        {/* Source Cards */}
        {sourcesList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sourcesList.map(({ key, item }) => {
              const badge = getStatusBadge(item.status);
              const displayName = item.name || getProviderName(key);
              const providerLabel = item.provider || key.toUpperCase();

              return (
                <div key={key} className="bg-surface border border-outline-variant rounded shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-primary">
                          {getIcon(key)}
                        </div>
                        <div>
                          <h3 className="font-bold text-on-surface">{displayName}</h3>
                          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">{providerLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.mode && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/40 uppercase">
                            {item.mode}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="my-3 space-y-1.5 text-xs text-on-surface-variant">
                      {item.reason && (
                        <p className="leading-relaxed text-[12px] text-on-surface-variant/90">
                          {item.reason}
                        </p>
                      )}
                      {item.provenance && (
                        <p className="text-[11px] font-mono text-outline truncate" title={item.provenance}>
                          <span className="text-outline-variant uppercase mr-1">PROVENANCE:</span>
                          {item.provenance}
                        </p>
                      )}
                      {item.last_checked && (
                        <p className="text-[10px] text-outline">
                          Checked: {item.last_checked.replace('T', ' ').slice(0, 19)} UTC
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/20 flex gap-2">
                    <button
                      disabled
                      className="flex-1 py-2 bg-surface-lowest border border-outline-variant rounded text-xs font-bold text-on-surface-variant opacity-50 cursor-not-allowed"
                      title="Direct task queue not applicable for this provider"
                    >
                      View Queue
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
