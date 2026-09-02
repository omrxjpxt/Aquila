import { useEffect } from "react";
import { useMap } from "./MapLibreCanvas";
import type { LayerSpecification, GeoJSONSource } from "maplibre-gl";

import { VesselCandidate } from "@/lib/api/types";
export function GeoJSONLayer({
  id,
  data,
  type,
  paint,
  layout = {},
  visible = true,
}: {
  id: string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature | string;
  type: "fill" | "line" | "circle" | "symbol";
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  visible?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: data as GeoJSON.GeoJSON,
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type,
        source: id,
        paint,
        layout,
      } as LayerSpecification);
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, id, data, type, paint, layout]);

  // Update data if it changes
  useEffect(() => {
    if (!map) return;
    const source = map.getSource(id) as GeoJSONSource | undefined;
    if (source && typeof data !== 'string') {
      source.setData(data as GeoJSON.GeoJSON);
    }
  }, [map, id, data]);

  // Handle visibility
  useEffect(() => {
    if (!map) return;
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  }, [map, id, visible]);

  return null;
}

export function SlickLayer({ center, visible = true }: { center: [number, number], visible?: boolean }) {
  const data = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [center[0] - 0.05, center[1] - 0.02],
              [center[0] - 0.02, center[1] + 0.04],
              [center[0] + 0.06, center[1] + 0.03],
              [center[0] + 0.04, center[1] - 0.03],
              [center[0] - 0.05, center[1] - 0.02],
            ],
          ],
        },
        properties: {}
      },
    ],
  };

  return (
    <>
      <GeoJSONLayer
        id="slick-fill"
        data={data as GeoJSON.FeatureCollection}
        type="fill"
        visible={visible}
        paint={{
          "fill-color": "#46d9eb",
          "fill-opacity": 0.3,
        }}
      />
      <GeoJSONLayer
        id="slick-outline"
        data={data as GeoJSON.FeatureCollection}
        type="line"
        visible={visible}
        paint={{
          "line-color": "#28c7d9",
          "line-width": 2,
          "line-opacity": 1,
        }}
      />
    </>
  );
}

export function OriginRegionLayer({ geometry, center, radiusKm, visible = true }: { geometry?: GeoJSON.Polygon, center?: [number, number], radiusKm?: number, visible?: boolean }) {
  let finalGeometry: GeoJSON.Polygon | null = null;
  
  if (geometry) {
    finalGeometry = geometry;
  } else if (center && radiusKm) {
    const deg = radiusKm / 111;
    const points = 32;
    const coords = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const rad = (angle * Math.PI) / 180;
      coords.push([center[0] + deg * Math.cos(rad), center[1] + deg * Math.sin(rad)]);
    }
    finalGeometry = {
      type: "Polygon",
      coordinates: [coords],
    };
  }
  
  if (!finalGeometry) return null;

  const data = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: finalGeometry,
        properties: {}
      },
    ],
  };

  return (
    <>
      <GeoJSONLayer
        id="origin-fill"
        data={data as GeoJSON.FeatureCollection}
        type="fill"
        visible={visible}
        paint={{
          "fill-color": "#ffc862",
          "fill-opacity": 0.15,
        }}
      />
      <GeoJSONLayer
        id="origin-outline"
        data={data as GeoJSON.FeatureCollection}
        type="line"
        visible={visible}
        paint={{
          "line-color": "#e5ab35",
          "line-width": 2,
          "line-opacity": 0.8,
        }}
      />
    </>
  );
}

export function TrajectoryLayer({ coordinates, origin, slick, visible = true }: { coordinates?: number[][], origin?: [number, number], slick?: [number, number], visible?: boolean }) {
  let finalCoords: number[][] = [];
  if (coordinates) {
    finalCoords = coordinates;
  } else if (origin && slick) {
    finalCoords = [slick, origin];
  }
  
  if (finalCoords.length === 0) return null;

  const data = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: finalCoords,
    },
    properties: {}
  };

  return (
    <GeoJSONLayer
      id="drift-trajectory"
      data={data as GeoJSON.Feature}
      type="line"
      visible={visible}
      paint={{
        "line-color": "#ffc862",
        "line-width": 2,
        "line-dasharray": [2, 2],
        "line-opacity": 0.8
      }}
    />
  );
}

export function VesselTracksLayer({ candidates, selectedMmsi, visible = true }: { candidates: VesselCandidate[], selectedMmsi: string | null, visible?: boolean }) {
  return (
    <>
      {candidates.map((c) => {
        const isSelected = selectedMmsi === c.identity.mmsi;
        const color = isSelected ? "#00647C" : (c.spatially_relevant && c.temporally_relevant ? "#8BA2A6" : "#cbd5e1");
        
        // 1. Plot the observed segments
        const trackGeoJSON = {
          type: "Feature",
          geometry: c.track.geometry,
          properties: {}
        };
        
        // 2. Plot the gaps (if any)
        const gapGeoJSON = c.track.gap_geometry ? {
          type: "Feature",
          geometry: c.track.gap_geometry,
          properties: {}
        } : null;

        // 3. Plot the current position (last known)
        const lastPos = c.track.positions[c.track.positions.length - 1];
        const pointGeoJSON = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lastPos.lon, lastPos.lat]
          },
          properties: {}
        };

        return (
          <div key={c.identity.mmsi}>
            {gapGeoJSON && (
              <GeoJSONLayer
                id={`gap-${c.identity.mmsi}`}
                data={gapGeoJSON as GeoJSON.Feature}
                type="line"
                visible={visible}
                paint={{
                  "line-color": "#eab308", // Yellow to indicate GAP explicitly
                  "line-width": isSelected ? 3 : 1.5,
                  "line-opacity": isSelected ? 0.8 : 0.4,
                  "line-dasharray": [2, 3]
                }}
              />
            )}
            <GeoJSONLayer
              id={`track-${c.identity.mmsi}`}
              data={trackGeoJSON as GeoJSON.Feature}
              type="line"
              visible={visible}
              paint={{
                "line-color": color,
                "line-width": isSelected ? 3 : 1.5,
                "line-opacity": isSelected ? 1 : 0.4,
              }}
            />
            <GeoJSONLayer
              id={`point-${c.identity.mmsi}`}
              data={pointGeoJSON as GeoJSON.Feature}
              type="circle"
              visible={visible}
              paint={{
                "circle-color": color,
                "circle-radius": isSelected ? 6 : 4,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": isSelected ? 1 : 0.6
              }}
            />
          </div>
        );
      })}
    </>
  );
}
