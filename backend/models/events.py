"""
Slabby Event Store - Immutable Event Log
Project Marvel - Event-Sourced Architecture

Every state change is recorded as an immutable event.
Events are append-only and form the source of truth.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timezone
from enum import Enum
import uuid


class EventType(str, Enum):
    # User Events
    USER_REGISTERED = "user.registered"
    USER_UPDATED = "user.updated"
    USER_VERIFIED = "user.verified"
    USER_SUSPENDED = "user.suspended"
    
    # Card Events
    CARD_LISTED = "card.listed"
    CARD_UNLISTED = "card.unlisted"
    CARD_TRANSFERRED = "card.transferred"
    CARD_PRICE_UPDATED = "card.price_updated"
    
    # Trade Events
    TRADE_INITIATED = "trade.initiated"
    TRADE_OFFER_MADE = "trade.offer_made"
    TRADE_OFFER_COUNTERED = "trade.offer_countered"
    TRADE_ACCEPTED = "trade.accepted"
    TRADE_REJECTED = "trade.rejected"
    TRADE_CANCELLED = "trade.cancelled"
    TRADE_ESCROW_LOCKED = "trade.escrow_locked"
    TRADE_COMPLETED = "trade.completed"
    TRADE_DISPUTED = "trade.disputed"
    
    # Razz Events
    RAZZ_CREATED = "razz.created"
    RAZZ_SPOT_PURCHASED = "razz.spot_purchased"
    RAZZ_FILLED = "razz.filled"
    RAZZ_DRAWING = "razz.drawing"
    RAZZ_COMPLETED = "razz.completed"
    RAZZ_CANCELLED = "razz.cancelled"
    RAZZ_REFUNDED = "razz.refunded"
    
    # Wallet Events
    WALLET_CREATED = "wallet.created"
    WALLET_DEPOSIT_INITIATED = "wallet.deposit_initiated"
    WALLET_DEPOSIT_COMPLETED = "wallet.deposit_completed"
    WALLET_WITHDRAWAL_INITIATED = "wallet.withdrawal_initiated"
    WALLET_WITHDRAWAL_COMPLETED = "wallet.withdrawal_completed"
    WALLET_TRANSFER = "wallet.transfer"
    WALLET_ESCROW_HOLD = "wallet.escrow_hold"
    WALLET_ESCROW_RELEASE = "wallet.escrow_release"
    WALLET_FEE_COLLECTED = "wallet.fee_collected"
    
    # Admin Events
    ADMIN_ACTION = "admin.action"
    PLATFORM_FEE_UPDATED = "platform.fee_updated"
    USER_FLAGGED = "admin.user_flagged"


class Event(BaseModel):
    """Base immutable event model - append-only log entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    aggregate_type: str  # user, card, trade, razz, wallet
    aggregate_id: str    # ID of the entity this event relates to
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1     # For optimistic concurrency
    actor_id: Optional[str] = None  # Who triggered this event
    payload: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}  # IP, user agent, etc.
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EventStore(BaseModel):
    """Configuration for event store collections"""
    events_collection: str = "events"
    snapshots_collection: str = "snapshots"
    
    # Retention policy
    snapshot_frequency: int = 100  # Create snapshot every N events per aggregate


# Event creation helpers
def create_event(
    event_type: EventType,
    aggregate_type: str,
    aggregate_id: str,
    payload: Dict[str, Any],
    actor_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Event:
    """Factory function to create properly formatted events"""
    return Event(
        event_type=event_type,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        payload=payload,
        actor_id=actor_id,
        metadata=metadata or {}
    )
