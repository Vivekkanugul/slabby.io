"""
Slabby Admin Model
Project Marvel - Admin Portal Schema
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class AdminActionType(str, Enum):
    # User actions
    USER_SUSPEND = "user_suspend"
    USER_UNSUSPEND = "user_unsuspend"
    USER_BAN = "user_ban"
    USER_VERIFY = "user_verify"
    USER_ROLE_CHANGE = "user_role_change"
    
    # Card actions
    CARD_REMOVE = "card_remove"
    CARD_FLAG = "card_flag"
    CARD_APPROVE = "card_approve"
    
    # Trade actions
    TRADE_CANCEL = "trade_cancel"
    TRADE_FORCE_COMPLETE = "trade_force_complete"
    DISPUTE_RESOLVE = "dispute_resolve"
    
    # Razz actions
    RAZZ_CANCEL = "razz_cancel"
    RAZZ_FORCE_DRAW = "razz_force_draw"
    
    # Financial actions
    WALLET_ADJUSTMENT = "wallet_adjustment"
    REFUND_ISSUE = "refund_issue"
    FEE_WAIVE = "fee_waive"
    
    # Platform actions
    FEE_UPDATE = "fee_update"
    ANNOUNCEMENT = "announcement"


class AdminAction(BaseModel):
    """Record of admin actions for audit trail"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    action_type: AdminActionType
    
    # Target of action
    target_type: str  # user, card, trade, razz, wallet, platform
    target_id: str
    
    # Action details
    reason: str
    details: Dict[str, Any] = {}
    
    # Before/after state for reversibility
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # IP/session info
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class PlatformStats(BaseModel):
    """Platform-wide statistics for admin dashboard"""
    # Users
    total_users: int = 0
    active_users_24h: int = 0
    active_users_7d: int = 0
    new_users_24h: int = 0
    suspended_users: int = 0
    
    # Cards
    total_cards_listed: int = 0
    cards_listed_24h: int = 0
    total_card_value: float = 0.0
    
    # Trades
    active_trades: int = 0
    trades_completed_24h: int = 0
    trades_volume_24h: float = 0.0
    trades_volume_7d: float = 0.0
    
    # Razz
    active_razzes: int = 0
    razzes_completed_24h: int = 0
    razz_volume_24h: float = 0.0
    razz_volume_7d: float = 0.0
    
    # Financials
    total_deposits_24h: float = 0.0
    total_withdrawals_24h: float = 0.0
    platform_fees_24h: float = 0.0
    platform_fees_7d: float = 0.0
    platform_balance: float = 0.0
    escrow_balance: float = 0.0
    
    # Health
    pending_disputes: int = 0
    pending_withdrawals: int = 0
    flagged_users: int = 0
    flagged_cards: int = 0
    
    # Timestamps
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserFlag(BaseModel):
    """User flagging for review"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    flagged_by: str  # admin_id or "system"
    reason: str
    severity: str = "medium"  # low, medium, high, critical
    status: str = "open"  # open, reviewing, resolved, dismissed
    notes: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None


class Announcement(BaseModel):
    """Platform announcements"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    type: str = "info"  # info, warning, maintenance, feature
    priority: int = 0  # Higher = more important
    active: bool = True
    target_audience: str = "all"  # all, sellers, buyers
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


class AdminDashboardResponse(BaseModel):
    """Admin dashboard data response"""
    stats: PlatformStats
    recent_actions: List[AdminAction]
    pending_disputes: List[Dict[str, Any]]
    flagged_users: List[UserFlag]
    announcements: List[Announcement]
