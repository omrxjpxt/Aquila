from typing import List
from datetime import datetime

from app.schemas.attribution import (
    AttributionFactor,
    AttributionCandidate,
    AttributionResult,
    EvidenceStatus
)
from app.schemas.ais import VesselCandidate
from app.schemas.drift import OriginEstimate, DriftResult


class AttributionService:
    """
    Evaluates candidate vessels against 6 physical/behavioural factors.
    Returns an explainable compatibility ranking.
    """

    def evaluate(self, investigation_id: str, origin: OriginEstimate, drift: DriftResult,
                 candidates: List[VesselCandidate]) -> AttributionResult:

        evaluated_candidates = []

        for cand in candidates:
            factors = []

            # 1. SPATIAL
            if cand.inside_origin_region:
                status = EvidenceStatus.SUPPORTING
                obs = "Track intersects inferred origin region."
            elif cand.spatially_relevant:
                status = EvidenceStatus.NEUTRAL
                obs = f"Track passes near origin region (closest approach: {cand.closest_approach_meters/1000.0:.1f} km)."
            else:
                status = EvidenceStatus.CONTRADICTING
                obs = "Track does not pass near origin region."

            factors.append(AttributionFactor(
                factor_name="Spatial Compatibility",
                status=status,
                observation=obs,
                interpretation="Vessel was in a spatially compatible location to be the source.",
                evidence_source="AIS Provider / Geometric Intersection",
                provenance="AQUILA Geometric Analysis",
                limitations="Proximity does not equate to responsibility."
            ))

            # 2. TEMPORAL
            if cand.temporally_relevant:
                status = EvidenceStatus.SUPPORTING
                obs = "Vessel was present during the inferred release window."
            else:
                status = EvidenceStatus.CONTRADICTING
                obs = "Vessel was absent during the inferred release window."

            factors.append(AttributionFactor(
                factor_name="Temporal Compatibility",
                status=status,
                observation=obs,
                interpretation="Vessel transit timing aligns with estimated spill time.",
                evidence_source="AIS Provider",
                provenance="AQUILA Temporal Filter",
                limitations="Presence during the window does not equate to responsibility."
            ))

            # 3. TRAJECTORY
            status = EvidenceStatus.UNAVAILABLE
            obs = "Standard maneuvers observed; insufficient granular evidence to determine anomaly."
            factors.append(AttributionFactor(
                factor_name="Trajectory Compatibility",
                status=status,
                observation=obs,
                interpretation="No unusual navigational maneuvers explicitly identified.",
                evidence_source="AIS Track Geometry",
                provenance="AQUILA Trajectory Analysis",
                limitations="Ordinary movement does not preclude illicit activity."
            ))

            # 4. DRIFT
            is_mock_drift = "mock" in drift.provenance.engine.lower() or drift.provenance.mode == "DEMO_MOCK"
            drift_mode = "DEMO_MOCK" if is_mock_drift else "LIVE"
            
            if is_mock_drift:
                status = EvidenceStatus.UNAVAILABLE
                obs = "Mock drift demonstrates algorithmic behavior but is not forensic evidence."
            else:
                if cand.spatially_relevant and cand.temporally_relevant:
                    status = EvidenceStatus.SUPPORTING
                    obs = "Vessel position aligns with backward drift reconstruction."
                elif not cand.spatially_relevant and not cand.temporally_relevant:
                    status = EvidenceStatus.CONTRADICTING
                    obs = "Vessel position explicitly contradicts backward drift reconstruction."
                else:
                    status = EvidenceStatus.UNAVAILABLE
                    obs = "Insufficient overlap between vessel track and drift footprint."

            factors.append(AttributionFactor(
                factor_name="Drift Compatibility",
                status=status,
                observation=obs,
                interpretation="Vessel intercepts the back-propagated slick footprint.",
                evidence_source=drift.provenance.engine,
                provenance=drift_mode,
                limitations="Physical drift reconstruction is subject to environmental uncertainties." if not is_mock_drift else "Not valid forensic evidence."
            ))

            # 5. BEHAVIOURAL
            status = EvidenceStatus.UNAVAILABLE
            obs = "Insufficient baseline history to establish behavioural anomalies."
            factors.append(AttributionFactor(
                factor_name="Behavioural Evidence",
                status=status,
                observation=obs,
                interpretation="Behavioural Anomaly Observed status cannot be determined.",
                evidence_source="Historical AIS Database",
                provenance="AQUILA Behaviour Engine",
                limitations="Lack of historical baseline prevents anomaly detection."
            ))

            # 6. AIS QUALITY
            qual = cand.track.coverage_quality
            if qual == "GOOD":
                status = EvidenceStatus.SUPPORTING
                obs = "High density AIS observations with complete evidentiary record."
            elif qual == "MODERATE":
                status = EvidenceStatus.UNAVAILABLE
                obs = "AIS gap observed; evidentiary record is incomplete."
            else:
                status = EvidenceStatus.UNAVAILABLE
                obs = "AIS gap observed; evidentiary record is incomplete."

            factors.append(AttributionFactor(
                factor_name="AIS Data Quality",
                status=status,
                observation=obs,
                interpretation="The evidentiary quality of the AIS record is evaluated.",
                evidence_source="AIS Gap Analysis",
                provenance=cand.provenance.mode,
                limitations="Missing data limits evidence but is not proof of suspicious behaviour."
            ))

            # Calculate counts and score
            sup = sum(1 for f in factors if f.status == EvidenceStatus.SUPPORTING)
            neu = sum(1 for f in factors if f.status == EvidenceStatus.NEUTRAL)
            con = sum(1 for f in factors if f.status == EvidenceStatus.CONTRADICTING)
            una = sum(1 for f in factors if f.status == EvidenceStatus.UNAVAILABLE)

            score = (sup * 2) + (con * -2)
            cov = f"{len(factors) - una}/{len(factors)} factors"

            evaluated_candidates.append(AttributionCandidate(
                vessel_identity=cand.identity,
                factors=factors,
                supporting_count=sup,
                neutral_count=neu,
                contradicting_count=con,
                unavailable_count=una,
                evidence_coverage=cov,
                evidence_ranking_score=score
            ))

        # Deterministic Ranking: Score Descending, then MMSI Ascending (to preserve ties deterministically)
        evaluated_candidates.sort(key=lambda x: (-x.evidence_ranking_score, x.vessel_identity.mmsi))

        highest = evaluated_candidates[0].vessel_identity if evaluated_candidates else None

        return AttributionResult(
            investigation_id=investigation_id,
            candidates=evaluated_candidates,
            highest_ranked_candidate=highest
        )
