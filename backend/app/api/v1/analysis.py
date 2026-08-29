from fastapi import APIRouter, HTTPException, Depends
from app.schemas.look_alike import LookAlikeAssessment, LookAlikeRequest
from app.schemas.slick import Slick
from app.services.look_alike_service import LookAlikeService
from app.api.v1.satellite import scenes_db, candidates_db
from datetime import datetime

router = APIRouter(prefix="/analysis", tags=["analysis"])


def get_look_alike_service():
    return LookAlikeService()


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
