"""
Slabby Card Model
Project Marvel - Card/Asset Schema
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class CardCondition(str, Enum):
    RAW = "raw"
    PSA_1 = "psa_1"
    PSA_2 = "psa_2"
    PSA_3 = "psa_3"
    PSA_4 = "psa_4"
    PSA_5 = "psa_5"
    PSA_6 = "psa_6"
    PSA_7 = "psa_7"
    PSA_8 = "psa_8"
    PSA_9 = "psa_9"
    PSA_10 = "psa_10"
    BGS_9 = "bgs_9"
    BGS_9_5 = "bgs_9_5"
    BGS_10 = "bgs_10"
    CGC_9 = "cgc_9"
    CGC_9_5 = "cgc_9_5"
    CGC_10 = "cgc_10"


class CardStatus(str, Enum):
    DRAFT = "draft"           # Not yet listed
    AVAILABLE = "available"   # Listed and available
    IN_TRADE = "in_trade"     # Locked in active trade
    IN_RAZZ = "in_razz"       # Locked in active razz
    IN_ESCROW = "in_escrow"   # Pending settlement
    SOLD = "sold"             # Transferred to new owner
    UNLISTED = "unlisted"     # Removed from marketplace


class CardCategory(str, Enum):
    BASKETBALL = "basketball"
    BASEBALL = "baseball"
    FOOTBALL = "football"
    HOCKEY = "hockey"
    SOCCER = "soccer"
    POKEMON = "pokemon"
    OTHER = "other"


class CardImage(BaseModel):
    """Card image with front/back"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    thumbnail_url: Optional[str] = None
    is_front: bool = True
    order: int = 0


class CardCertification(BaseModel):
    """Grading certification details"""
    grader: str  # PSA, BGS, CGC
    grade: str
    cert_number: Optional[str] = None
    subgrades: Optional[Dict[str, float]] = None  # BGS subgrades


class Card(BaseModel):
    """Core card/asset model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    
    # Card Identity
    title: str                          # Display title
    player_name: Optional[str] = None
    team: Optional[str] = None
    year: Optional[int] = None
    set_name: Optional[str] = None
    card_number: Optional[str] = None
    parallel: Optional[str] = None      # Base, Prizm, Refractor, etc.
    
    # Category & Condition
    category: CardCategory = CardCategory.BASKETBALL
    condition: CardCondition = CardCondition.RAW
    certification: Optional[CardCertification] = None
    
    # Media
    images: List[CardImage] = []
    
    # Pricing
    asking_price: Optional[float] = None   # Listed price in USD
    floor_price: Optional[float] = None    # Minimum acceptable (for trades)
    estimated_value: Optional[float] = None
    
    # Status
    status: CardStatus = CardStatus.DRAFT
    
    # Marketplace flags
    accept_trades: bool = True
    accept_cash: bool = True
    accept_partial: bool = True  # Cash + cards combo
    
    # Provenance (ownership history)
    provenance: List[Dict[str, Any]] = []  # [{owner_id, acquired_at, method}]
    
    # External references
    cardsight_id: Optional[str] = None
    ebay_item_id: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    listed_at: Optional[datetime] = None
    
    # Event sourcing
    version: int = 1


class CardCreate(BaseModel):
    """Card listing request"""
    title: str
    player_name: Optional[str] = None
    team: Optional[str] = None
    year: Optional[int] = None
    set_name: Optional[str] = None
    card_number: Optional[str] = None
    parallel: Optional[str] = None
    category: CardCategory = CardCategory.BASKETBALL
    condition: CardCondition = CardCondition.RAW
    asking_price: Optional[float] = None
    floor_price: Optional[float] = None
    accept_trades: bool = True
    accept_cash: bool = True
    accept_partial: bool = True
    images: List[str] = []  # URLs


class CardUpdate(BaseModel):
    """Card update request"""
    title: Optional[str] = None
    asking_price: Optional[float] = None
    floor_price: Optional[float] = None
    accept_trades: Optional[bool] = None
    accept_cash: Optional[bool] = None
    accept_partial: Optional[bool] = None
    status: Optional[CardStatus] = None


class CardResponse(BaseModel):
    """Public card response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    owner_id: str
    title: str
    player_name: Optional[str]
    team: Optional[str]
    year: Optional[int]
    set_name: Optional[str]
    category: CardCategory
    condition: CardCondition
    certification: Optional[CardCertification]
    images: List[CardImage]
    asking_price: Optional[float]
    estimated_value: Optional[float]
    status: CardStatus
    accept_trades: bool
    accept_cash: bool
    accept_partial: bool
    created_at: datetime
    listed_at: Optional[datetime]
