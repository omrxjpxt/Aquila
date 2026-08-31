from fastapi import APIRouter, HTTPException, Depends
from app.schemas.look_alike import LookAlikeAssessment, LookAlikeRequest
from app.schemas.evidence_fusion import EvidenceFusionRequest, EvidenceFusionResult
from app.schemas.slick import Slick
from app.services.look_alike_service import LookAlikeService
from app.services.environmental_data_service import MockEnvironmentalDataService
from app.services.evidence_fusion_service import EvidenceFusionService
from app.api.v1.satellite import scenes_db, candidates_db
from datetime import datetime

router = APIRouter(prefix="/analysis", tags=["analysis"])


def get_look_alike_service():
    return LookAlikeService()


def get_env_service():
    return MockEnvironmentalDataService()


def get_fusion_service():
    return EvidenceFusionService()


@router.post("/look-alike", response_model=LookAlikeAssessment)
async def assess_look_alike(
    request: LookAlikeRequest,
    service: LookAlikeService = Depends(get_look_alike_service)
):
    """
    Classify a candidate dark region as OIL_LIKE, LOOKALIKE, or UNCERTAIN.

    This endpoint takes a candidate slick (produced by Phase 4A detection)
    and runs the trained baseline model to assess whether the patch is
    more consistent with oil or a SAR look-alike.

    The result is NOT a final oil spill determination.
    Environmental context will be incorporated in a later phase.
    """
    # Look up the scene
    if request.scene_id not in scenes_db:
        raise HTTPException(status_code=404, detail=f"Scene '{request.scene_id}' not found")

    scene = scenes_db[request.scene_id]
    if not scene.is_processed or not scene.processed_storage_path:
        raise HTTPException(status_code=400, detail="Scene must be processed first")

    # Look up the candidate slick
    if request.scene_id not in candidates_db:
        raise HTTPException(status_code=404, detail="No candidates found for this scene")

    slick = None
    for candidate in candidates_db[request.scene_id]:
        if candidate.id == request.slick_id:
            slick = candidate
            break

    if slick is None:
        raise HTTPException(status_code=404, detail=f"Slick '{request.slick_id}' not found")

    try:
        assessment = await service.assess_candidate(
            slick=slick,
            scene_path=scene.processed_storage_path,
            patch_path=request.patch_path
        )
        return assessment
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evidence-fusion", response_model=EvidenceFusionResult)
async def fuse_evidence(
    request: EvidenceFusionRequest,
    la_service: LookAlikeService = Depends(get_look_alike_service),
    env_service: MockEnvironmentalDataService = Depends(get_env_service),
    fusion_service: EvidenceFusionService = Depends(get_fusion_service)
):
    """
    Fuses SAR, ML assessment, and environmental data into an auditable evidence chain.
    """
    if request.scene_id not in scenes_db:
        raise HTTPException(status_code=404, detail=f"Scene '{request.scene_id}' not found")

    scene = scenes_db[request.scene_id]
    
    if request.scene_id not in candidates_db:
        raise HTTPException(status_code=404, detail="No candidates found for this scene")

    slick = None
    for candidate in candidates_db[request.scene_id]:
        if candidate.id == request.slick_id:
            slick = candidate
            break

    if slick is None:
        raise HTTPException(status_code=404, detail=f"Slick '{request.slick_id}' not found")

    # Get ML Assessment
    assessment = request.look_alike_assessment
    if assessment is None:
        if request.patch_path is None or scene.processed_storage_path is None:
            raise HTTPException(status_code=400, detail="Must provide either look_alike_assessment or patch_path for scene")
        try:
            assessment = await la_service.assess_candidate(slick, scene.processed_storage_path, request.patch_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate assessment: {str(e)}")

    # Fetch environmental data
    try:
        # Use slick centroid for location
        lat, lon = slick.centroid[1], slick.centroid[0]
        time = scene.acquisition_time

        wind = await env_service.get_wind(lat, lon, time)
        current = await env_service.get_current(lat, lon, time)
        optical = await env_service.get_optical_availability(lat, lon, time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch environmental context: {str(e)}")

    # Fuse evidence
    try:
        result = fusion_service.fuse_evidence(
            investigation_id=request.investigation_id,
            scene=scene,
            slick=slick,
            model_assessment=assessment,
            wind=wind,
            current=current,
            optical=optical
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fuse evidence: {str(e)}")
