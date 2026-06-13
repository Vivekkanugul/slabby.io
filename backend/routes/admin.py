"""
Slabby Admin Routes
Project Marvel - Admin Portal API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from models.user import UserRole
from models.admin import PlatformStats, AdminDashboardResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if current_user.get("role") not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value, "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(admin_user: dict = Depends(require_admin)):
    """Get platform-wide statistics"""
    from server import db, trade_service, razz_service, wallet_service
    
    # Count users
    total_users = await db.users.count_documents({})
    suspended_users = await db.users.count_documents({"status": "suspended"})
    
    # Count cards
    total_cards = await db.cards.count_documents({"status": "available"})
    
    # Get trade/razz counts
    active_trades = await trade_service.get_active_count()
    active_razzes = await razz_service.get_active_count()
    
    # Platform balance
    platform_balance = await wallet_service.get_platform_balance()
    
    return PlatformStats(
        total_users=total_users,
        active_users_24h=0,  # Would need login tracking
        active_users_7d=0,
        new_users_24h=0,
        suspended_users=suspended_users,
        total_cards_listed=total_cards,
        cards_listed_24h=0,
        total_card_value=0.0,
        active_trades=active_trades,
        trades_completed_24h=0,
        trades_volume_24h=0.0,
        trades_volume_7d=0.0,
        active_razzes=active_razzes,
        razzes_completed_24h=0,
        razz_volume_24h=0.0,
        razz_volume_7d=0.0,
        total_deposits_24h=0.0,
        total_withdrawals_24h=0.0,
        platform_fees_24h=0.0,
        platform_fees_7d=0.0,
        platform_balance=platform_balance,
        escrow_balance=0.0,
        pending_disputes=0,
        pending_withdrawals=0,
        flagged_users=0,
        flagged_cards=0
    )


@router.get("/users")
async def get_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    admin_user: dict = Depends(require_admin)
):
    """Get list of users (admin only)"""
    from server import db
    
    query = {}
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    
    cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).skip(offset).limit(limit)
    users = await cursor.to_list(length=limit)
    
    return {"users": users, "count": len(users)}


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    reason: str,
    admin_user: dict = Depends(require_admin)
):
    """Suspend a user account"""
    from server import db
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "suspended"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} suspended", "reason": reason}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    admin_user: dict = Depends(require_admin)
):
    """Unsuspend a user account"""
    from server import db
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "active"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} unsuspended"}


@router.get("/events")
async def get_recent_events(
    event_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    admin_user: dict = Depends(require_admin)
):
    """Get recent platform events"""
    from server import event_store
    
    events = await event_store.get_recent_events(limit)
    
    return {
        "events": [e.model_dump() for e in events],
        "count": len(events)
    }
