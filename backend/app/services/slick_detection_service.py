from typing import List, Optional
from app.schemas.satellite import SatelliteScene
from app.schemas.slick import Slick

class SlickDetectionService:
    """
    Service contract for the ML-based slick detection step.
    CORE WORKFLOW: DETECT
    """
    
    async def detect_slicks(self, scene: SatelliteScene) -> List[Slick]:
        """
        Run the ML model (e.g., PyTorch segmenter) over the satellite scene to detect slicks.
        Returns a list of detected Slick objects.
        """
        raise NotImplementedError
