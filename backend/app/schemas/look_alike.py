from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class LookAlikeClass(str, Enum):
    OIL_LIKE = "OIL_LIKE"
    LOOKALIKE = "LOOKALIKE"
    UNCERTAIN = "UNCERTAIN"


class PatchMetadata(BaseModel):
    """Metadata about the image patch used for classification."""
    source_scene_id: str
    bbox: Optional[List[float]] = Field(default=None, description="Bounding box [min_x, min_y, max_x, max_y]")
    patch_width: int
    patch_height: int
    extraction_method: str = Field(default="bounding_box", description="How the patch was extracted")


class LookAlikeAssessment(BaseModel):
    """
    Structured assessment from the look-alike classification model.

    This answers: "Does this candidate look more like oil or a SAR look-alike
    according to the trained image model?"

    It does NOT represent a final AQUILA oil spill determination.
    Environmental context (wind, optical, temporal persistence) will be
    incorporated in a separate evidence-fusion stage.
    """
    slick_id: str = Field(..., description="ID of the candidate slick being assessed")
    predicted_class: LookAlikeClass = Field(..., description="Model prediction: OIL_LIKE, LOOKALIKE, or UNCERTAIN")
    raw_score: float = Field(
        ...,
        description="Raw SVM decision function value. Positive = OIL_LIKE, Negative = LOOKALIKE. Magnitude indicates distance from decision boundary.")
    uncertainty_margin: float = Field(...,
                                      description="Threshold below which |raw_score| triggers UNCERTAIN classification")
    model_version: str = Field(..., description="Identifier of the model used")
    model_type: str = Field(default="HOG+SVM", description="Type of model architecture")
    patch_metadata: PatchMetadata
    assessed_at: datetime = Field(default_factory=datetime.utcnow)

    # Future extension points (not populated in Phase 4B)
    wind_context: Optional[Dict[str, Any]] = None
    optical_confirmation: Optional[Dict[str, Any]] = None
    shape_morphology: Optional[Dict[str, Any]] = None
    temporal_persistence: Optional[Dict[str, Any]] = None
    data_quality: Optional[Dict[str, Any]] = None


class LookAlikeRequest(BaseModel):
    """Request body for look-alike assessment."""
    slick_id: str = Field(..., description="ID of the candidate slick")
    scene_id: str = Field(..., description="ID of the processed scene containing the candidate")
    # Optional: provide a direct patch file path for testing
    patch_path: Optional[str] = Field(default=None, description="Optional direct path to a patch image")
