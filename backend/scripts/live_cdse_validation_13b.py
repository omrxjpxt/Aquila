import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta
import json

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.slick import Slick
from app.schemas.drift import DriftScenario
from app.services.drift_service import DriftService

async def main():
    print("="*80)
    print("Phase 13B Live Drift Validation")
    print("Corsica Scenario")
    print("="*80)

    # 1. Setup Slick (approximated open ocean)
    center_lon, center_lat = 7.0, 40.0
    poly_coords = [
        [center_lon - 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat - 0.05],
    ]
    acquisition_time = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    slick = Slick(
        id="slick_corsica_val_13b",
        source_scene_id="scene_corsica_val_13b",
        detected_at=acquisition_time,
        geometry={"type": "Polygon", "coordinates": [poly_coords]},
        area_sq_km=10.0
    )
    
    scenario = DriftScenario(
        scenario_id="scenario_corsica_val_13b",
        investigation_id="inv_corsica_val_13b",
        slick_id=slick.id,
        start_time=acquisition_time,
        end_time=acquisition_time - timedelta(hours=24),
        is_backward=True,
        forcing_sources=["LIVE_OPEN_METEO"],
        parameters={"particle_count": 1000}
    )

    print(f"Acquisition Time: {acquisition_time.isoformat()}")
    print("Executing hindcast using LIVE_OPEN_METEO...")
    
    t0 = datetime.now()
    try:
        service = DriftService()
        result = await service.execute_hindcast(scenario, slick)
        t1 = datetime.now()
        
        print(f"\nExecution successful in {(t1-t0).total_seconds():.2f} seconds\n")
        
        prov = result.provenance
        print("PROVENANCE:")
        print(f"  Mode:            {prov.mode}")
        print(f"  Engine:          {prov.engine} {prov.engine_version}")
        print(f"  Model:           {prov.model}")
        print(f"  Particle Count:  {prov.particle_count}")
        print(f"  Hindcast Dur:    {prov.hindcast_duration} hrs")
        print(f"  Time Step:       {prov.timestep} sec")
        print(f"  Forcing Prov:    {prov.forcing_provider}")
        print(f"  Forcing Dataset: {prov.forcing_dataset}")
        print(f"  Forcing Sp Res:  {prov.forcing_spatial_resolution}")
        print(f"  Forcing T Res:   {prov.forcing_temporal_resolution}")
        print(f"  Forcing Start:   {prov.forcing_start}")
        print(f"  Forcing End:     {prov.forcing_end}")
        print(f"  Req Coords:      {prov.requested_coordinates}")
        print(f"  Limitations:     {prov.limitations}")
        
        print("\nRESULT:")
        print(f"  Trajectories:    {len(result.trajectories)}")
        if result.trajectories:
            print(f"  Steps in Traj 0: {len(result.trajectories[0].coordinates)}")
            
        print("\nORIGIN ESTIMATE:")
        if result.origin_estimate:
            geom = result.origin_estimate.geometry
            print(f"  Type: {geom.get('type')}")
            coords = geom.get("coordinates", [[]])[0]
            print(f"  Hull Points: {len(coords)}")
        else:
            print("  None")

    except Exception as e:
        print(f"\nExecution failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
