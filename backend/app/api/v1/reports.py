import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.services.repositories.factory import get_investigation_repository
from app.schemas.report import ReportArchiveItem

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[ReportArchiveItem])
async def list_reports(
    query: Optional[str] = Query(None, description="Filter by Investigation ID or Title"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> List[ReportArchiveItem]:
    """
    Returns an archive listing of all completed and report-ready forensic dossiers.
    Enforces user authorization: only reports owned by the authenticated user or SYSTEM are returned.
    Only investigations with genuinely persisted report-ready status (e.g. REPORT_READY, CLOSED, COMPLETED)
    are included. In-progress or raw detections without report status are excluded.
    """
    repo = get_investigation_repository()
    investigations = repo.list_investigations()

    user_uid = user.get("uid")
    authorized_invs = [
        inv for inv in investigations
        if inv.owner_uid == user_uid or inv.owner_uid == "SYSTEM"
    ]

    report_items: List[ReportArchiveItem] = []
    # Genuine report-ready statuses per system architecture
    valid_statuses = {"REPORT_READY", "CLOSED", "COMPLETED"}

    for inv in authorized_invs:
        if inv.status.upper() in valid_statuses:
            evs = repo.get_evidence(inv.id)
            has_mock = any("mock" in (e.source or "").lower() or "demo" in (e.source or "").lower() for e in evs)
            prov = "DEMO_MOCK" if (has_mock or inv.creation_mode == "DEMO_MOCK") else "LIVE"

            item = ReportArchiveItem(
                id=inv.id,
                investigation_id=inv.id,
                title=inv.title or f"Forensic Investigation {inv.id}",
                priority=inv.priority or "NORMAL",
                status=inv.status,
                created_at=inv.created_at,
                updated_at=inv.updated_at,
                creation_mode=inv.creation_mode,
                provenance_mode=prov,
                evidence_count=len(evs),
                has_attribution=any(e.event_type == "ATTRIBUTION_EVALUATION" for e in evs)
            )

            if query and query.strip():
                q = query.strip().lower()
                if q not in item.id.lower() and q not in item.title.lower():
                    continue

            report_items.append(item)

    # Sort descending by creation date (newest first)
    report_items.sort(key=lambda r: r.created_at, reverse=True)
    return report_items
