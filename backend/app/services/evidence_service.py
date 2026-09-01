from typing import List
from app.schemas.evidence import EvidenceEvent


class EvidenceService:
    """
    Service contract for managing the chronological forensic log.
    CORE WORKFLOW: EXPLAIN
    """

    async def record_event(self, event: EvidenceEvent) -> EvidenceEvent:
        """
        Record a new piece of evidence or event into the investigation's timeline.
        """
        raise NotImplementedError

    async def get_investigation_timeline(self, investigation_id: str) -> List[EvidenceEvent]:
        """
        Retrieve the full chronological evidence log for an investigation.
        """
        raise NotImplementedError
