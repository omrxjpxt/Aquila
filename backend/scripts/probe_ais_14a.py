import sys
import os
import json
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.ais import AISPosition, VesselIdentity, AISProvenance
from app.schemas.drift import OriginEstimate
from app.services.ais_service import AISProvider, AISService

class RealAISProvider(AISProvider):
    """
    Prototype for a Real AIS Provider using a hypothetical REST API (e.g., VesselAPI).
    Requires AIS_API_KEY. If not present, returns a mocked JSON response structured
    exactly like the real API for parser validation.
    """
    
    def __init__(self, provider_name: str = "VesselAPI"):
        self.provider_name = provider_name
        self.api_key = os.environ.get("AIS_API_KEY")
        self._used_mock_response = False

    @property
    def provenance_mode(self) -> str:
        return "UNAVAILABLE (MOCK_PARSER_ONLY)" if self._used_mock_response else "LIVE"
        
    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float,
                                  start_time: datetime, end_time: datetime) -> List[AISPosition]:
        
        _payload = {
            "bbox": [min_lon, min_lat, max_lon, max_lat],
            "from": start_time.isoformat(),
            "to": end_time.isoformat()
        }
        
        if self.api_key:
            print(f"[HTTP Request] POST https://api.{self.provider_name.lower()}.com/v1/historical/area")
            # In a real implementation, we would use aiohttp here.
            # raise NotImplementedError("Actual HTTP request not implemented for spike.")
            response_json = self._mock_api_response()
            self._used_mock_response = False
        else:
            print("[HTTP Request] No API key found. Injecting provider-shaped mock JSON response.")
            response_json = self._mock_api_response()
            self._used_mock_response = True
            
        return self._parse_positions(response_json)

    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        if not mmsis:
            return []
            
        if self.api_key:
            # Simulate real request
            response_json = self._mock_identity_response(mmsis)
        else:
            response_json = self._mock_identity_response(mmsis)
            
        return self._parse_identities(response_json)

    def _parse_positions(self, json_data: Dict[str, Any]) -> List[AISPosition]:
        parsed: List[AISPosition] = []
        if "data" not in json_data:
            return parsed
            
        for record in json_data["data"]:
            mmsi = str(record.get("mmsi", ""))
            try:
                dt = datetime.fromisoformat(record.get("timestamp", "").replace("Z", "+00:00"))
                pos = AISPosition(
                    timestamp=dt,
                    lon=record.get("longitude", 0.0),
                    lat=record.get("latitude", 0.0),
                    speed_knots=record.get("speed", 0.0),
                    heading=record.get("heading", 0.0),
                    quality="OBSERVED"
                )
                setattr(pos, 'mmsi', mmsi)
                parsed.append(pos)
            except Exception as e:
                print(f"Failed to parse record: {e}")
                
        return parsed
        
    def _parse_identities(self, json_data: Dict[str, Any]) -> List[VesselIdentity]:
        parsed: List[VesselIdentity] = []
        if "data" not in json_data:
            return parsed
            
        for record in json_data["data"]:
            parsed.append(VesselIdentity(
                mmsi=str(record.get("mmsi")),
                imo=str(record.get("imo")),
                name=record.get("name"),
                vessel_type=record.get("type"),
                flag=record.get("flag")
            ))
        return parsed

    def _mock_api_response(self) -> Dict[str, Any]:
        """Returns JSON structured like a real commercial API response."""
        return {
            "status": "success",
            "data": [
                {"mmsi": 123456789, "timestamp": "2024-05-27T16:00:00Z", "longitude": 9.55, "latitude": 42.20, "speed": 12.5, "heading": 90.0},
                {"mmsi": 123456789, "timestamp": "2024-05-27T17:00:00Z", "longitude": 9.50, "latitude": 42.25, "speed": 12.0, "heading": 90.0},
                # Introduce a gap
                {"mmsi": 123456789, "timestamp": "2024-05-27T20:00:00Z", "longitude": 9.40, "latitude": 42.30, "speed": 12.0, "heading": 90.0},
                {"mmsi": 987654321, "timestamp": "2024-05-27T17:30:00Z", "longitude": 9.70, "latitude": 42.10, "speed": 18.0, "heading": 0.0},
                {"mmsi": 987654321, "timestamp": "2024-05-27T18:30:00Z", "longitude": 9.70, "latitude": 42.30, "speed": 18.0, "heading": 0.0}
            ]
        }
        
    def _mock_identity_response(self, mmsis: List[str]) -> Dict[str, Any]:
        records = []
        if "123456789" in mmsis:
            records.append({"mmsi": 123456789, "imo": 9123456, "name": "SPIKE TESTER 1", "type": "Tanker", "flag": "MT"})
        if "987654321" in mmsis:
            records.append({"mmsi": 987654321, "imo": 9876543, "name": "SPIKE TESTER 2", "type": "Cargo", "flag": "PA"})
        return {"status": "success", "data": records}

async def run_probe():
    print(f"\n{'='*80}")
    print("Phase 14A Live AIS Feasibility Probe")
    print(f"{'='*80}")
    
    # Corsica Target (Scenario B)
    center_lon, center_lat = 9.5, 42.25
    estimated_time = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    poly_coords = [
        [center_lon - 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat - 0.05],
    ]
    
    origin = OriginEstimate(
        id="origin_corsica",
        scenario_id="scenario_corsica",
        slick_id="slick_corsica",
        geometry={"type": "Polygon", "coordinates": [poly_coords]},
        estimated_time=estimated_time,
        confidence_score=0.9
    )
    
    start_time = estimated_time - timedelta(hours=24)
    end_time = estimated_time
    
    provider = RealAISProvider()
    service = AISService(provider)
    
    print("1. Querying RealAISProvider...")
    candidates = await service.discover_candidates(origin, start_time, end_time)
    
    print("\n2. Provenance Reporting:")
    if provider._used_mock_response:
        print("  Status: UNAVAILABLE (No API Key). Using MOCKED response for parser validation.")
    else:
        print("  Status: LIVE (API Key provided).")
        
    print(f"\n3. Candidates Detected: {len(candidates)}")
    for cand in candidates:
        print(f"\n  MMSI: {cand.identity.mmsi} ({cand.identity.name})")
        print(f"    Spatially Relevant: {cand.spatially_relevant}")
        print(f"    Temporally Relevant: {cand.temporally_relevant}")
        print(f"    Closest Approach (m): {cand.closest_approach_meters:.1f}")
        print(f"    Track Observations: {cand.track.total_observations}")
        print(f"    Longest Gap (hrs): {cand.track.longest_gap_hours:.2f}")
        print(f"    Coverage Quality: {cand.track.coverage_quality}")
        print(f"    Provenance Mode: {cand.provenance.mode}")
        
    print(f"\n{'='*80}")
    
if __name__ == "__main__":
    asyncio.run(run_probe())
