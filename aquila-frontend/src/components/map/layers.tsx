"use client";

// @ts-nocheck
import { useEffect } from "react";
import { useMap } from "./MapLibreCanvas";

export function GeoJSONLayer({
  id,
  data,
  type,
  paint,
  layout = {},
}: {
  id: string;
  data: any;
  type: "fill" | "line" | "circle" | "symbol";
  paint: any;
  layout?: any;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data,
      });
    }

    if (!map.getLayer(id)) {
      // @ts-ignore
      map.addLayer({
        id,
        type,
        source: id,
        paint,
        layout,
      });
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, id, data, type, paint, layout]);

  // Update data if it changes
  useEffect(() => {
    if (!map) return;
    // @ts-ignore
    let source = map.getSource(id);
    if (source) {
      // @ts-ignore
      source.setData(data);
    }
  }, [map, id, data]);

  return null;
}

export function SlickLayer({ center, visible = true }: { center: [number, number], visible?: boolean }) {
  // Generate a mock polygon around the center
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
              [center[0] - 0.02, center[1] + 0.03],
              [center[0] + 0.04, center[1] + 0.02],
              [center[0] + 0.06, center[1] - 0.01],
              [center[0] - 0.05, center[1] - 0.02],
            ],
          ],
        },
      },
    ],
  };

  return (
    <>
      <GeoJSONLayer
        id="slick-fill"
        data={data}
        type="fill"
        paint={{
          "fill-color": "#46d9eb",
          "fill-opacity": visible ? 0.3 : 0,
        }}
      />
      <GeoJSONLayer
        id="slick-outline"
        data={data}
        type="line"
        paint={{
          "line-color": "#28c7d9",
          "line-width": 2,
          "line-opacity": visible ? 1 : 0,
        }}
      />
    </>
  );
}

export function OriginRegionLayer({ center, radiusKm, visible = true }: { center: [number, number], radiusKm: number, visible?: boolean }) {
  // Approximate a circle with a polygon (1 deg ~ 111km)
  const deg = radiusKm / 111;
  const points = 32;
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    coords.push([
      center[0] + Math.cos(angle) * deg,
      center[1] + Math.sin(angle) * deg,
    ]);
  }

  const data = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };

  return (
    <>
      <GeoJSONLayer
        id="origin-fill"
        data={data}
        type="fill"
        paint={{
          "fill-color": "#ffc862",
          "fill-opacity": visible ? 0.15 : 0,
        }}
      />
      <GeoJSONLayer
        id="origin-outline"
        data={data}
        type="line"
        paint={{
          "line-color": "#e5ab35",
          "line-width": 2,
          "line-dasharray": [2, 2],
          "line-opacity": visible ? 0.8 : 0,
        }}
      />
    </>
  );
}

export function VesselTracksLayer({ candidates, selectedMmsi, visible = true }: { candidates: any[], selectedMmsi?: string | null, visible?: boolean }) {
  
  return (
    <>
      {candidates.map((c, i) => {
        const isSelected = selectedMmsi === c.mmsi;
        const color = isSelected ? "#ffb4ab" : (c.confidenceState === "HIGH" ? "#ffb4ab" : "#bbc9cb");
        
        // Mock track points starting from origin to last known position
        const track = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [58.1500 + (i - 1)*0.05, 24.4800 + (i - 1)*0.05], // near origin
              c.lastKnownPosition
            ]
          }
        };

        const point = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: c.lastKnownPosition
          },
          properties: {
            mmsi: c.mmsi,
            name: c.name
          }
        };

        return (
          <div key={c.mmsi}>
             <GeoJSONLayer
                id={`track-${c.mmsi}`}
                data={track}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": isSelected ? 3 : 1.5,
                  "line-opacity": visible ? (isSelected ? 1 : 0.4) : 0,
                  "line-dasharray": [1, 2]
                }}
              />
              <GeoJSONLayer
                id={`point-${c.mmsi}`}
                data={point}
                type="circle"
                paint={{
                  "circle-radius": isSelected ? 8 : 5,
                  "circle-color": color,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#001525",
                  "circle-opacity": visible ? 1 : 0,
                  "circle-stroke-opacity": visible ? 1 : 0,
                }}
              />
          </div>
        );
      })}
    </>
  );
}

export function TrajectoryLayer({ origin, slick, visible = true }: { origin: [number, number], slick: [number, number], visible?: boolean }) {
  const data = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [origin, slick]
    }
  };

  return (
    <>
      <GeoJSONLayer
        id="trajectory-line"
        data={data}
        type="line"
        paint={{
          "line-color": "#4ade80",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": visible ? 0.8 : 0,
        }}
      />
    </>
  );
}
