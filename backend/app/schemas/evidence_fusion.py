from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from app.schemas.look_alike import LookAlikeAssessment


class EvidenceStatus(str, Enum):
    SUPPORTING = "SUPPORTING"
    NEUTRAL = "NEUTRAL"
    CONTRADICTING = "CONTRADICTING"
    UNAVAILABLE = "UNAVAILABLE"


class EvidenceCategory(str, Enum):
    SAR_MORPHOLOGY = "SAR Morphology"
    MODEL_ASSESSMENT = "Model Assessment"
    WIND_CONTEXT = "Wind Context"
    OCEAN_CURRENT_CONTEXT = "Ocean Current Context"
    OPTICAL_CORROBORATION = "Optical Corroboration"
    TEMPORAL_CONSISTENCY = "Temporal Consistency"


class EvidenceItem(BaseModel):
    category: EvidenceCategory
    source: str = Field(..., description="Source of the evidence (e.g., 'AQUILA Phase 4A Baseline', 'DEMO / MOCK ERA5')")
    status: EvidenceStatus
    observation: str = Field(..., description="What was objectively observed (e.g., 'Wind speed is 2.5 m/s')")
    interpretation: str = Field(..., description="What this suggests in this context")
    limitations: str = Field(..., description="Limitations or caveats of this evidence")
    provenance: str = Field(...,
                            description="Specific versioning or rule context (e.g., 'Heuristic Rule v1.0', 'LIVE / BACKEND')")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EvidenceFusionResult(BaseModel):
    investigation_id: str
    slick_id: str
    overall_assessment_state: str = Field(...,
                                          description="Summary of the fusion (e.g., 'Requires Corroboration', 'Consistent with Oil')")

    evidence_items: List[EvidenceItem]

    # Pre-filtered subsets for easier frontend consumption
    supporting_evidence: List[EvidenceItem] = Field(default_factory=list)
    contradicting_evidence: List[EvidenceItem] = Field(default_factory=list)
    unavailable_evidence: List[EvidenceItem] = Field(default_factory=list)

    fused_at: datetime = Field(default_factory=datetime.utcnow)


class EvidenceFusionRequest(BaseModel):
    investigation_id: str
    scene_id: str
    slick_id: str
    patch_path: Optional[str] = None
    look_alike_assessment: Optional[LookAlikeAssessment] = None
