"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Map context so child layers can access the map instance
export const MapContext = createContext<MapLibreMap | null>(null);

export function useMap() {
  return useContext(MapContext);
}

interface MapLibreCanvasProps {
  className?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  onMapLoaded?: (map: MapLibreMap) => void;
  darkTheme?: boolean;
  children?: React.ReactNode;
}

export function MapLibreCanvas({
  className,
  center = [0, 20],
  zoom = 2,
  pitch = 0,
  bearing = 0,
  onMapLoaded,
  darkTheme = false,
  children
}: MapLibreCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Use CartoDB Positron for a clean, light, professional basemap
    const styleUrl = darkTheme 
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: styleUrl,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    mapRef.current = map;

    map.on("load", () => {
      setMapInstance(map);
      if (onMapLoaded) {
        onMapLoaded(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [bearing, center, darkTheme, onMapLoaded, pitch, zoom]);

  // Update map parameters if they change
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
      mapInstance.setPitch(pitch);
      mapInstance.setBearing(bearing);
    }
  }, [mapInstance, center, zoom, pitch, bearing]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      <MapContext.Provider value={mapInstance}>
        {mapInstance && children}
      </MapContext.Provider>
    </div>
  );
}
