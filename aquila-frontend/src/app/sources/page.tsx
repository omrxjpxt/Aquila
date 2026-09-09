"use client";

import { useState, useEffect } from "react";
import { systemApi } from "@/lib/api/system";
import { SystemStatus } from "@/lib/api/types";
import { Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Satellite, Radio, Activity, Cloud } from "lucide-react";

export default function SourcesPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = () => {
    setIsLoading(true);
    systemApi.getStatus()
      .then(res => setStatus(res))
      .catch(err => console.error("Failed to fetch system status", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    systemApi.getStatus()
      .then(res => setStatus(res))
      .catch(err => console.error("Failed to fetch system status", err))
      .finally(() => setIsLoading(false));
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'cdse': return <Satellite className="w-5 h-5" />;
      case 'firebase': return <Cloud className="w-5 h-5" />;
      case 'gfw': return <Radio className="w-5 h-5" />;
      case 'sqlite': return <Database className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getProviderName = (type: string) => {
    switch(type) {
      case 'cdse': return 'Copernicus Data Space Ecosystem';
      case 'firebase': return 'Firebase Backend Services';
      case 'gfw': return 'Global Fishing Watch';
      case 'sqlite': return 'Local Database';
      default: return type;
    }
  };

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
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface hover:text-primary hover:bg-surface-container-high transition-colors shadow-sm opacity-50 cursor-not-allowed" title="Notifications unavailable">
              Configure Alerts
            </button>
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm opacity-50 cursor-not-allowed" title="Profile unavailable">
              System Profile
            </button>
          </div>
        </div>

        {/* Source Cards */}
        {status && status.providers && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(status.providers).map(([key, compStatus]) => (
              <div key={key} className="bg-surface border border-outline-variant rounded shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-primary">
                      {getIcon(key)}
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{getProviderName(key)}</h3>
                      <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">{key}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                    compStatus === 'ok'
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-error/10 text-error border-error/20'
                  }`}>
                    {compStatus === 'ok' ? 'CONNECTED' : 'ERROR'}
                  </span>
                </div>
                
                <div className="mt-auto pt-4 flex gap-2">
                  <button disabled className="flex-1 py-2 bg-surface-lowest border border-outline-variant rounded text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-surface transition-colors opacity-50 cursor-not-allowed" title="Task Queue unavailable">
                    View Queue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
