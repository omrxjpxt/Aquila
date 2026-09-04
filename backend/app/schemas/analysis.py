from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.schemas.look_alike import LookAlikeAssessment

class CandidateAnalysis(BaseModel):
    candidate_id: str = Field(..., description="ID of the detected candidate")
    geometry: Any = Field(..., description="GeoJSON polygon of the candidate")
    area: float = Field(..., description="Approximate area (e.g. geometry area or pixel count)")
    classification_status: str = Field(..., description="'SUCCESS' or 'UNAVAILABLE'")
    unavailable_reason: Optional[str] = Field(default=None, description="Reason if classification is unavailable")
    look_alike_assessment: Optional[LookAlikeAssessment] = Field(default=None, description="SVM classification result")

class RealSceneAnalysisResult(BaseModel):
    scene_id: str
    analysis_mode: str = Field(default="REAL_SCENE_BASELINE")
    provenance: Optional[str] = Field(default="LIVE")
    source: Optional[str] = Field(default="CDSE")
    
    # Raster stats
    raster_width: int
    raster_height: int
    crs: str
    total_pixels: int
    valid_pixels: int
    valid_pixel_percentage: float
    pixel_min: float
    pixel_max: float
    pixel_mean: float
    pixel_median: float
    
    candidate_count: int
    candidates: List[CandidateAnalysis]
    
    model_metadata: Dict[str, str] = Field(
        default_factory=lambda: {
            "classifier_training_domain": "SYNTHETIC",
            "classifier_evaluation_domain": "REAL_SENTINEL_1",
            "evaluation_distribution": "OUT_OF_DISTRIBUTION"
        }
    )
    
    limitations: List[str] = Field(
        default_factory=lambda: [
            "The baseline detector identifies dark SAR anomalies and can produce false positives from coastlines, wind shadows, sea-state effects, acquisition artifacts, and other low-backscatter features.",
            "The HOG + RBF SVM was trained on synthetic data and is currently being evaluated on real Sentinel-1 imagery outside its training distribution.",
            "Raw SVM decision scores are not calibrated probabilities.",
            "An OIL_LIKE classifier result does not establish that an anomaly is petroleum.",
            "This phase does not establish real-world detection accuracy.",
            "Candidate detection is a baseline threshold-based method, not a validated operational oil-spill segmentation model."
        ]
    )
