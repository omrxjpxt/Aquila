import math
from typing import List, Any, Optional
from datetime import datetime, timedelta, timezone
from shapely.geometry import Point, Polygon, LineString

from app.schemas.ais import (
    AISPosition, 
    VesselIdentity, 
    AISTrack, 
    AISGap, 
    VesselCandidate, 
    AISProvenance
)
from app.schemas.drift import OriginEstimate

class AISProvider:
    """Interface for AIS data retrieval."""
    
    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                                  start_time: datetime, end_time: datetime) -> List[AISPosition]:
        raise NotImplementedError
        
    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        raise NotImplementedError


class MockAISProvider(AISProvider):
    """
    Deterministic mockup of an AIS Provider for demonstration purposes.
    Generates tracks that intersect or bypass the target area.
    DO NOT PRESENT THESE RESULTS AS REAL OBSERVED TRACKS.
    """
    
    def __init__(self, origin_est: OriginEstimate):
        # We use the origin_est to deterministically anchor our mock vessels near it
        poly_coords = origin_est.geometry["coordinates"][0]
        self.target_lon = sum(p[0] for p in poly_coords[:-1]) / (len(poly_coords) - 1)
        self.target_lat = sum(p[1] for p in poly_coords[:-1]) / (len(poly_coords) - 1)
        self.release_time = origin_est.estimated_time
        
    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                                  start_time: datetime, end_time: datetime) -> List[AISPosition]:
        # Generate 3 mock vessels
        # V1: Intersects at release time, but has a 2-hour gap right over the origin.
        # V2: Passes nearby 1 hour later (no gap).
        # V3: Far away, irrelevant.
        
        positions = []
        
        # V1: "111111111" (Tanker) - Moving West to East directly through target
        v1_mmsi = "111111111"
        v1_speed_deg_per_hr = 0.1
        for i in range(-12, 13):
            # Introduce a GAP between -1 and +1 hours around release time
            if -1 <= i <= 1:
                continue
            
            t = self.release_time + timedelta(hours=i)
            if start_time <= t <= end_time:
                lon = self.target_lon + (i * v1_speed_deg_per_hr)
                lat = self.target_lat
                positions.append(AISPosition(
                    timestamp=t, lon=lon, lat=lat, speed_knots=12.0, heading=90.0, quality="OBSERVED"
                ))
                
        # V2: "222222222" (Cargo) - Moving South to North, passing 0.2 deg East of target, 2 hours after release
        v2_mmsi = "222222222"
        v2_speed_deg_per_hr = 0.15
        for i in range(-12, 13):
            t = self.release_time + timedelta(hours=i)
            if start_time <= t <= end_time:
                # Passes closest at i=2
                lat = self.target_lat + ((i - 2) * v2_speed_deg_per_hr)
                lon = self.target_lon + 0.2
                positions.append(AISPosition(
                    timestamp=t, lon=lon, lat=lat, speed_knots=15.0, heading=0.0, quality="OBSERVED"
                ))

        # Add mmsi to positions dynamically for mock tracking
        # Pydantic schema doesn't have mmsi in AISPosition to save space per point, 
        # but we need it here to build tracks. We'll attach it dynamically.
        for p in positions:
            if p.lon < self.target_lon + 0.1 and p.lat == self.target_lat: # hacky way to tag V1
                p.__dict__["_mmsi"] = v1_mmsi
            elif p.lon == self.target_lon + 0.2:
                p.__dict__["_mmsi"] = v2_mmsi
                
        # Properly attach mmsi
        real_positions = []
        for i in range(-12, 13):
            if -1 <= i <= 1: continue
            t = self.release_time + timedelta(hours=i)
            if start_time <= t <= end_time:
                p = AISPosition(timestamp=t, lon=self.target_lon + (i * 0.1), lat=self.target_lat, speed_knots=12.0, heading=90.0)
                setattr(p, 'mmsi', "111111111")
                real_positions.append(p)
                
        for i in range(-12, 13):
            t = self.release_time + timedelta(hours=i)
            if start_time <= t <= end_time:
                p = AISPosition(timestamp=t, lon=self.target_lon + 0.2, lat=self.target_lat + ((i-2)*0.15), speed_knots=15.0, heading=0.0)
                setattr(p, 'mmsi', "222222222")
                real_positions.append(p)
                
        return real_positions

    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        ids = []
        for mmsi in mmsis:
            if mmsi == "111111111":
                ids.append(VesselIdentity(mmsi=mmsi, name="OCEANIC EXPLORER", vessel_type="Tanker", flag="LR"))
            elif mmsi == "222222222":
                ids.append(VesselIdentity(mmsi=mmsi, name="STELLA MARIS", vessel_type="Cargo", flag="PA"))
        return ids


