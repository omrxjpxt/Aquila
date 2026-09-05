import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import numpy as np

from app.schemas.slick import Slick
from app.schemas.drift import (
    DriftScenario,
    OriginEstimate,
    DriftTrajectory,
    DriftUncertainty,
    DriftResult,
    ForecastResult,
    DriftProvenance
)
from app.services.drift_service import DriftEngine
from app.services.environmental_forcing import OpenMeteoForcingAdapter


class OpenDriftEngine(DriftEngine):
    """
    Live drift engine wrapping OpenDrift's OceanDrift model.
    """
    def __init__(self):
        # We assume opendrift is installed in the environment
        try:
            from opendrift.models.oceandrift import OceanDrift
            self._model_class = OceanDrift
        except ImportError:
            self._model_class = None

        self.forcing_adapter = OpenMeteoForcingAdapter()

    async def _run_simulation(
        self, scenario: DriftScenario, lon: float, lat: float,
        start_time: datetime, is_backward: bool, slick: Optional[Slick] = None
    ) -> dict:
        if self._model_class is None:
            raise RuntimeError("OpenDrift is not installed or available in this environment.")

        # Determine simulation window
        duration_hrs = (scenario.end_time - scenario.start_time).total_seconds() / 3600.0
        duration_hrs = abs(duration_hrs)
        if duration_hrs == 0:
            duration_hrs = 24.0

        sim_start_time = scenario.start_time if scenario.start_time > scenario.end_time else scenario.end_time
        sim_end_time = sim_start_time - timedelta(hours=duration_hrs) if is_backward else sim_start_time + timedelta(hours=duration_hrs)
        
        # Calculate forcing window
        f_start = min(sim_start_time, sim_end_time)
        f_end = max(sim_start_time, sim_end_time)

        # Get spatial-temporal forcing field
        forcing_window = await self.forcing_adapter.get_forcing_window(
            center_lat=lat,
            center_lon=lon,
            start_time=f_start,
            end_time=f_end,
            half_width_deg=1.5,
            grid_spacing_deg=0.5
        )

        nc_path = forcing_window.to_netcdf()

        try:
            from opendrift.readers import reader_netCDF_CF_generic
            
            o = self._model_class(loglevel=30)
            reader = reader_netCDF_CF_generic.Reader(nc_path)
            o.add_reader(reader)

            # Seed particles
            particle_count = int(scenario.parameters.get("particle_count", 1000))
            
            # If a slick geometry is provided, seed across the polygon
            # For this MVP, we seed in a radius around the centroid to simulate the polygon
            seed_radius = 2000 # 2km default radius
            if slick and hasattr(slick, "area_sq_km") and slick.area_sq_km:
                seed_radius = max(500, int(np.sqrt(slick.area_sq_km / np.pi) * 1000))
                
            o.seed_elements(
                lon=lon, lat=lat, time=sim_start_time,
                number=particle_count, radius=seed_radius
            )

            time_step = -3600 if is_backward else 3600
            steps = int(duration_hrs)

            try:
                o.run(steps=steps, time_step=time_step)
            except BaseException as e:
                print(f"OpenDrift simulation stopped early: {e}")

            # Extract trajectories
            lons = o.result.lon.values
            lats = o.result.lat.values
            statuses = o.result.status.values
            
            import pandas as pd
            timestamps = [pd.to_datetime(t).to_pydatetime().replace(tzinfo=timezone.utc) for t in o.result.time.values]
            
            return {
                "lons": lons,
                "lats": lats,
                "statuses": statuses,
                "timestamps": timestamps,
                "forcing": forcing_window,
                "particle_count": particle_count,
                "time_step": time_step,
                "sim_start": sim_start_time,
                "sim_end": sim_end_time,
                "duration": duration_hrs
            }
        finally:
            # Always clean up the temporary NetCDF file
            if os.path.exists(nc_path):
                os.remove(nc_path)

    def _generate_origin_estimate(self, scenario_id: str, slick_id: str, lons: np.ndarray, lats: np.ndarray, current_time: datetime) -> tuple[OriginEstimate, DriftUncertainty]:
        # Origin is the envelope around the final positions of all particles
        # Get the latest valid position for EACH particle individually (handles stranding/aborts)
        # OpenDrift result arrays usually have shape (trajectory, time)
        traj_axis = 0
        time_axis = 1

        final_lons = []
        final_lats = []
        for p_idx in range(lons.shape[traj_axis]):
            # Get particle's trajectory over time
            p_lons = lons[p_idx, :]
            p_lats = lats[p_idx, :]
            
            valid_t = np.where(~np.isnan(p_lons))[0]
            if len(valid_t) > 0:
                last_t = valid_t[-1]
                final_lons.append(p_lons[last_t])
                final_lats.append(p_lats[last_t])
                
        if not final_lons:
            print(f"Warning: No valid particles reached the end. Using fallback origin.")
            # Fallback
            final_lons = [lons[0, 0] if not np.isnan(lons[0, 0]) else 7.0]
            final_lats = [lats[0, 0] if not np.isnan(lats[0, 0]) else 40.0]
            
        v_lons = np.array(final_lons)
        v_lats = np.array(final_lats)
            
        # Compute Convex Hull
        points = np.column_stack((v_lons, v_lats))
        if len(points) > 2:
            from scipy.spatial import ConvexHull
            hull = ConvexHull(points)
            hull_points = points[hull.vertices]
            # Close the polygon
            hull_points = np.vstack((hull_points, hull_points[0]))
            poly_coords = hull_points.tolist()
        else:
            # Fallback to bounding box or point if < 3 points
            poly_coords = [[v_lons[0], v_lats[0]], [v_lons[0]+0.001, v_lats[0]], [v_lons[0]+0.001, v_lats[0]+0.001], [v_lons[0], v_lats[0]+0.001], [v_lons[0], v_lats[0]]]

        poly_geojson = {
            "type": "Polygon",
            "coordinates": [poly_coords]
        }

        origin_est = OriginEstimate(
            id=f"origin_{scenario_id}",
            slick_id=slick_id,
            scenario_id=scenario_id,
            estimated_time=current_time,
            geometry=poly_geojson,
            limitations="Plausible Release Region — Convex Hull. A convex hull is a geometric envelope around the hindcast particle ensemble and can overestimate regions when particles are clustered or spatially disconnected."
        )

        uncert = DriftUncertainty(
            geometry=poly_geojson,
            label="Plausible Release Region"
        )
        return origin_est, uncert

    async def run_hindcast(self, scenario: DriftScenario, slick: Slick) -> DriftResult:
        # Centroid
        poly_coords = slick.geometry["coordinates"][0]
        lon = sum(p[0] for p in poly_coords[:-1]) / (len(poly_coords) - 1)
        lat = sum(p[1] for p in poly_coords[:-1]) / (len(poly_coords) - 1)

        result_data = await self._run_simulation(
            scenario=scenario, lon=lon, lat=lat, 
            start_time=scenario.start_time, is_backward=True, slick=slick
        )

        lons = result_data["lons"]
        lats = result_data["lats"]
        timestamps = result_data["timestamps"]
        
        # Build one sample trajectory (e.g. centroid of particles) to avoid overloading the frontend
        # For full UI, you'd send a MultiLineString or feature collection
        # Here we follow the schema DriftTrajectory, returning the centroid of the cloud per step
        centroid_coords = []
        for t_idx in range(len(timestamps)):
            # lons shape is (trajectory, time)
            t_lons = lons[:, t_idx]
            t_lats = lats[:, t_idx]
            
            valid_lons = t_lons[~np.isnan(t_lons)]
            valid_lats = t_lats[~np.isnan(t_lats)]
            if len(valid_lons) > 0:
                centroid_coords.append([float(np.mean(valid_lons)), float(np.mean(valid_lats))])
            else:
                break
                
        traj = DriftTrajectory(
            id=f"traj_{scenario.scenario_id}",
            coordinates=centroid_coords,
            timestamps=timestamps[:len(centroid_coords)],
            particle_count=result_data["particle_count"]
        )

        origin_est, uncert = self._generate_origin_estimate(
            scenario.scenario_id, slick.id, lons, lats, timestamps[-1]
        )

        forcing = result_data["forcing"]
        
        provenance = DriftProvenance(
            mode="LIVE",
            engine="OpenDriftEngine",
            engine_version="1.14.12",
            model="OceanDrift",
            simulation_mode="HINDCAST",
            simulation_start=result_data["sim_start"],
            simulation_end=result_data["sim_end"],
            timestep=result_data["time_step"],
            particle_count=result_data["particle_count"],
            seed_geometry="Polygon (Slick)",
            forcing_provider=forcing.provider,
            forcing_dataset=forcing.dataset,
            forcing_start=forcing.start_timestamp,
            forcing_end=forcing.end_timestamp,
            forcing_spatial_resolution=forcing.spatial_resolution,
            forcing_temporal_resolution=forcing.temporal_resolution,
            forcing_units=forcing.units,
            forcing_retrieval_timestamp=forcing.retrieval_timestamp,
            requested_coordinates=forcing.requested_coordinates,
            returned_coordinates=forcing.returned_coordinates,
            hindcast_duration=result_data["duration"],
            model_status="LIVE_OPERATIONAL",
            limitations="Real environmental forcing does not imply physically validated drift. Plausible Release Region, not an exact origin."
        )

        return DriftResult(
            id=f"res_{scenario.scenario_id}",
            scenario_id=scenario.scenario_id,
            slick_id=slick.id,
            run_time=datetime.now(timezone.utc),
            origin_estimate=origin_est,
            trajectories=[traj],
            uncertainty=uncert,
            provenance=provenance
        )

    async def run_forecast(self, scenario: DriftScenario, origin: OriginEstimate) -> ForecastResult:
        raise NotImplementedError("Forecast not yet supported for OpenDriftEngine in Phase 13B")
