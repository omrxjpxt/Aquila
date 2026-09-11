"use client";

import React, { useState } from "react";
import { X, MapPin, Check, AlertCircle, Loader2 } from "lucide-react";
import { monitoringApi } from "@/lib/api/monitoring";
import { MonitoringZone } from "@/lib/api/types";

interface SetObservationAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAreaSaved: (zone: MonitoringZone) => void;
  currentZone?: MonitoringZone | null;
}

const PRESETS = [
  {
    name: "Gulf of Oman (Standard Monitoring)",
    bbox: [58.0, 24.0, 58.5, 24.5] as [number, number, number, number],
    desc: "Primary testbed with known maritime traffic & radar coverage"
  },
  {
    name: "Strait of Hormuz Chokepoint",
    bbox: [56.0, 26.0, 57.0, 27.0] as [number, number, number, number],
    desc: "High density tanker corridor entering Persian Gulf"
  },
  {
    name: "Arabian Sea Offshore",
    bbox: [60.0, 22.0, 62.0, 24.0] as [number, number, number, number],
    desc: "Deep-water international shipping corridor"
  }
];

export function SetObservationAreaModal({
  isOpen,
  onClose,
  onAreaSaved,
  currentZone
}: SetObservationAreaModalProps) {
  const [name, setName] = useState(currentZone?.name || "Gulf of Oman (Configured Monitoring Area)");
  const [minLon, setMinLon] = useState(currentZone?.bbox ? currentZone.bbox[0].toString() : "58.0");
  const [minLat, setMinLat] = useState(currentZone?.bbox ? currentZone.bbox[1].toString() : "24.0");
  const [maxLon, setMaxLon] = useState(currentZone?.bbox ? currentZone.bbox[2].toString() : "58.5");
  const [maxLat, setMaxLat] = useState(currentZone?.bbox ? currentZone.bbox[3].toString() : "24.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setMinLon(preset.bbox[0].toString());
    setMinLat(preset.bbox[1].toString());
    setMaxLon(preset.bbox[2].toString());
    setMaxLat(preset.bbox[3].toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setError("Please enter valid numeric coordinates for all bounding box limits.");
      return;
    }

    if (parsedMinLon >= parsedMaxLon) {
      setError("Min Longitude must be strictly less than Max Longitude.");
      return;
    }

    if (parsedMinLat >= parsedMaxLat) {
      setError("Min Latitude must be strictly less than Max Latitude.");
      return;
    }

    setLoading(true);
    try {
      const saved = await monitoringApi.saveZone({
        name: name.trim() || "Configured Observation Area",
        bbox: [parsedMinLon, parsedMinLat, parsedMaxLon, parsedMaxLat],
        collection_filter: "sentinel-1-grd",
        is_enabled: true
      });
      onAreaSaved(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save observation area");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Set Observation Area
              </h2>
              <p className="text-[11px] text-outline font-medium">
                Configure persistent continuous monitoring AOI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-xs text-error flex items-start gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Standard Maritime Presets
            </label>
            <div className="space-y-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="w-full text-left p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low hover:border-primary/40 transition-colors group flex items-start justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-outline">{p.desc}</div>
                    <div className="text-[10px] font-mono text-outline mt-0.5">
                      BBOX: [{p.bbox.join(", ")}]
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary/5 border border-primary/20 shrink-0 ml-2">
                    Use
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Area Name */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Observation Area Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
              placeholder="e.g. Gulf of Oman AOI"
            />
          </div>

          {/* Bounding Box Inputs */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Bounding Box Coordinates (Degrees)
            </label>
            <div className="grid grid-cols-2 gap-3 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant">
              <div>
                <span className="text-[10px] font-mono text-outline uppercase">Min Longitude (West)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={minLon}
                  onChange={(e) => setMinLon(e.target.value)}
                  required
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-outline uppercase">Min Latitude (South)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={minLat}
                  onChange={(e) => setMinLat(e.target.value)}
                  required
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-outline uppercase">Max Longitude (East)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={maxLon}
                  onChange={(e) => setMaxLon(e.target.value)}
                  required
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-outline uppercase">Max Latitude (North)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={maxLat}
                  onChange={(e) => setMaxLat(e.target.value)}
                  required
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <p className="text-[10px] text-outline font-mono mt-1.5">
              Coordinates are validated and persisted to database. Active worker will monitor CDSE acquisitions intersecting this bounding box.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-outline hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Area...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Observation Area</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
