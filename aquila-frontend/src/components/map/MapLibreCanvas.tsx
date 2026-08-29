"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface MapLibreCanvasProps {
  className?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  onMapLoaded?: (map: MapLibreMap) => void;
  darkTheme?: boolean;
}

export function MapLibreCanvas({
  className,
  center = [0, 20],
  zoom = 2,
  pitch = 0,
  bearing = 0,
  onMapLoaded,
  darkTheme = true
}: MapLibreCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // CartoDB Dark Matter as a free proxy for a deep ocean tactical map
    const styleUrl = darkTheme 
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setIsLoaded(true);
      if (onMapLoaded) {
        onMapLoaded(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [bearing, center, darkTheme, onMapLoaded, pitch, zoom]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-lowest)] z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[var(--color-on-surface-variant)] text-sm font-mono uppercase tracking-widest">
              Initializing Engine...
            </span>
          </div>
        </div>
      )}
      
      {/* Scanline overlay for aesthetic */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-0 opacity-10"></div>
    </div>
  );
}
