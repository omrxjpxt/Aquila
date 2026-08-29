from app.schemas.slick import Slick
from app.schemas.satellite import SatelliteScene

class LookAlikeService:
    """
    Service contract for filtering out look-alikes (biogenic slicks, wind shadows, etc).
    CORE WORKFLOW: VALIDATE & CHARACTERIZE
    """
    
    async def validate_slick(self, slick: Slick, scene: SatelliteScene) -> Slick:
        """
        Validates a detected slick and updates its classification and confidence.
        """
        raise NotImplementedError
