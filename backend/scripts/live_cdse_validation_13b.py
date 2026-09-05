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

async def run_scenario_test(name, center_lon, center_lat, acquisition_time):
    print(f"\n{'='*80}")
    print(f"Phase 13B Live Drift Validation: {name}")
    print(f"{'='*80}")

    poly_coords = [
        [center_lon - 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat - 0.05],
        [center_lon + 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat + 0.05],
        [center_lon - 0.05, center_lat - 0.05],
    ]
    
    slick = Slick(
        id=f"slick_{name.lower().replace(' ', '_')}",
        source_scene_id=f"scene_{name.lower().replace(' ', '_')}",
        detected_at=acquisition_time,
        geometry={"type": "Polygon", "coordinates": [poly_coords]},
        area_sq_km=10.0
    )
    
    scenario = DriftScenario(
        scenario_id=f"scenario_{name.lower().replace(' ', '_')}",
        investigation_id=f"inv_{name.lower().replace(' ', '_')}",
        slick_id=slick.id,
        start_time=acquisition_time,
        end_time=acquisition_time - timedelta(hours=24),
        is_backward=True,
        forcing_sources=["LIVE_OPEN_METEO"],
        parameters={"particle_count": 1000}
    )

    print(f"Acquisition Time: {acquisition_time.isoformat()}")
    print(f"Requested Geometry: Polygon around [{center_lon}, {center_lat}]")
    print("Executing hindcast using LIVE_OPEN_METEO...")
    
    t0 = datetime.now()
    try:
        service = DriftService()
        result = await service.execute_hindcast(scenario, slick)
        t1 = datetime.now()
        
        prov = result.provenance
        
        print("\nSIMULATION METRICS:")
        print(f"  Status:             {prov.simulation_status}")
        print(f"  Runtime:            {(t1-t0).total_seconds():.2f} seconds")
        print(f"  Total Particles:    {prov.particle_count}")
        print(f"  Completed Particles:{prov.completed_particle_count}")
        print(f"  Stranded Particles: {prov.stranded_particle_count}")
        print(f"  Landmask Stranded:  {prov.landmask_stranding}")
        print(f"  Completion Fract:   {prov.trajectory_completion_fraction:.2f}")
        
        print("\nFORCING PROVENANCE:")
        print(f"  Provider:           {prov.forcing_provider}")
        print(f"  Dataset:            {prov.forcing_dataset}")
        print(f"  Requested Coords:   {prov.requested_coordinates}")
        print(f"  Temporal Window:    {prov.forcing_start} to {prov.forcing_end}")
        print(f"  Spatial Res:        {prov.forcing_spatial_resolution}")
        print(f"  Temporal Res:       {prov.forcing_temporal_resolution}")
        
        print("\nENGINE PROVENANCE:")
        print(f"  Engine:             {prov.engine} {prov.engine_version}")
        print(f"  Model:              {prov.model}")
        print(f"  Time Step:          {prov.timestep} sec")
        print(f"  Duration:           {prov.hindcast_duration} hrs")
        
        print("\nLIMITATIONS & WARNINGS:")
        print(f"  {prov.limitations}")
        
        print("\nRESULT:")
        print(f"  Trajectories:       {len(result.trajectories)}")
        if result.trajectories:
            print(f"  Steps in Traj 0:    {len(result.trajectories[0].coordinates)}")
            
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

async def main():
    acquisition_time = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    # 1. Deep Water Test
    await run_scenario_test("Deep Water Test", 7.0, 40.0, acquisition_time)
    
    # 2. Actual Corsica Validation
    await run_scenario_test("Actual Corsica Geometry", 9.5, 42.25, acquisition_time)

if __name__ == "__main__":
    asyncio.run(main())
