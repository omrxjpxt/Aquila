# OpenDrift / OpenOil Adapter Specification

AQUILA's `DriftEngine` interface is designed to seamlessly swap out the deterministic `MockDriftEngine` for a true physically validated OpenDrift simulation. When OpenDrift is integrated, it must adhere to this adapter specification.

## 1. Engine Interface Contract
The `OpenDriftEngine` must implement the `app.services.drift_service.DriftEngine` base class:
```python
class OpenDriftEngine(DriftEngine):
    def run_hindcast(self, scenario: DriftScenario, slick: Slick) -> DriftResult:
        ...
        
    def run_forecast(self, scenario: DriftScenario, origin: OriginEstimate) -> ForecastResult:
        ...
```

## 2. Environmental Forcing
OpenDrift must consume forcing data through its `readers` architecture. The adapter must translate AQUILA's `DriftScenario.forcing_sources` into active OpenDrift readers.

**Required Forcing:**
- **Wind:** (e.g. ERA5 or ECMWF) providing `x_wind` and `y_wind`.
- **Ocean Currents:** (e.g. Copernicus Marine CMEMS) providing `x_sea_water_velocity` and `y_sea_water_velocity`.
- **Temporal Coverage:** The readers must cover `scenario.start_time` through `scenario.end_time` with a minimum 6-hour temporal resolution.

## 3. Initialization
- **Backward Run (Hindcast):** Particles should be initialized across the `slick.geometry` (Polygon) at `slick.detected_at`. 
- **Forward Run (Forecast):** Particles should be initialized within the `origin.geometry` at `origin.estimated_time`.
- **Particle Count:** Use a minimum of 1,000 particles to capture dispersion accurately.

## 4. Expected Outputs
The adapter must package OpenDrift's output NetCDF or memory arrays into AQUILA's Pydantic schemas:
- **`OriginEstimate.geometry` / `ForecastResult.forecast_geometry`:** Calculate the convex hull or kernel density estimate (KDE) of the particle cloud at the final timestep.
- **`DriftTrajectory`:** Cluster or decimate the 1,000 particles into representative trajectory lines (e.g., centroid of the plume over time) for rendering in the frontend, rather than sending 1,000 individual JSON LineStrings.
- **`DriftUncertainty`:** Derive an uncertainty envelope by running perturbed physics parameters, or by taking the 95% confidence interval of the KDE.
- **`DriftProvenance`:**
  - `mode`: `"PHYSICS_VALIDATED"`
  - `engine`: `"OpenDriftEngine_v1.x"`
  - `limitations`: Document the actual sub-grid scale diffusion coefficients and oil weathering assumptions used.
