"""
Slabby Trade Model
Project Marvel - P2P Trade & Escrow Schema
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class TradeStatus(str, Enum):
    PENDING = "pending"           # Offer made, awaiting response
    COUNTERED = "countered"       # Counter-offer made
    ACCEPTED = "accepted"         # Both parties agreed
    ESCROW_PENDING = "escrow_pending"  # Awaiting escrow lock
    IN_ESCROW = "in_escrow"       # Assets locked
    SHIPPING = "shipping"         # Physical cards in transit
    COMPLETED = "completed"       # Trade finalized
    REJECTED = "rejected"         # Offer declined
    CANCELLED = "cancelled"       # Cancelled by either party
    EXPIRED = "expired"           # Offer timed out
    DISPUTED = "disputed"         # Under admin review


class TradeType(str, Enum):
    CARD_FOR_CARD = "card_for_card"
    CARD_FOR_CASH = "card_for_cash"
    CARD_FOR_MIXED = "card_for_mixed"  # Cards + Cash


class TradeSide(BaseModel):
    """One side of a trade (initiator or receiver)"""
    user_id: str
    card_ids: List[str] = []        # Cards being offered
    cash_amount: float = 0.0        # Cash being offered (USD)
    confirmed: bool = False         # User confirmed their side
    shipped: bool = False           # Physical cards shipped
    tracking_number: Optional[str] = None
    shipped_at: Optional[datetime] = None
    received: bool = False          # Other party confirmed receipt
    received_at: Optional[datetime] = None


class TradeOffer(BaseModel):
    """A single offer/counter in the negotiation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offered_by: str                 # user_id
    initiator_side: TradeSide
    receiver_side: TradeSide
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


class Trade(BaseModel):
    """Core trade model - P2P asset exchange"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Participants
    initiator_id: str               # Who started the trade
    receiver_id: str                # Who received the offer
    
    # Trade type
    trade_type: TradeType = TradeType.CARD_FOR_CARD
    
    # Current agreed terms (updated on accept)
    initiator_side: TradeSide
    receiver_side: TradeSide
    
    # Negotiation history
    offers: List[TradeOffer] = []
    current_offer_id: Optional[str] = None
    
    # Status
    status: TradeStatus = TradeStatus.PENDING
    
    # Escrow
    escrow_id: Optional[str] = None
    escrow_locked_at: Optional[datetime] = None
    
    # Fees (calculated at acceptance)
    platform_fee: float = 0.0       # Fee collected by Slabby
    fee_paid_by: str = "split"      # initiator, receiver, split
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Dispute handling
    dispute_reason: Optional[str] = None
    dispute_opened_at: Optional[datetime] = None
    dispute_resolved_at: Optional[datetime] = None
    dispute_resolution: Optional[str] = None
    
    # Event sourcing
    version: int = 1


class TradeCreate(BaseModel):
    """Create trade offer request"""
    receiver_id: str
    receiver_card_ids: List[str]    # Cards you want from them
    offered_card_ids: List[str] = []  # Cards you're offering
    offered_cash: float = 0.0       # Cash you're offering
    requested_cash: float = 0.0     # Cash you're requesting
    message: Optional[str] = None
    expires_hours: int = 48         # Offer expiration


class TradeCounter(BaseModel):
    """Counter-offer request"""
    offered_card_ids: List[str] = []
    offered_cash: float = 0.0
    requested_card_ids: List[str] = []
    requested_cash: float = 0.0
    message: Optional[str] = None


class TradeResponse(BaseModel):
    """Public trade response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    initiator_id: str
    receiver_id: str
    trade_type: TradeType
    initiator_side: TradeSide
    receiver_side: TradeSide
    status: TradeStatus
    platform_fee: float
    created_at: datetime
    expires_at: Optional[datetime]
    accepted_at: Optional[datetime]
    completed_at: Optional[datetime]


class Escrow(BaseModel):
    """Escrow record for trade settlement"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_id: str
    
    # Locked assets
    initiator_cards_locked: List[str] = []
    initiator_cash_locked: float = 0.0
    receiver_cards_locked: List[str] = []
    receiver_cash_locked: float = 0.0
    
    # Stripe payment intents
    initiator_payment_intent: Optional[str] = None
    receiver_payment_intent: Optional[str] = None
    
    # Status
    status: str = "pending"  # pending, locked, releasing, released, refunded
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    locked_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    
    version: int = 1
