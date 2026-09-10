"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

const DEFAULT_SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function getBasemapStyle(darkTheme = false): string | StyleSpecification {
  const customStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  const apiKey = process.env.NEXT_PUBLIC_MAP_API_KEY || "";

  if (customStyleUrl && customStyleUrl.trim() !== "") {
    return customStyleUrl.replace("{key}", apiKey);
  }

  const rawTileUrl = (process.env.NEXT_PUBLIC_MAP_TILE_URL && process.env.NEXT_PUBLIC_MAP_TILE_URL.trim() !== "")
    ? process.env.NEXT_PUBLIC_MAP_TILE_URL
    : DEFAULT_SATELLITE_TILE_URL;
  const tileUrl = rawTileUrl.replace("{key}", apiKey);

  return {
    version: 8,
    sources: {
      "geographic-basemap": {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 19,
        attribution: "&copy; Esri, Maxar, Earthstar Geographics"
      }
    },
    layers: [
      {
        id: "geographic-basemap-layer",
        type: "raster",
        source: "geographic-basemap",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": 1.0
        }
      }
    ]
  };
}

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

  const onMapLoadedRef = useRef(onMapLoaded);
  useEffect(() => {
    onMapLoadedRef.current = onMapLoaded;
  }, [onMapLoaded]);

  const initialCenter = useRef(center);
  const initialZoom = useRef(zoom);
  const initialPitch = useRef(pitch);
  const initialBearing = useRef(bearing);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const style = getBasemapStyle(darkTheme);

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: style,
      center: initialCenter.current,
      zoom: initialZoom.current,
      pitch: initialPitch.current,
      bearing: initialBearing.current,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    mapRef.current = map;

    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__aquila_map = map;
    }

    map.on("error", (e) => {
      console.error("[MapLibre] Error:", e);
    });

    map.on("style.load", () => {
      console.log("[MapLibre] Style load event fired");
      map.resize();
      setMapInstance(map);
    });

    map.on("load", () => {
      console.log("[MapLibre] Map load event fired. Dimensions:", map.getCanvas().width, "x", map.getCanvas().height);
      map.resize();
      setMapInstance(map);
      if (onMapLoadedRef.current) {
        onMapLoadedRef.current(map);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      if (typeof window !== "undefined") {
        delete (window as unknown as Record<string, unknown>).__aquila_map;
      }
    };
  }, [darkTheme]);

  // Update map parameters only if values actually change
  const prevCenterRef = useRef<[number, number]>(center);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    if (mapInstance) {
      const centerChanged = prevCenterRef.current[0] !== center[0] || prevCenterRef.current[1] !== center[1];
      const zoomChanged = prevZoomRef.current !== zoom;

      if (centerChanged) {
        prevCenterRef.current = center;
        mapInstance.setCenter(center);
      }
      if (zoomChanged) {
        prevZoomRef.current = zoom;
        mapInstance.setZoom(zoom);
      }
      mapInstance.setPitch(pitch);
      mapInstance.setBearing(bearing);
    }
  }, [mapInstance, center, zoom, pitch, bearing]);

  return (
    <div className={cn("relative w-full h-full min-h-[450px]", className)}>
      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[450px]" 
        style={{ width: "100%", height: "100%", minHeight: "450px" }}
      />
      
      <MapContext.Provider value={mapInstance}>
        {mapInstance && children}
      </MapContext.Provider>
    </div>
  );
}
