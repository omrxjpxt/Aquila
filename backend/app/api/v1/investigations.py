from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from app.api.deps import get_current_user, enforce_ownership
from app.services.repositories.factory import get_investigation_repository
from app.schemas.investigation import Investigation
from app.schemas.evidence import EvidenceEvent

router = APIRouter()

@router.get("", response_model=List[Investigation])
async def list_investigations(user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    investigations = repo.list_investigations()
    # Filter by ownership
    return [inv for inv in investigations if inv.owner_uid == user.get("uid") or inv.owner_uid == "SYSTEM"]

@router.get("/{id}", response_model=Investigation)
async def get_investigation(id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    inv = repo.get_investigation(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    enforce_ownership(user, inv.owner_uid)
    return inv

@router.get("/{id}/evidence", response_model=List[EvidenceEvent])
async def get_evidence(id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    inv = repo.get_investigation(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    enforce_ownership(user, inv.owner_uid)
    
    evidence = repo.get_evidence(id)
    return evidence
