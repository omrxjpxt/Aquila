from datetime import datetime, timezone
from app.schemas.satellite import SatelliteScene
from app.schemas.slick import Slick
from app.schemas.look_alike import LookAlikeAssessment
from app.schemas.environment import WindObservation, CurrentObservation, OpticalAvailability, OpticalAvailabilityStatus
from app.schemas.evidence_fusion import (
    EvidenceFusionResult, 
    EvidenceItem, 
    EvidenceStatus, 
    EvidenceCategory
)

class EvidenceFusionService:
    """
    Service responsible for fusing SAR, ML, and environmental context into a transparent,
    auditable chain of evidence. Does NOT manufacture calibrated probabilities.
    """
    
    def fuse_evidence(
        self,
        investigation_id: str,
        scene: SatelliteScene,
        slick: Slick,
        model_assessment: LookAlikeAssessment,
        wind: WindObservation,
        current: CurrentObservation,
        optical: OpticalAvailability
    ) -> EvidenceFusionResult:
        
        items = []
        
        # 1. SAR Morphology
        # Based purely on geometric and backscatter properties prior to ML
        contrast_ratio = slick.supporting_metrics.get("contrast_ratio")
        has_contrast = contrast_ratio is not None and contrast_ratio > 1.2
        is_sizable = slick.area_sq_km > 0.5
        
        if has_contrast and is_sizable:
            items.append(EvidenceItem(
                category=EvidenceCategory.SAR_MORPHOLOGY,
                source="AQUILA Phase 4A Baseline",
                status=EvidenceStatus.SUPPORTING,
                observation=f"Area: {slick.area_sq_km:.2f} km², Contrast: {contrast_ratio:.2f}",
                interpretation="Morphology and contrast are consistent with oil spill characteristics.",
                limitations="Backscatter suppression alone cannot distinguish oil from biogenic slicks.",
                provenance="Phase 4A Thresholding"
            ))
        else:
            items.append(EvidenceItem(
                category=EvidenceCategory.SAR_MORPHOLOGY,
                source="AQUILA Phase 4A Baseline",
                status=EvidenceStatus.NEUTRAL,
                observation=f"Area: {slick.area_sq_km:.2f} km², Contrast: {contrast_ratio or 'N/A'}",
                interpretation="Morphology is ambiguous or low contrast.",
                limitations="Backscatter suppression alone cannot distinguish oil from biogenic slicks.",
                provenance="Phase 4A Thresholding"
            ))

        # 2. Model Assessment
        if model_assessment.predicted_class == 'OIL_LIKE':
            status = EvidenceStatus.SUPPORTING
            interp = "Pattern conforms to features typical of verified oil spills."
        elif model_assessment.predicted_class == 'LOOKALIKE':
            status = EvidenceStatus.CONTRADICTING
            interp = "Pattern aligns with common SAR look-alikes (e.g. wind shadowing, biogenic film)."
        else:
            status = EvidenceStatus.NEUTRAL
            interp = "Model returned uncertain classification due to edge-case features."
            
        items.append(EvidenceItem(
            category=EvidenceCategory.MODEL_ASSESSMENT,
            source=model_assessment.model_version,
            status=status,
            observation=f"Classification: {model_assessment.predicted_class}, Raw Score: {model_assessment.raw_score:.4f}",
            interpretation=interp,
            limitations="Model trained on synthetic demonstration data. Not validated on real-world SAR targets.",
            provenance="HOG+SVM v1 Demo"
        ))

        # 3. Wind Context
        # Heuristics:
        # < 2 m/s -> LIMITING / HIGH LOOK-ALIKE RISK -> CONTRADICTING
        # 2–3 m/s -> LOW-CONTRAST / CAUTION -> NEUTRAL
        # 3–10 m/s -> FAVORABLE DETECTION CONTEXT -> SUPPORTING
        # 10–12 m/s -> REDUCED DETECTABILITY / CAUTION -> NEUTRAL
        # > 12 m/s -> LIMITING / REDUCED DETECTABILITY -> NEUTRAL
        w_speed = wind.speed_m_s
        if w_speed < 2.0:
            w_status = EvidenceStatus.CONTRADICTING
            w_interp = "LIMITING / HIGH LOOK-ALIKE RISK. Biogenic slicks and wind shadows are highly prevalent."
        elif 2.0 <= w_speed < 3.0:
            w_status = EvidenceStatus.NEUTRAL
            w_interp = "LOW-CONTRAST / CAUTION. Slicks may be visible but false positives remain common."
        elif 3.0 <= w_speed <= 10.0:
            w_status = EvidenceStatus.SUPPORTING
            w_interp = "FAVORABLE DETECTION CONTEXT. Optimal wind regime for SAR slick contrast."
        elif 10.0 < w_speed <= 12.0:
            w_status = EvidenceStatus.NEUTRAL
            w_interp = "REDUCED DETECTABILITY / CAUTION. Slicks begin to mix into the water column."
        else:
            w_status = EvidenceStatus.NEUTRAL
            w_interp = "LIMITING / REDUCED DETECTABILITY. Surface oil is likely entrained, limiting SAR visibility."
            
        items.append(EvidenceItem(
            category=EvidenceCategory.WIND_CONTEXT,
            source=wind.source,
            status=w_status,
            observation=f"Speed: {w_speed:.1f} m/s, Dir: {wind.direction_deg:.1f}°",
            interpretation=w_interp,
            limitations="Wind is regional context; local micro-meteorology may differ.",
            provenance="AQUILA Demo Heuristics v1.0"
        ))
        
        # 4. Ocean Current Context
        items.append(EvidenceItem(
            category=EvidenceCategory.OCEAN_CURRENT_CONTEXT,
            source=current.source,
            status=EvidenceStatus.NEUTRAL,
            observation=f"Speed: {current.speed_m_s:.2f} m/s, Dir: {current.direction_deg:.1f}°",
            interpretation="Context only. Current direction recorded for future drift reconstruction.",
            limitations="Does not prove source correlation without full hydrodynamic modeling.",
            provenance="AQUILA Demo Context"
        ))
        
        # 5. Optical Corroboration
        if optical.status == OpticalAvailabilityStatus.AVAILABLE:
            opt_status = EvidenceStatus.SUPPORTING
            opt_interp = "Optical imagery available and corroborates surface anomaly."
        elif optical.status == OpticalAvailabilityStatus.CLOUD_OBSCURED:
            opt_status = EvidenceStatus.UNAVAILABLE
            opt_interp = "Optical imagery exists but is cloud-obscured."
        else:
            opt_status = EvidenceStatus.UNAVAILABLE
            opt_interp = f"Optical imagery is {optical.status.value.replace('_', ' ').lower()}."
            
        items.append(EvidenceItem(
            category=EvidenceCategory.OPTICAL_CORROBORATION,
            source=optical.source,
            status=opt_status,
            observation=f"Status: {optical.status.value}",
            interpretation=opt_interp,
            limitations="Optical sensors are limited by daylight and cloud cover.",
            provenance="AQUILA Optical Assessor"
        ))
        
        # 6. Temporal Consistency
        # For phase 4D, we just compare SAR acquisition time vs Environmental observation time
        # Ensure timezone awareness
        env_time = wind.timestamp
        sar_time = scene.acquisition_time
        if not env_time.tzinfo:
            env_time = env_time.replace(tzinfo=timezone.utc)
        if not sar_time.tzinfo:
            sar_time = sar_time.replace(tzinfo=timezone.utc)
            
        offset_hours = abs((sar_time - env_time).total_seconds()) / 3600.0
        
        if offset_hours < 2.0:
            t_status = EvidenceStatus.SUPPORTING
            t_interp = "Environmental data is temporally aligned with SAR acquisition."
        else:
            t_status = EvidenceStatus.NEUTRAL
            t_interp = f"Temporal offset of {offset_hours:.1f} hours limits environmental correlation certainty."

        items.append(EvidenceItem(
            category=EvidenceCategory.TEMPORAL_CONSISTENCY,
            source="System",
            status=t_status,
            observation=f"Temporal offset: {offset_hours:.1f} hours",
            interpretation=t_interp,
            limitations="Temporal proximity does not guarantee spatial accuracy.",
            provenance="System clock"
        ))

        # Overall assessment logic
        supports = [i for i in items if i.status == EvidenceStatus.SUPPORTING]
        contradicts = [i for i in items if i.status == EvidenceStatus.CONTRADICTING]
        unavailables = [i for i in items if i.status == EvidenceStatus.UNAVAILABLE]
        
        if len(contradicts) > 0:
            overall = "Requires Corroboration / Contradicting Evidence Present"
        elif len(supports) >= 3:
            overall = "Consistent with Oil"
        elif len(supports) > 0:
            overall = "Insufficient Evidence / Context Only"
        else:
            overall = "Inconclusive"

        return EvidenceFusionResult(
            investigation_id=investigation_id,
            slick_id=slick.id,
            overall_assessment_state=overall,
            evidence_items=items,
            supporting_evidence=supports,
            contradicting_evidence=contradicts,
            unavailable_evidence=unavailables
        )
