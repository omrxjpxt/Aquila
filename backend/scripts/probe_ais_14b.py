import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.byod_ais_provider import BYODAISProvider
from app.services.ais_service import AISService
from app.schemas.drift import OriginEstimate

async def run_probe():
    print(f"\n{'='*80}")
    print("Phase 14B Live BYOD Feasibility Probe")
    print(f"{'='*80}")
    
    investigation_id = "PROBE_14B_TEST"
    
    # 1. Synthetic TEST DATA
    print("1. Creating synthetic TEST DATA (CSV)...")
    csv_content = b"""mmsi,time,lat,lon,sog,cog,ship_type,name
999999999,2024-05-26T16:00:00Z,42.0,9.0,15.0,45.0,Cargo,SYNTHETIC_TEST_VESSEL
999999999,2024-05-26T17:00:00Z,42.1,9.1,15.0,45.0,Cargo,SYNTHETIC_TEST_VESSEL
999999999,2024-05-26T21:00:00Z,42.5,9.5,15.0,45.0,Cargo,SYNTHETIC_TEST_VESSEL
888888888,2024-05-26T18:00:00Z,40.0,7.0,10.0,0.0,Tanker,DECOY_VESSEL
"""
    
    # 2. Upload/Import
    print("2. Simulating API Upload/Import...")
    result = BYODAISProvider.import_dataset(
        investigation_id=investigation_id,
        content=csv_content,
        is_csv=True,
        declared_source="PROBE_SYNTHETIC_TEST_DATA"
    )
    
    print(f"  Import Status: {result['validation_status']}")
    print(f"  Records: {result['record_count']}, Vessels: {result['vessel_count']}")
    print(f"  Declared Source: {result['declared_source']}")
    
    # 3. Provider Instantiation
    print("\n3. Instantiating BYODAISProvider and AISService...")
    provider = BYODAISProvider(investigation_id)
    service = AISService(provider)
    
    # 4. Scenario Bounds
    estimated_time = datetime(2024, 5, 26, 19, 0, tzinfo=timezone.utc)
    poly_coords = [
        [8.5, 41.5],
        [9.5, 41.5],
        [9.5, 42.5],
        [8.5, 42.5],
        [8.5, 41.5],
    ]
    origin = OriginEstimate(
        id="origin_test",
        scenario_id="scenario_test",
        slick_id="slick_test",
        geometry={"type": "Polygon", "coordinates": [poly_coords]},
        estimated_time=estimated_time,
        confidence_score=0.9
    )
    start_time = estimated_time - timedelta(hours=24)
    end_time = estimated_time + timedelta(hours=24)
    
    # 5. Discover Candidates
    print("\n4. Discovering Candidates...")
    candidates = await service.discover_candidates(origin, start_time, end_time)
    
    print(f"\nCandidates Found: {len(candidates)}")
    for cand in candidates:
        print(f"\n  MMSI: {cand.identity.mmsi} ({cand.identity.name})")
        print(f"    Spatially Relevant: {cand.spatially_relevant}")
        print(f"    Temporally Relevant: {cand.temporally_relevant}")
        print(f"    Track Observations: {cand.track.total_observations}")
        print(f"    Longest Gap (hrs): {cand.track.longest_gap_hours:.2f}")
        print(f"    Gaps Preserved: {len(cand.track.gaps)}")
        print(f"    Provenance Mode: {cand.provenance.mode}")
        
    print(f"\n{'='*80}")
    
if __name__ == "__main__":
    asyncio.run(run_probe())
