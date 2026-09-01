from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from app.schemas.ais import VesselIdentity, VesselCandidate
from app.schemas.drift import OriginEstimate, DriftResult


class EvidenceStatus(str, Enum):
    SUPPORTING = "SUPPORTING"
    NEUTRAL = "NEUTRAL"
    CONTRADICTING = "CONTRADICTING"
    UNAVAILABLE = "UNAVAILABLE"


class AttributionFactor(BaseModel):
    factor_name: str
    status: EvidenceStatus
    observation: str
    interpretation: str
    evidence_source: str
    provenance: str
    limitations: str


class AttributionCandidate(BaseModel):
    vessel_identity: VesselIdentity
    factors: List[AttributionFactor]

    # Counts
    supporting_count: int = 0
    contradicting_count: int = 0
    neutral_count: int = 0
    unavailable_count: int = 0

    evidence_coverage: str  # e.g. "5/6 factors"
    evidence_ranking_score: int


class AttributionResult(BaseModel):
    investigation_id: str
    candidates: List[AttributionCandidate]
    highest_ranked_candidate: Optional[VesselIdentity] = None
    ranking_methodology: str = "Candidate ranking uses a transparent ordinal evidence heuristic. Scores are intended for relative candidate prioritization and are not calibrated probabilities or legal determinations."
    limitations: str = "Candidate ranking is analytical decision support and does not constitute definitive legal attribution."


class AttributionQuery(BaseModel):
    investigation_id: str
    origin_estimate: OriginEstimate
    drift_result: DriftResult
    candidates: List[VesselCandidate]
