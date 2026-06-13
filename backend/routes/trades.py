"""
Slabby Trade Routes
Project Marvel - P2P Trading API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from models.trade import TradeCreate, TradeCounter, TradeResponse, TradeStatus
from services.trade_service import TradeService
from routes.auth import get_current_user

router = APIRouter(prefix="/trades", tags=["Trades"])


def get_trade_service():
    """Dependency to get trade service - set by main app"""
    from server import trade_service
    return trade_service


@router.post("", response_model=TradeResponse)
async def create_trade(
    data: TradeCreate,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Create a new trade offer"""
    return await trade_service.create(current_user["id"], data)


@router.get("", response_model=List[TradeResponse])
async def get_my_trades(
    status: Optional[TradeStatus] = None,
    role: Optional[str] = Query(None, regex="^(initiator|receiver)$"),
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Get current user's trades"""
    return await trade_service.get_user_trades(current_user["id"], status, role)


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Get trade details"""
    trade = await trade_service.get_by_id(trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify user is part of trade
    if current_user["id"] not in [trade["initiator_id"], trade["receiver_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized to view this trade")
    
    return trade_service._trade_to_response(trade)


@router.post("/{trade_id}/counter", response_model=TradeResponse)
async def counter_trade(
    trade_id: str,
    counter: TradeCounter,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Make a counter-offer"""
    try:
        result = await trade_service.counter_offer(trade_id, current_user["id"], counter)
        if not result:
            raise HTTPException(status_code=404, detail="Trade not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trade_id}/accept", response_model=TradeResponse)
async def accept_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Accept current trade offer"""
    try:
        result = await trade_service.accept(trade_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Trade not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trade_id}/reject", response_model=TradeResponse)
async def reject_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Reject trade offer"""
    try:
        result = await trade_service.reject(trade_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Trade not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trade_id}/cancel", response_model=TradeResponse)
async def cancel_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
    trade_service: TradeService = Depends(get_trade_service)
):
    """Cancel trade"""
    try:
        result = await trade_service.cancel(trade_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Trade not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/active-count")
async def get_active_trade_count(trade_service: TradeService = Depends(get_trade_service)):
    """Get count of active trades"""
    count = await trade_service.get_active_count()
    return {"active_trades": count}
