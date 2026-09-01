from typing import Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import json

from shapely.geometry import shape, mapping
from shapely.validation import make_valid

from app.schemas.simulation import (
    CounterfactualScenario,
    CounterfactualResult,
    SimulationComparison,
    DifferenceGeometry,
    SimulationProvenance
)
from app.schemas.drift import DriftScenario, OriginEstimate
from app.services.drift_service import DriftService


class CounterfactualSimulationService:
    def __init__(self):
        self.drift_service = DriftService()

    def _create_shapely_geom(self, geom_dict: Dict[str, Any]):
        """Helper to create a valid shapely geometry from GeoJSON dict."""
        try:
            geom = shape(geom_dict)
            if not geom.is_valid:
                geom = make_valid(geom)
            return geom
        except Exception:
            return None

    def compare_geometries(self, observed_geom_dict: Dict[str, Any], simulated_geom_dict: Dict[str,
                           Any]) -> Tuple[float, float, float, float, float, DifferenceGeometry]:
        """
        Objective computation of metrics. Does not interpret them.
        """
        obs_geom = self._create_shapely_geom(observed_geom_dict)
        sim_geom = self._create_shapely_geom(simulated_geom_dict)

        if not obs_geom or not sim_geom:
            return 0.0, 0.0, 0.0, 0.0, 0.0, DifferenceGeometry()

        try:
            intersection = obs_geom.intersection(sim_geom)
            union = obs_geom.union(sim_geom)

            # Simple projected area approximation for metrics (degrees squared is fine for relative metrics,
            # but ideally we'd project to local UTM. For now we use relative unitless area).
            obs_area = obs_geom.area
            sim_area = sim_geom.area
            overlap_area = intersection.area
            union_area = union.area

            iou = overlap_area / union_area if union_area > 0 else 0.0

            centroid_distance = obs_geom.centroid.distance(sim_geom.centroid)  # in degrees
            centroid_distance_meters = centroid_distance * 111000  # rough approximation

            diff_obs = obs_geom.difference(sim_geom)
            diff_sim = sim_geom.difference(obs_geom)

            diff_geom = DifferenceGeometry(
                overlap_polygon=mapping(intersection) if not intersection.is_empty else None,
                observed_only_polygon=mapping(diff_obs) if not diff_obs.is_empty else None,
                simulated_only_polygon=mapping(diff_sim) if not diff_sim.is_empty else None
            )

            return iou, overlap_area, obs_area, sim_area, centroid_distance_meters, diff_geom

        except Exception:
            return 0.0, 0.0, 0.0, 0.0, 0.0, DifferenceGeometry()

    def interpret_comparison(self, iou: float) -> str:
        """
        Transforms objective metrics into a heuristic band.
        """
        if iou > 0.9:
            return "PERFECT_OVERLAP"
        elif iou > 0.5:
            return "STRONG_OVERLAP"
        elif iou > 0.1:
            return "PARTIAL_OVERLAP"
        elif iou > 0.0:
            return "MINIMAL_OVERLAP"
        else:
            return "NO_OVERLAP"

    def get_human_interpretation(self, interpretation_band: str) -> str:
        if interpretation_band == "PERFECT_OVERLAP":
            return "Simulated movement perfectly aligns with the observed slick."
        elif interpretation_band == "STRONG_OVERLAP":
            return "Simulated movement shows strong spatial agreement with the observed slick."
        elif interpretation_band == "PARTIAL_OVERLAP":
            return "Simulated movement shows partial spatial overlap with the observed slick."
        elif interpretation_band == "MINIMAL_OVERLAP":
            return "Simulated movement shows limited spatial agreement with the observed slick."
        else:
            return "Simulated movement produces no spatial overlap with the observed slick."

    def run_scenario(self, scenario: CounterfactualScenario) -> CounterfactualResult:
        # Create a fake OriginEstimate for the Drift engine
        point_geom = {
            "type": "Polygon",
            "coordinates": [[
                [scenario.hypothesized_release_location[0] - 0.01, scenario.hypothesized_release_location[1] - 0.01],
                [scenario.hypothesized_release_location[0] + 0.01, scenario.hypothesized_release_location[1] - 0.01],
                [scenario.hypothesized_release_location[0] + 0.01, scenario.hypothesized_release_location[1] + 0.01],
                [scenario.hypothesized_release_location[0] - 0.01, scenario.hypothesized_release_location[1] + 0.01],
                [scenario.hypothesized_release_location[0] - 0.01, scenario.hypothesized_release_location[1] - 0.01]
            ]]
        }

        fake_origin = OriginEstimate(
            id="hypothetical_origin",
            slick_id="counterfactual",
            scenario_id="counterfactual",
            estimated_time=scenario.hypothesized_release_time,
            geometry=point_geom
        )

        drift_scenario = DriftScenario(
            scenario_id=f"cft_{scenario.candidate_vessel_id}",
            investigation_id=scenario.investigation_id,
            start_time=scenario.hypothesized_release_time,
            end_time=scenario.hypothesized_release_time + timedelta(hours=scenario.drift_duration_hours),
            is_backward=False
        )

        # Run forward simulation
        forecast = self.drift_service.execute_forecast(drift_scenario, fake_origin)

        simulated_geom = forecast.forecast_geometry

        # Extract simulated trajectory
        trajectory = forecast.trajectories[0].coordinates if forecast.trajectories else []

        # Compare
        iou, overlap, obs_a, sim_a, centroid_dist, diff_geom = self.compare_geometries(
            scenario.observed_slick_geometry,
            simulated_geom
        )

        interpretation_band = self.interpret_comparison(iou)
        human_interp = self.get_human_interpretation(interpretation_band)

        comparison = SimulationComparison(
            spatial_agreement_iou=iou,
            overlap_area_km2=overlap * 10000,  # Fake scaling just for the demo numbers
            observed_area_km2=obs_a * 10000,
            simulated_area_km2=sim_a * 10000,
            centroid_distance_meters=centroid_dist,
            trajectory_comparison="NOT_EVALUATED_IN_DEMO",
            temporal_comparison="NOT_EVALUATED_IN_DEMO",
            spatial_interpretation=interpretation_band,
            human_readable_interpretation=human_interp
        )

        provenance = SimulationProvenance(
            mode="DEMO_MOCK",
            engine="MockDriftEngine",
            model_status="NOT_PHYSICALLY_VALIDATED",
            observed_data_source="Sentinel-1 SAR Detection",
            simulation_forcing_source="Mock Environmental Constants",
            scenario_parameters=scenario.scenario_parameters,
            limitations="Counterfactual simulation relies on a deterministic MockDriftEngine. Result is an analytical hypothesis test, not causal proof."
        )

        return CounterfactualResult(
            scenario_id=f"cft_{scenario.candidate_vessel_id}_{scenario.hypothesized_release_time.timestamp()}",
            scenario=scenario,
            simulated_slick_geometry=simulated_geom,
            simulated_trajectory=trajectory,
            difference_geometry=diff_geom,
            comparison=comparison,
            provenance=provenance
        )
