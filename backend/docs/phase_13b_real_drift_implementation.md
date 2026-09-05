# Phase 13B: Real Drift Reconstruction Implementation

## 1. Architecture
The real drift reconstruction pipeline integrates Sentinel-1 slick observations with real environmental forcing to produce a plausible backward transport region. It introduces two major components:
- `EnvironmentalForcingWindow`: A structured NetCDF-compatible forcing grid constructed dynamically from Open-Meteo.
- `OpenDriftEngine`: A live integration of OpenDrift `OceanDrift` that replaces the mock engine when `LIVE_OPEN_METEO` is requested.

## 2. OpenDrift Version
- **OpenDrift**: 1.14.12
- Verified compatible with our dependencies.

## 3. OceanDrift Selection
We selected `OceanDrift` as the initial baseline model. It natively handles current and wind forcing without complex biological/chemical decay algorithms, making it ideal for pure surface transport backtracking of unidentified slicks.

## 4. Environmental Forcing Adapter
The `OpenMeteoForcingAdapter` queries historical marine and meteorological APIs to construct a spatial-temporal grid centered around the slick's centroid over the hindcast duration.

## 5. Open-Meteo Integration
Due to Open-Meteo's API constraints, grid points are queried individually in chunks and assembled into a continuous 3D field (time x lat x lon).

## 6. Wind Vector Conversion
Wind from Open-Meteo follows meteorological conventions (direction **FROM** which the wind blows).
- `u = -speed * sin(direction)`
- `v = -speed * cos(direction)`

## 7. Current Vector Conversion
Currents from Open-Meteo follow oceanographic conventions (direction **TO** which the current flows).
- `u = speed * sin(direction)`
- `v = speed * cos(direction)`

## 8. Spatial Grid
The prototype grid is configured to cover `0.5` degrees around the slick with a spacing of `0.5` degrees. This produces a coarse grid designed to avoid API rate limits (`429 Too Many Requests`) in the free tier while providing enough spatial context for short-duration drift.

## 9. Temporal Forcing
Hourly grids are fetched, ensuring sufficient buffer before and after the simulation window to support OpenDrift's internal interpolation.

## 10. NetCDF Interface
The forcing field is written to a temporary NetCDF file compliant with CF conventions. OpenDrift's `reader_netCDF_CF_generic` reads it automatically. The file is guaranteed to be deleted after the simulation completes.

## 11. Particle Seeding
- **Default Count**: 1000
- **Seeding Method**: Seeded within a radius approximating the slick polygon area. 

## 12. Backward Hindcast
- **Default Duration**: 24 hours.
- **Time Step**: -3600 seconds.

## 13. Origin-Region Method
The trajectory endpoints (valid/stranded) are wrapped in a 2D Convex Hull. This forms the Plausible Release Region.

## 14. Provenance
The pipeline explicitly captures extensive provenance including model limitations, ensuring that the results are clearly labeled as a plausible transport region, not an exact origin.

## 15. Failure Handling
The system handles network failures, malformed responses, and landmask strandings. If Open-Meteo forcing fails, it throws a clear HTTP 500 error instead of silently falling back to the DEMO_MOCK engine.

## 16. Performance
Performance is currently bounded by Open-Meteo network latency and the Python NetCDF construction time. Backwards simulation of 1000 particles over 24 hours runs in sub-second time once forcing is loaded.

## 17. Live Validation
`backend/scripts/live_cdse_validation_13b.py` successfully validates the architecture against the Corsica event (2024-05-27T17:22:35Z).

## 18. Landmask & Coastal Behavior
Coastal stranding will cause particles to halt prematurely. These stranded endpoints are still included in the final convex hull.

## 19. Scientific Limitations
- Real environmental forcing does not imply physically validated drift.
- The convex hull can overestimate uncertainty if particles form disconnected clusters.
- The origin region is a Plausible Release Region, not an exact spill origin or proof of responsibility.

## 20. Future Improvements
- Optimize API fetching with authenticated Open-Meteo or Copernicus Marine Service (CMEMS).
- Move to dynamic grid sizing based on local transport speeds.
- Refine polygon seeding using precise GeoJSON masking.
