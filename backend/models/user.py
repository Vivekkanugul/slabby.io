"""
Slabby User Model
Project Marvel - User & Authentication Schema
"""

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    USER = "user"
    SELLER = "seller"       # Verified seller status
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class UserStatus(str, Enum):
    PENDING = "pending"      # Email not verified
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"


class VerificationLevel(str, Enum):
    NONE = "none"
    EMAIL = "email"
    PHONE = "phone"
    IDENTITY = "identity"    # Full KYC verified


class UserAddress(BaseModel):
    """Shipping address for trades"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = "Home"  # Home, Work, etc.
    full_name: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "US"
    phone: Optional[str] = None
    is_default: bool = False


class UserProfile(BaseModel):
    """Public profile information"""
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    social_links: Dict[str, str] = {}  # twitter, instagram, etc.
    

class UserStats(BaseModel):
    """Aggregated user statistics"""
    total_trades: int = 0
    successful_trades: int = 0
    cancelled_trades: int = 0
    total_razz_hosted: int = 0
    total_razz_participated: int = 0
    razz_wins: int = 0
    total_volume_usd: float = 0.0
    rating: float = 5.0
    rating_count: int = 0
    member_since: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class User(BaseModel):
    """Core user model - derived from event stream"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    
    # Profile
    profile: UserProfile
    
    # Status & Roles
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.PENDING
    verification_level: VerificationLevel = VerificationLevel.NONE
    
    # Stripe Connect
    stripe_customer_id: Optional[str] = None
    stripe_connect_id: Optional[str] = None  # For payouts
    stripe_connect_onboarded: bool = False
    
    # Addresses
    addresses: List[UserAddress] = []
    
    # Stats (denormalized for performance)
    stats: UserStats = Field(default_factory=UserStats)
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None
    
    # Event sourcing
    version: int = 1  # Incremented with each event


class UserCreate(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str
    display_name: str


class UserLogin(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user response (excludes sensitive data)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    profile: UserProfile
    role: UserRole
    status: UserStatus
    verification_level: VerificationLevel
    stats: UserStats
    stripe_connect_onboarded: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