class AISService:
    """
    Coordinates AIS data retrieval, track construction, and candidate filtering.
    """
    
    def __init__(self, provider: AISProvider):
        self.provider = provider
        
    def _build_track(self, mmsi: str, positions: List[AISPosition], gap_threshold_hours: float = 1.0) -> AISTrack:
        positions = sorted(positions, key=lambda x: x.timestamp)
        
        segments = []
        gap_segments = []
        gaps = []
        current_segment = []
        
        longest_gap = 0.0
        
        for i, pos in enumerate(positions):
            current_segment.append([pos.lon, pos.lat])
            
            if i < len(positions) - 1:
                next_pos = positions[i+1]
                dt_hours = (next_pos.timestamp - pos.timestamp).total_seconds() / 3600.0
                
                if dt_hours > gap_threshold_hours:
                    # Break segment
                    segments.append(current_segment)
                    current_segment = []
                    
                    gap_segments.append([
                        [pos.lon, pos.lat],
                        [next_pos.lon, next_pos.lat]
                    ])
                    
                    gaps.append(AISGap(
                        start_time=pos.timestamp,
                        end_time=next_pos.timestamp,
                        duration_hours=dt_hours,
                        start_lon=pos.lon,
                        start_lat=pos.lat,
                        end_lon=next_pos.lon,
                        end_lat=next_pos.lat
                    ))
                    
                    if dt_hours > longest_gap:
                        longest_gap = dt_hours
                        
        if current_segment:
            segments.append(current_segment)
            
        geometry = {"type": "MultiLineString", "coordinates": segments}
        gap_geometry = {"type": "MultiLineString", "coordinates": gap_segments} if gap_segments else None
        
        # Assess quality
        quality = "GOOD"
        if longest_gap > 6:
            quality = "POOR"
        elif longest_gap > 3:
            quality = "LIMITED"
        elif longest_gap > 1:
            quality = "MODERATE"
            
        return AISTrack(
            mmsi=mmsi,
            geometry=geometry,
            gap_geometry=gap_geometry,
            positions=positions,
            gaps=gaps,
            total_observations=len(positions),
            longest_gap_hours=longest_gap,
            coverage_quality=quality
        )

    async def discover_candidates(self, origin: OriginEstimate, start_time: datetime, end_time: datetime) -> List[VesselCandidate]:
        """
        Queries AIS in the bounding box of the origin region during the time window,
        builds tracks, and filters for spatial/temporal relevance.
        """
        
        # 1. Bounding box (rough approx for mock)
        poly = Polygon(origin.geometry["coordinates"][0])
        min_lon, min_lat, max_lon, max_lat = poly.bounds
        
        # Pad bounds by 0.5 deg
        min_lon -= 0.5
        min_lat -= 0.5
        max_lon += 0.5
        max_lat += 0.5
        
        # 2. Fetch raw positions
        raw_positions = await self.provider.fetch_raw_positions(min_lon, min_lat, max_lon, max_lat, start_time, end_time)
        
        # Group by MMSI
        pos_by_mmsi = {}
        for p in raw_positions:
            mmsi = getattr(p, 'mmsi', None)
            if not mmsi: continue
            if mmsi not in pos_by_mmsi:
                pos_by_mmsi[mmsi] = []
            pos_by_mmsi[mmsi].append(p)
            
        # 3. Build tracks
        tracks = {}
        for mmsi, positions in pos_by_mmsi.items():
            if len(positions) > 1:
                tracks[mmsi] = self._build_track(mmsi, positions)
                
        # 4. Fetch Identities
        identities = await self.provider.get_vessel_identities(list(tracks.keys()))
        id_map = {idx.mmsi: idx for idx in identities}
        
        # 5. Spatial & Temporal Filtering
        candidates = []
        for mmsi, track in tracks.items():
            # Build shapely LineString for the full track
            all_coords = []
            for seg in track.geometry["coordinates"]:
                all_coords.extend(seg)
                
            if len(all_coords) < 2:
                continue
                
            line = LineString(all_coords)
            
            # Simple spatial relevance check
            inside = line.intersects(poly)
            # Distance in degrees approx
            distance_deg = line.distance(poly)
            distance_m = distance_deg * 111000 # Rough conversion
            
            # Spatial relevance if intersects or within 5km
            spatially_relevant = inside or distance_m < 5000
            
            # Temporal relevance: if any position falls within +/- 2 hours of estimated_time
            # (or if a gap spans across the estimated_time)
            temporally_relevant = False
            for p in track.positions:
                dt = abs((p.timestamp - origin.estimated_time).total_seconds() / 3600.0)
                if dt <= 2.0:
                    temporally_relevant = True
                    break
            
            if not temporally_relevant:
                for g in track.gaps:
                    if g.start_time <= origin.estimated_time <= g.end_time:
                        temporally_relevant = True
                        break

            if spatially_relevant and temporally_relevant:
                cand = VesselCandidate(
                    id=f"cand_{mmsi}",
                    investigation_id=origin.scenario_id,
                    identity=id_map.get(mmsi, VesselIdentity(mmsi=mmsi)),
                    track=track,
                    spatially_relevant=spatially_relevant,
                    temporally_relevant=temporally_relevant,
                    closest_approach_meters=distance_m,
                    inside_origin_region=inside,
                    provenance=AISProvenance(mode="DEMO_MOCK" if isinstance(self.provider, MockAISProvider) else "LIVE")
                )
                candidates.append(cand)
                
        return candidates
