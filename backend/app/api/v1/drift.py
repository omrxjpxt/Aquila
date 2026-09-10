from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json

from app.schemas.drift import DriftScenario, DriftResult, ForecastResult, OriginEstimate
from app.schemas.slick import Slick
from app.services.drift_service import DriftService
from app.services.repositories.factory import get_investigation_repository, get_scene_repository
from app.services.repositories.db import get_db_connection
from app.services.slick_detection_service import SlickDetectionService

candidates_db = {}
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
    Uses OpenDrift with real environmental forcing if requested.
    """
    slick = None
    if request.scene_id in candidates_db:
        for candidate in candidates_db[request.scene_id]:
            if candidate.id == request.scenario.slick_id:
                slick = candidate
                break

    # Fallback 1: Check investigation repository
    if not slick and request.scenario.investigation_id:
        try:
            inv_repo = get_investigation_repository()
            inv = inv_repo.get_investigation(request.scenario.investigation_id)
            if inv and inv.anomaly_geometry:
                slick = Slick(
                    id=request.scenario.slick_id or inv.anomaly_id or "anomaly-candidate",
                    source_scene_id=request.scene_id or inv.source_product_id or "scene",
                    detected_at=inv.created_at,
                    geometry=inv.anomaly_geometry,
                    area_sq_km=1.25,
                    classification="OIL_LIKE"
                )
        except Exception:
            pass

    # Fallback 2: Check scene repository and run detection
    if not slick and request.scene_id:
        try:
            scene_repo = get_scene_repository()
            scene = scene_repo.get_scene(request.scene_id)
            if scene:
                det_service = SlickDetectionService()
                cands = await det_service.detect_slicks(scene)
                candidates_db[request.scene_id] = cands
                for c in cands:
                    if c.id == request.scenario.slick_id:
                        slick = c
                        break
                if not slick and cands:
                    slick = cands[0]
        except Exception:
            pass

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
    """
    if request.origin_id not in origin_db:
        # Fallback: check persisted evidence
        try:
            with get_db_connection() as conn:
                cursor = conn.execute("""
                    SELECT observations_json FROM evidence 
                    WHERE evidence_type = 'DRIFT_HINDCAST'
                    ORDER BY timestamp DESC
                """)
                for row in cursor.fetchall():
                    if row["observations_json"]:
                        data = json.loads(row["observations_json"])
                        orig = data.get("origin_estimate")
                        if orig and orig.get("id") == request.origin_id:
                            origin_db[request.origin_id] = OriginEstimate(**orig)
                            break
        except Exception:
            pass

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
    if scenario_id in scenario_db:
        return scenario_db[scenario_id]

    # Check SQLite evidence table for persisted drift hindcast
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT observations_json FROM evidence 
                WHERE evidence_type = 'DRIFT_HINDCAST'
                ORDER BY timestamp DESC
            """)
            for row in cursor.fetchall():
                if row["observations_json"]:
                    data = json.loads(row["observations_json"])
                    if data.get("scenario_id") == scenario_id:
                        return data
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Scenario not found")

