"use client";

import { mockDataSources } from "@/lib/mockData";
import { Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Satellite, Radio, Wind, Droplets, Activity } from "lucide-react";

export default function SourcesPage() {
  
  const getIcon = (type: string) => {
    switch(type) {
      case 'SAR': return <Satellite className="w-5 h-5" />;
      case 'OPTICAL': return <Satellite className="w-5 h-5" />;
      case 'AIS': return <Radio className="w-5 h-5" />;
      case 'METEOROLOGICAL': return <Wind className="w-5 h-5" />;
      case 'OCEANOGRAPHIC': return <Droplets className="w-5 h-5" />;
      case 'MODEL': return <Activity className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
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
          
          <button 
            onClick={() => alert("Status refresh unavailable in DEMO.")}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface hover:text-primary hover:bg-surface-container-high transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDataSources.map(source => (
            <div key={source.id} className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${
                    source.status === 'OPERATIONAL' ? 'bg-success/10 text-success' : 
                    source.status === 'DEGRADED' ? 'bg-tertiary/10 text-tertiary' : 
                    'bg-error/10 text-error'
                  }`}>
                    {getIcon(source.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface text-base tracking-tight">{source.name}</h3>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">{source.provider}</div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 bg-surface-container-lowest">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-on-surface-variant">System Status</span>
                    {source.status === 'OPERATIONAL' ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                      </span>
                    ) : source.status === 'DEGRADED' ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-tertiary">
                        <AlertTriangle className="w-3.5 h-3.5" /> Degraded
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-error">
                        <XCircle className="w-3.5 h-3.5" /> Offline
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
                    <span className="text-[11px] font-medium text-on-surface-variant">Data Type</span>
                    <span className="font-mono text-xs text-on-surface font-medium px-2 py-0.5 bg-surface-container-high rounded border border-outline-variant">{source.type}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
                    <span className="text-[11px] font-medium text-on-surface-variant">Resolution</span>
                    <span className="font-mono text-xs text-on-surface">{source.resolution}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
                    <span className="text-[11px] font-medium text-on-surface-variant">Last Ingestion</span>
                    <span className="font-mono text-xs text-on-surface">{new Date(source.lastUpdate).toISOString().slice(11, 16)}Z</span>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-surface-container-low border-t border-outline-variant text-[10px] text-on-surface-variant font-medium">
                Coverage: <span className="text-on-surface">{source.coverage}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
