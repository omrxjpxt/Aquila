# Phase 13A: Drift Engine Research & Feasibility

## 1. Candidate engine
- **Engine**: OpenDrift
- **Version**: Tested with the latest available from PyPI.
- **Installation result**: Successfully installed alongside existing backend dependencies in the virtual environment.

## 2. OceanDrift vs OpenOil
- **OceanDrift**: The core module for passive tracers and objects tracking. It simulates advection by currents, wind drift, and Stokes drift.
- **OpenOil**: A specialized module that extends OceanDrift with weathering processes (evaporation, emulsification, dispersion) and integrates with the NOAA OilLibrary for properties of ~1000 oil types.
- **Advantages of OceanDrift**: Simpler inputs, does not require knowledge of the exact oil type, computationally lighter, easier to set up for general trajectory transport.
- **Disadvantages of OceanDrift**: Lacks physics for oil state changes (weathering), making it purely kinematic/transport-based.
- **Recommendation for AQUILA**: **OceanDrift** is the correct initial choice. AQUILA currently aims to establish a credible surface transport reconstruction. Without confirmed oil physical properties for each Sentinel-1 slick, using OpenOil introduces uncalibrated assumptions. Once basic kinematic transport is validated, OpenOil can be evaluated for advanced scenarios.

## 3. Environmental forcing requirements
- **Required variables**: For OceanDrift, standard required variables typically include:
  - `x_wind` and `y_wind` (10m wind velocity in m/s)
  - `x_sea_water_velocity` and `y_sea_water_velocity` (surface ocean currents in m/s)
- **Spatial resolution**: Depends on the forcing. Marine currents often dictate the effective resolution (e.g., Open-Meteo marine models at ~0.08°). OpenDrift interpolates automatically.
- **Temporal resolution**: 1-hourly data is generally sufficient for prototype drift tracking, capturing diurnal variations and tides if present in the model.
- **Units**: meters per second (m/s).
- **Vector conventions**: U (Eastward, x) and V (Northward, y) vector components.

## 4. Open-Meteo compatibility
Open-Meteo provides wind and marine currents, but typically as speed (m/s) and direction (degrees).
- **Adapter needed**: Open-Meteo is theoretically compatible, but OpenDrift requires U/V components (`x_wind`, `y_wind`, `x_sea_water_velocity`, `y_sea_water_velocity`) mapped to a continuous spatial field over a time window.
- Since Open-Meteo provides point-based time series natively via standard endpoints, AQUILA needs a **Forcing Adapter**. This adapter must query Open-Meteo over a bounding box (or grid) for the past N hours, convert speed/direction into U/V fields, and write them to a format OpenDrift natively supports (e.g., a NetCDF file) OR implement a custom OpenDrift `Reader` subclass (e.g., `OpenMeteoReader`) that wraps the API.

## 5. Backward transport
- OpenDrift natively supports backward (hindcast) simulations.
- It is performed by providing a **negative `time_step`** (e.g., `-3600` for 1-hour backward steps) to the `run()` method. 
- In this mode, advective currents and winds are reversed, but diffusive/turbulent spreading continues to act forward (causing the particle cloud to spread backwards in time, representing origin uncertainty).
- This is perfectly suitable for AQUILA's origin reconstruction use case.

## 6. Particle/ensemble strategy
- **Recommendation**: For the SIH prototype, seed **1000 particles** uniformly distributed within the geometry of the Sentinel-1 observed slick (or a bounding box with a landmask).
- This ensemble provides a visual plume representing possible trajectories. 
- *Caveat*: Do not claim this ensemble is a statistically calibrated probability distribution unless the diffusion parameterizations and forcing uncertainties are rigorously quantified. It is a qualitative reconstruction.

## 7. Uncertainty
- **Represented uncertainty**: OpenDrift can represent diffusion/turbulence via random walk parameterizations. It can also model wind drift factor uncertainty.
- **What to expose to users**: Users should be shown the expanding polygon/point cloud of the ensemble and explicitly told that it represents a *plausible* origin area, heavily dependent on the resolution and accuracy of the underlying wind/current models, rather than an exact deterministic path.

## 8. Coastline handling
- OpenDrift natively uses a landmask (e.g., `roaring-landmask`). 
- When particles hit the coastline during simulation, they generally "strand" (status becomes stranded) unless configured to bounce or if coastal currents push them back. 
- For Corsica/coastal spills, this is highly relevant as backward simulation from a coastal slick might suggest an inland origin if the landmask resolution is too coarse.

## 9. Geometry/output
- The `history` attribute of the model object contains NumPy arrays of coordinates (`lon`, `lat`) for all particles at all timesteps.
- **Trajectories**: Can be converted into a GeoJSON `MultiLineString` by zipping `lon` and `lat` arrays for each particle.
- **Origin envelope**: The final timestep's coordinates can be wrapped in a convex hull (via Shapely) to produce an origin `Polygon`.
- **Observed vs Simulated**: The resulting GeoJSON can easily be sent to the frontend to overlay on the Sentinel-1 footprint.

## 10. Performance
- OpenDrift is highly optimized (using NumPy/SciPy under the hood). A 1000-particle simulation for 48 hours with 1-hour timesteps takes only seconds to a minute, assuming the forcing data (readers) are already loaded in memory.
- For a live SIH demo, the bottleneck will be fetching the environmental forcing data (Open-Meteo grid), not the OpenDrift simulation itself.

## 11. Provenance
AQUILA should record the following for every reconstruction:
- `engine`: OpenDrift
- `engine_version`: e.g., 1.12.0
- `forcing_provider`: e.g., Open-Meteo Marine
- `forcing_time_window`: [start_time, end_time]
- `spatial_resolution`: Grid spacing of the forcing
- `temporal_resolution`: Timestep of forcing data (e.g., 1-hour)
- `particle_count`: e.g., 1000
- `timestep`: e.g., -3600 (seconds)
- `simulation_direction`: Backward
- `seed_geometry`: WKT or GeoJSON of the starting slick
- `retrieval_timestamp`: When the forcing was fetched
- `limitations`: String describing scientific constraints.

## 12. Scientific limitations
- Real forcing does not automatically mean physically validated drift.
- Environmental models (like Open-Meteo) have spatial/temporal uncertainty and may miss localized coastal eddies.
- Oil properties (thickness, weathering, exact wind drift factor) are unknown for blind satellite detections.
- The result is a **plausible transport reconstruction**, not proof of exact spill origin.
- An origin region must not be presented as a precise point of responsibility or legal evidence without in-situ corroboration.

## 13. Phase 13B recommendation
**Proposed Architecture:**
1. **Drift Engine Abstraction**: Create `OpenDriftEngine` conforming to a common interface, replacing the naive mockup. Keep `DEMO_MOCK` workflow intact.
2. **Forcing Adapter**: Create a service (`opendrift_forcing_service.py`) that fetches Open-Meteo wind/current grids for a bounding box covering the spill region for the `[slick_time - 48h, slick_time]` window. 
3. **NetCDF Generator**: The adapter should convert Open-Meteo speed/direction to U/V components and write a temporary NetCDF file (easiest for OpenDrift to consume) for the spatial field.
4. **API Endpoint**: Extend or add an endpoint for drift reconstruction that triggers the Forcing Adapter, runs `OceanDrift` backwards for 24-48 hours with 100-1000 particles.
5. **Output Schema**: Returns a GeoJSON `FeatureCollection` containing:
   - `MultiLineString` (trajectories)
   - `Polygon` (convex hull of origin region)
   - `metadata` (provenance fields defined above)
