from app.schemas.slick import Slick
from app.schemas.drift import OriginEstimate, DriftResult
from datetime import datetime
from typing import List

class DriftService:
    """
    Service contract for running drift simulations (OpenDrift/OpenOil).
    CORE WORKFLOW: RECONSTRUCT
    """
    
    async def estimate_origin(self, slick: Slick, metocean_data: list) -> OriginEstimate:
        """
        Run back-trajectory modeling to estimate the origin of the spill (T0 and location).
        """
        raise NotImplementedError

    async def simulate_forward_drift(self, origin: OriginEstimate, duration_hours: int, metocean_data: list) -> DriftResult:
        """
        Run forward trajectory modeling for forecasting.
        """
        raise NotImplementedError
