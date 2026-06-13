"""
Slabby Wallet Model
Project Marvel - Banking & Payment Schema
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRADE_PAYMENT = "trade_payment"
    TRADE_RECEIPT = "trade_receipt"
    RAZZ_PURCHASE = "razz_purchase"
    RAZZ_PAYOUT = "razz_payout"
    RAZZ_REFUND = "razz_refund"
    ESCROW_HOLD = "escrow_hold"
    ESCROW_RELEASE = "escrow_release"
    PLATFORM_FEE = "platform_fee"
    ADJUSTMENT = "adjustment"  # Admin adjustments


class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class WalletTransaction(BaseModel):
    """Individual wallet transaction"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_id: str
    user_id: str
    
    # Transaction details
    type: TransactionType
    amount: float                   # Positive = credit, Negative = debit
    currency: str = "USD"
    
    # Balance tracking
    balance_before: float
    balance_after: float
    
    # Related entities
    related_trade_id: Optional[str] = None
    related_razz_id: Optional[str] = None
    related_escrow_id: Optional[str] = None
    
    # Stripe references
    stripe_payment_intent: Optional[str] = None
    stripe_transfer_id: Optional[str] = None
    stripe_payout_id: Optional[str] = None
    
    # Status
    status: TransactionStatus = TransactionStatus.PENDING
    
    # Metadata
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    version: int = 1


class Wallet(BaseModel):
    """User wallet for cash balance management"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Balances
    available_balance: float = 0.0   # Can be withdrawn/used
    pending_balance: float = 0.0     # Incoming funds not yet cleared
    escrow_balance: float = 0.0      # Locked in active trades/razz
    
    # Lifetime stats
    total_deposited: float = 0.0
    total_withdrawn: float = 0.0
    total_fees_paid: float = 0.0
    
    # Stripe Connect
    stripe_customer_id: Optional[str] = None
    stripe_connect_account_id: Optional[str] = None
    stripe_default_payment_method: Optional[str] = None
    
    # Withdrawal settings
    auto_withdraw: bool = False
    auto_withdraw_threshold: float = 100.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Event sourcing
    version: int = 1


class WalletDeposit(BaseModel):
    """Deposit request"""
    amount: float
    payment_method_id: Optional[str] = None  # Stripe payment method


class WalletWithdrawal(BaseModel):
    """Withdrawal request"""
    amount: float
    # Withdrawal goes to Stripe Connect account


class WalletResponse(BaseModel):
    """Public wallet response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    available_balance: float
    pending_balance: float
    escrow_balance: float
    total_balance: float  # Computed
    stripe_connect_onboarded: bool
    created_at: datetime


class TransactionResponse(BaseModel):
    """Public transaction response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    type: TransactionType
    amount: float
    currency: str
    balance_after: float
    status: TransactionStatus
    description: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


# Platform fee configuration
class PlatformFees(BaseModel):
    """Platform fee structure"""
    trade_fee_pct: float = 3.0      # 3% on trades
    razz_fee_pct: float = 5.0       # 5% on razz
    withdrawal_fee_flat: float = 0.0  # Flat withdrawal fee
    minimum_withdrawal: float = 10.0
    maximum_withdrawal: float = 10000.0
