"use client";

import { mockAlerts, mockVessels } from "@/lib/mockData";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { Activity, AlertTriangle, ShieldAlert, WifiOff, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";
import { GeoJSONLayer } from "@/components/map/layers";

export default function MonitoringPage() {
  
  const activeAlerts = mockAlerts;
  
  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'ANOMALY_DETECTED': return <ShieldAlert className="w-4 h-4 text-error" />;
      case 'AIS_GAP': return <WifiOff className="w-4 h-4 text-tertiary" />;
      case 'VESSEL_DEVIATION': return <Activity className="w-4 h-4 text-tertiary" />;
      default: return <AlertTriangle className="w-4 h-4 text-primary" />;
    }
  };

  // Create point features for alerts that have locations
  const alertPoints = {
    type: "FeatureCollection",
    features: activeAlerts.filter(a => a.location).map(a => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: a.location },
      properties: { severity: a.severity }
    }))
  };

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-surface-lowest flex">
      
      {/* Left Panel: Global Alerts Feed */}
      <aside className="w-[400px] h-full flex flex-col border-r border-outline-variant bg-surface-lowest shrink-0 z-10">
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
          <h1 className="text-xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
            <Activity className="w-5 h-5" />
            LIVE MONITORING
          </h1>
          <p className="text-xs text-on-surface-variant">
            Real-time anomaly detection and vessel behavioral alerts.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="bg-surface border border-outline-variant rounded shadow-sm p-4 hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${
                    alert.severity === 'CRITICAL' ? 'bg-error/10' :
                    alert.severity === 'HIGH' ? 'bg-tertiary/10' :
                    'bg-primary/10'
                  }`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <span className="font-bold text-xs text-on-surface uppercase tracking-wider">{alert.title}</span>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {new Date(alert.timestamp).toISOString().slice(11,16)}Z
                </span>
              </div>
              
              <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                {alert.description}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/50">
                {alert.location && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
                    <MapPin className="w-3 h-3" />
                    {alert.location[1].toFixed(2)}°N, {alert.location[0].toFixed(2)}°E
                  </div>
                )}
                
                {alert.relatedIncident && (
                  <Link href={`/investigation/${alert.relatedIncident}`} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline ml-auto">
                    View Incident <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="flex-1 relative bg-[#eef4f8]">
        <MapLibreCanvas center={[58.2, 24.4]} zoom={6}>
          {/* Render alert locations */}
          <GeoJSONLayer
            id="alert-locations"
            data={alertPoints as GeoJSON.FeatureCollection}
            type="circle"
            paint={{
              "circle-color": [
                "match",
                ["get", "severity"],
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
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Monitored Vessels</div>
            <div className="text-2xl font-bold text-primary">{mockVessels.length}</div>
            <div className="text-[10px] text-success font-medium mt-1">↑ Active Telemetry</div>
          </div>
          <div className="bg-surface/90 backdrop-blur border border-outline-variant p-4 rounded shadow-sm pointer-events-auto min-w-[160px]">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Alerts</div>
            <div className="text-2xl font-bold text-error">{activeAlerts.length}</div>
            <div className="text-[10px] text-error font-medium mt-1">Requires Attention</div>
          </div>
        </div>
      </main>

    </div>
  );
}
