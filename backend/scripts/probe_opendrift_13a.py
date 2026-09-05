import sys
from datetime import datetime, timedelta
import numpy as np

# Try importing OpenDrift
try:
    from opendrift.models.oceandrift import OceanDrift
    from opendrift.readers.reader_constant import Reader as ConstantReader
    print("OpenDrift imported successfully!")
except ImportError as e:
    print(f"Failed to import OpenDrift: {e}")
    sys.exit(1)

def run_probe():
    print("--- Running OpenDrift Probe ---")
    
    # Coordinates (open ocean in Mediterranean to avoid landmask issues)
    lat, lon = 40.0, 6.0
    start_time = datetime(2026, 9, 5, 12, 0, 0)
    
    print("\n[1] Testing Forward Simulation")
    o_fwd = OceanDrift(loglevel=30)  # WARNING level to reduce spam
    
    # Set up simple deterministic environmental forcing
    # Wind at 5 m/s eastward, current at 0.5 m/s northward
    constant_reader = ConstantReader(
        {'x_wind': 5.0, 'y_wind': 0.0,
         'x_sea_water_velocity': 0.0, 'y_sea_water_velocity': 0.5}
    )
    o_fwd.add_reader(constant_reader)
    
    # Seed particles
    o_fwd.seed_elements(lon=lon, lat=lat, time=start_time, number=10, radius=1000)
    print(f"Seeded 10 particles at {lat}, {lon}")
    
    # Run forward (e.g., 6 hours, 1 hour timestep)
    print("Running forward simulation for 6 hours...")
    o_fwd.run(steps=6, time_step=3600)
    
    # Extract trajectories
    lons_fwd = o_fwd.result.lon.values
    lats_fwd = o_fwd.result.lat.values
    status_fwd = o_fwd.result.status.values
    print(f"Forward simulation complete.")
    print(f"Final particle 0 pos: lat={lats_fwd[-1][0]:.4f}, lon={lons_fwd[-1][0]:.4f}")
    
    print("\n[2] Testing Backward Simulation")
    o_bwd = OceanDrift(loglevel=30)
    o_bwd.add_reader(constant_reader)
    
    # For backward, we start from a later time and run backward
    end_time = start_time + timedelta(hours=6)
    o_bwd.seed_elements(lon=lon, lat=lat, time=end_time, number=10, radius=1000)
    
    print("Running backward simulation for 6 hours...")
    # Backward simulation uses negative time step
    o_bwd.run(steps=6, time_step=-3600)
    
    # Extract trajectories
    lons_bwd = o_bwd.result.lon.values
    lats_bwd = o_bwd.result.lat.values
    print("Backward simulation complete.")
    print(f"Final particle 0 pos (back in time): lat={lats_bwd[-1][0]:.4f}, lon={lons_bwd[-1][0]:.4f}")
    
    print("\n[3] Validating Geometry Output Feasibility")
    # To convert to LineString/MultiLineString, we can iterate over history
    # Example for particle 0:
    trajectory_0 = list(zip(lons_fwd[:, 0], lats_fwd[:, 0]))
    print("Trajectory 0 points:")
    for pt in trajectory_0:
        print(f"  {pt[0]:.4f}, {pt[1]:.4f}")
        
    print("\nProbe completed successfully.")

if __name__ == "__main__":
    run_probe()
