from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.schemas.drift import DriftScenario, DriftResult, ForecastResult
from app.services.drift_service import DriftService
from app.api.v1.satellite import candidates_db

router = APIRouter(prefix="/drift", tags=["drift"])

# In-memory storage for origin estimates for demo/forecast chaining
origin_db = {}
scenario_db = {}


class HindcastRequest(BaseModel):
    scenario: DriftScenario
    scene_id: str


class ForecastRequest(BaseModel):
    scenario: DriftScenario
    origin_id: str


def get_drift_service():
    return DriftService()


@router.post("/hindcast", response_model=DriftResult)
async def run_hindcast(
    request: HindcastRequest,
    service: DriftService = Depends(get_drift_service)
):
    """
    Run backward drift reconstruction to estimate slick origin.
    Currently uses DEMO_MOCK engine.
    """
    slick = None
    if request.scene_id in candidates_db:
        for candidate in candidates_db[request.scene_id]:
            if candidate.id == request.scenario.slick_id:
                slick = candidate
                break

    if not slick:
        raise HTTPException(
            status_code=404,
            detail=f"Slick {request.scenario.slick_id} not found in scene {request.scene_id}")

    try:
        result = await service.execute_hindcast(request.scenario, slick)

        # Save origin for future forecast chaining
        if result.origin_estimate:
            origin_db[result.origin_estimate.id] = result.origin_estimate

        scenario_db[request.scenario.scenario_id] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hindcast simulation failed: {str(e)}")


@router.post("/forecast", response_model=ForecastResult)
async def run_forecast(
    request: ForecastRequest,
    service: DriftService = Depends(get_drift_service)
):
    """
    Run forward drift to predict future extent.
    Currently uses DEMO_MOCK engine.
    """
    if request.origin_id not in origin_db:
        raise HTTPException(status_code=404, detail=f"Origin estimate {request.origin_id} not found")

    origin = origin_db[request.origin_id]

    try:
        result = await service.execute_forecast(request.scenario, origin)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast simulation failed: {str(e)}")


@router.get("/scenario/{scenario_id}")
async def get_scenario(scenario_id: str):
    if scenario_id not in scenario_db:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario_db[scenario_id]
