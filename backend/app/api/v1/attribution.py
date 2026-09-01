from fastapi import APIRouter

from app.schemas.attribution import AttributionQuery, AttributionResult
from app.services.attribution_service import AttributionService

router = APIRouter()
service = AttributionService()

@router.post("/evaluate", response_model=AttributionResult)
async def evaluate_attribution(query: AttributionQuery):
    """
    Evaluates AIS candidates against evidence factors.
    """
    return service.evaluate(
        investigation_id=query.investigation_id,
        origin=query.origin_estimate,
        drift=query.drift_result,
        candidates=query.candidates
    )
