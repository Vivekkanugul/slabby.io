"""
Slabby Razz Routes
Project Marvel - Provably Fair Raffle API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from models.razz import RazzCreate, RazzSpotPurchase, RazzResponse, RazzVerification, RazzStatus
from services.razz_service import RazzService
from routes.auth import get_current_user

router = APIRouter(prefix="/razz", tags=["Razz"])


def get_razz_service():
    """Dependency to get razz service - set by main app"""
    from server import razz_service
    return razz_service


@router.post("", response_model=RazzResponse)
async def create_razz(
    data: RazzCreate,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Create a new razz (raffle)"""
    return await razz_service.create(current_user["id"], data)


@router.get("", response_model=List[RazzResponse])
async def get_active_razzes(
    category: Optional[str] = None,
    limit: int = Query(50, le=100),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Get active razzes"""
    return await razz_service.get_active_razzes(category, limit)


@router.get("/my-razzes", response_model=List[RazzResponse])
async def get_my_razzes(
    as_host: bool = True,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Get user's razzes (as host or participant)"""
    return await razz_service.get_user_razzes(current_user["id"], as_host)


@router.get("/{razz_id}", response_model=RazzResponse)
async def get_razz(
    razz_id: str,
    razz_service: RazzService = Depends(get_razz_service)
):
    """Get razz details"""
    razz = await razz_service.get_by_id(razz_id)
    if not razz:
        raise HTTPException(status_code=404, detail="Razz not found")
    
    include_proof = razz.get("status") == RazzStatus.COMPLETED.value
    return razz_service._razz_to_response(razz, include_proof=include_proof)


@router.post("/{razz_id}/publish", response_model=RazzResponse)
async def publish_razz(
    razz_id: str,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Publish razz to make it active"""
    try:
        result = await razz_service.publish(razz_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Razz not found or not owned by you")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{razz_id}/purchase", response_model=RazzResponse)
async def purchase_spots(
    razz_id: str,
    data: RazzSpotPurchase,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Purchase spots in a razz"""
    try:
        result = await razz_service.purchase_spots(razz_id, current_user["id"], data.spot_numbers)
        if not result:
            raise HTTPException(status_code=404, detail="Razz not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{razz_id}/draw", response_model=RazzResponse)
async def draw_winner(
    razz_id: str,
    client_seed: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Execute provably fair draw (host or system only)"""
    razz = await razz_service.get_by_id(razz_id)
    if not razz:
        raise HTTPException(status_code=404, detail="Razz not found")
    
    # Only host can trigger manual draw
    if razz["host_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only host can trigger draw")
    
    try:
        result = await razz_service.draw_winner(razz_id, client_seed)
        if not result:
            raise HTTPException(status_code=404, detail="Razz not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{razz_id}/verify", response_model=RazzVerification)
async def verify_fairness(
    razz_id: str,
    razz_service: RazzService = Depends(get_razz_service)
):
    """Verify the fairness of a completed razz"""
    try:
        return await razz_service.verify_fairness(razz_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{razz_id}/cancel", response_model=RazzResponse)
async def cancel_razz(
    razz_id: str,
    current_user: dict = Depends(get_current_user),
    razz_service: RazzService = Depends(get_razz_service)
):
    """Cancel razz (host only, before filled)"""
    try:
        result = await razz_service.cancel(razz_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Razz not found or not owned by you")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/active-count")
async def get_active_razz_count(razz_service: RazzService = Depends(get_razz_service)):
    """Get count of active razzes"""
    count = await razz_service.get_active_count()
    return {"active_razzes": count}
