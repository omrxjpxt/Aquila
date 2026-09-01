from fastapi import APIRouter

from app.schemas.simulation import CounterfactualScenario, CounterfactualResult
from app.services.simulation_service import CounterfactualSimulationService

router = APIRouter()
service = CounterfactualSimulationService()


@router.post("/counterfactual", response_model=CounterfactualResult)
async def run_counterfactual(scenario: CounterfactualScenario):
    """
    Runs a forward counterfactual simulation for a candidate vessel release hypothesis.
    """
    return service.run_scenario(scenario)
