import math
from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Any
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


class DriftEngine:
    """
    Interface for running physics-based drift simulations.
    Future adapter for OpenDrift/OpenOil must implement these methods.

    Required forcing:
    - wind (u, v vectors, spatio-temporally varying)
    - ocean currents (u, v vectors, spatio-temporally varying)

    Required initialization:
    - geometry (GeoJSON polygon or point)
    - release time / window
    - particle configuration (number of particles, oil type, etc)

    Expected outputs:
    - Particle trajectories with timestamps
    - Dispersion and uncertainty envelopes
    """

    async def run_hindcast(self, scenario: DriftScenario, slick: Slick) -> DriftResult:
        raise NotImplementedError

    async def run_forecast(self, scenario: DriftScenario, origin: OriginEstimate) -> ForecastResult:
        raise NotImplementedError


class MockDriftEngine(DriftEngine):
    """
    Deterministic mockup of a drift engine for demonstration purposes.
    Generates mathematical trajectories based on fixed mock forcing.
    DO NOT PRESENT THESE RESULTS AS SCIENTIFICALLY VALID.
    """

    def __init__(self):
        # Mock Environmental constants (matching EnvironmentalDataService mock values)
        # Wind: 6.5 m/s coming from 275 deg (West -> moving towards 95 deg)
        # Current: 0.35 m/s moving towards 120 deg
        self.wind_speed_mps = 6.5
        self.wind_dir_from = 275.0
        self.current_speed_mps = 0.35
        self.current_dir_to = 120.0

        # Rule of thumb: Oil drifts at 100% of current + 3% of wind speed
        self.wind_factor = 0.03
        self.current_factor = 1.0

    def _calculate_drift_vector(self) -> Tuple[float, float]:
        """Returns drift vector (dx, dy) in meters per second."""
        wind_dir_to = (self.wind_dir_from - 180) % 360

        # Wind vector (m/s)
        w_x = self.wind_speed_mps * self.wind_factor * math.sin(math.radians(wind_dir_to))
        w_y = self.wind_speed_mps * self.wind_factor * math.cos(math.radians(wind_dir_to))

        # Current vector (m/s)
        c_x = self.current_speed_mps * self.current_factor * math.sin(math.radians(self.current_dir_to))
        c_y = self.current_speed_mps * self.current_factor * math.cos(math.radians(self.current_dir_to))

        return (w_x + c_x, w_y + c_y)

    def _meters_to_degrees(self, lat: float, dx: float, dy: float) -> Tuple[float, float]:
        """Approximates coordinate shift in degrees based on meters displacement."""
        r_earth = 6378137.0
        d_lat = (dy / r_earth) * (180 / math.pi)
        d_lon = (dx / (r_earth * math.cos(math.pi * lat / 180))) * (180 / math.pi)
        return d_lon, d_lat

    def _generate_circle_polygon(self, center_lon: float, center_lat: float, radius_km: float) -> Any:
        """Generates a simple GeoJSON circle polygon."""
        points = []
        num_points = 32
        for i in range(num_points):
            angle = math.radians(float(i) / num_points * 360.0)
            dx = radius_km * 1000.0 * math.sin(angle)
            dy = radius_km * 1000.0 * math.cos(angle)
            d_lon, d_lat = self._meters_to_degrees(center_lat, dx, dy)
            points.append([center_lon + d_lon, center_lat + d_lat])

        # Close the polygon
        points.append(points[0])
        return {
            "type": "Polygon",
            "coordinates": [points]
        }

    async def run_hindcast(self, scenario: DriftScenario, slick: Slick) -> DriftResult:
        # Number of hours to backtrack
        duration_hrs = (scenario.end_time - scenario.start_time).total_seconds() / 3600.0
        duration_hrs = abs(duration_hrs)
        if duration_hrs == 0:
            duration_hrs = 24.0  # Default to 24h

        # Step size
        dt_hrs = 1.0
        steps = int(duration_hrs / dt_hrs)

        drift_vx, drift_vy = self._calculate_drift_vector()
        # Backward: negate vector
        drift_vx = -drift_vx
        drift_vy = -drift_vy

        # Start at centroid
        poly_coords = slick.geometry["coordinates"][0]
        lon = sum(p[0] for p in poly_coords[:-1]) / (len(poly_coords) - 1)
        lat = sum(p[1] for p in poly_coords[:-1]) / (len(poly_coords) - 1)

        start_time = scenario.start_time if scenario.start_time > scenario.end_time else scenario.end_time

        coords = [[lon, lat]]
        timestamps = [start_time]

        current_lon, current_lat = lon, lat
        current_time = start_time

        for _ in range(steps):
            dx = drift_vx * (dt_hrs * 3600)
            dy = drift_vy * (dt_hrs * 3600)
            d_lon, d_lat = self._meters_to_degrees(current_lat, dx, dy)

            current_lon += d_lon
            current_lat += d_lat
            current_time -= timedelta(hours=dt_hrs)

            coords.append([current_lon, current_lat])
            timestamps.append(current_time)

        trajectory = DriftTrajectory(
            id=f"traj_{scenario.scenario_id}",
            coordinates=coords,
            timestamps=timestamps,
            particle_count=100  # Mock cluster
        )

        # Origin estimate is the final point
        origin_poly = self._generate_circle_polygon(current_lon, current_lat, radius_km=5.0)
        origin_est = OriginEstimate(
            id=f"origin_{scenario.scenario_id}",
            slick_id=slick.id,
            scenario_id=scenario.scenario_id,
            estimated_time=current_time,
            geometry=origin_poly
        )

        # Uncertainty is slightly larger
        uncert_poly = self._generate_circle_polygon(current_lon, current_lat, radius_km=8.0)
        uncertainty = DriftUncertainty(geometry=uncert_poly)

        return DriftResult(
            id=f"res_{scenario.scenario_id}",
            scenario_id=scenario.scenario_id,
            slick_id=slick.id,
            run_time=datetime.now(timezone.utc),
            origin_estimate=origin_est,
            trajectories=[trajectory],
            uncertainty=uncertainty
        )

    async def run_forecast(self, scenario: DriftScenario, origin: OriginEstimate) -> ForecastResult:
        duration_hrs = (scenario.end_time - scenario.start_time).total_seconds() / 3600.0
        duration_hrs = abs(duration_hrs)
        if duration_hrs == 0:
            duration_hrs = 24.0

        dt_hrs = 1.0
        steps = int(duration_hrs / dt_hrs)

        # Forward vector
        drift_vx, drift_vy = self._calculate_drift_vector()

        # Start at origin centroid (average of the bounding box of polygon roughly, or just use estimated_location if we had it)
        # We'll just grab the first coordinate of the origin geometry as a rough approximation
        poly_coords = origin.geometry["coordinates"][0]
        lon = sum(p[0] for p in poly_coords[:-1]) / (len(poly_coords) - 1)
        lat = sum(p[1] for p in poly_coords[:-1]) / (len(poly_coords) - 1)

        start_time = scenario.start_time if scenario.start_time < scenario.end_time else scenario.end_time

        coords = [[lon, lat]]
        timestamps = [start_time]

        current_lon, current_lat = lon, lat
        current_time = start_time

        for _ in range(steps):
            dx = drift_vx * (dt_hrs * 3600)
            dy = drift_vy * (dt_hrs * 3600)
            d_lon, d_lat = self._meters_to_degrees(current_lat, dx, dy)

            current_lon += d_lon
            current_lat += d_lat
            current_time += timedelta(hours=dt_hrs)

            coords.append([current_lon, current_lat])
            timestamps.append(current_time)

        trajectory = DriftTrajectory(
            id=f"ftraj_{scenario.scenario_id}",
            coordinates=coords,
            timestamps=timestamps,
            particle_count=100
        )

        extent_poly = self._generate_circle_polygon(current_lon, current_lat, radius_km=10.0)
        uncert_poly = self._generate_circle_polygon(current_lon, current_lat, radius_km=15.0)
        uncertainty = DriftUncertainty(geometry=uncert_poly)

        return ForecastResult(
            id=f"fres_{scenario.scenario_id}",
            scenario_id=scenario.scenario_id,
            origin_id=origin.id,
            run_time=datetime.now(timezone.utc),
            forecast_geometry=extent_poly,
            trajectories=[trajectory],
            uncertainty=uncertainty
        )


class DriftService:
    """
    Coordinates drift scenarios. Uses MockDriftEngine until OpenDrift is integrated.
    """

    def __init__(self):
        self.mock_engine = MockDriftEngine()
        self.open_drift_engine = None

    def _get_opendrift_engine(self):
        if self.open_drift_engine is None:
            from app.services.opendrift_engine import OpenDriftEngine
            self.open_drift_engine = OpenDriftEngine()
        return self.open_drift_engine

    async def execute_hindcast(self, scenario: DriftScenario, slick: Slick) -> DriftResult:
        if "LIVE_OPEN_METEO" in scenario.forcing_sources:
            return await self._get_opendrift_engine().run_hindcast(scenario, slick)
        return await self.mock_engine.run_hindcast(scenario, slick)

    async def execute_forecast(self, scenario: DriftScenario, origin: OriginEstimate) -> ForecastResult:
        if "LIVE_OPEN_METEO" in scenario.forcing_sources:
            return await self._get_opendrift_engine().run_forecast(scenario, origin)
        return await self.mock_engine.run_forecast(scenario, origin)
