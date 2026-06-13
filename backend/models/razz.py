"""
Slabby Razz Model
Project Marvel - Provably Fair Raffle System
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid
import hashlib
import secrets


class RazzStatus(str, Enum):
    DRAFT = "draft"           # Not yet published
    ACTIVE = "active"         # Open for spot purchases
    FILLED = "filled"         # All spots sold, pending draw
    DRAWING = "drawing"       # Draw in progress
    COMPLETED = "completed"   # Winner selected, card transferred
    CANCELLED = "cancelled"   # Cancelled, refunds issued
    REFUNDING = "refunding"   # Refund in progress


class RazzSpot(BaseModel):
    """Individual spot in a razz"""
    spot_number: int
    user_id: Optional[str] = None
    purchased_at: Optional[datetime] = None
    payment_intent_id: Optional[str] = None
    refunded: bool = False


class RazzProof(BaseModel):
    """Cryptographic proof for provably fair draw"""
    # Server seed (revealed after draw)
    server_seed: str
    server_seed_hash: str  # Published before razz starts
    
    # Client seed (from final participant or block hash)
    client_seed: str
    
    # Combined hash used for winner selection
    combined_hash: str
    
    # Winner calculation
    winning_number: int
    calculation_method: str = "sha256_mod"
    
    # Verification timestamp
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Razz(BaseModel):
    """Core Razz (raffle) model - Provably fair card raffle"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Host
    host_id: str
    
    # Card being razzed
    card_id: str
    
    # Razz configuration
    title: str
    description: Optional[str] = None
    total_spots: int
    spot_price: float               # Price per spot in USD
    max_spots_per_user: int = 0     # 0 = unlimited
    
    # Spots
    spots: List[RazzSpot] = []
    spots_sold: int = 0
    
    # Financials
    total_pot: float = 0.0          # Total collected
    platform_fee_pct: float = 5.0   # Slabby's cut (%)
    platform_fee: float = 0.0       # Calculated fee
    host_payout: float = 0.0        # Host receives this
    
    # Status
    status: RazzStatus = RazzStatus.DRAFT
    
    # Provably fair cryptography
    server_seed: Optional[str] = None       # Hidden until draw
    server_seed_hash: Optional[str] = None  # Published at start
    client_seed: Optional[str] = None       # Set at draw time
    proof: Optional[RazzProof] = None       # Full proof after completion
    
    # Winner
    winner_id: Optional[str] = None
    winning_spot: Optional[int] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    drawn_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Scheduling
    scheduled_draw_at: Optional[datetime] = None  # Auto-draw time if filled
    expires_at: Optional[datetime] = None         # Auto-cancel if not filled
    
    # Event sourcing
    version: int = 1
    
    def generate_server_seed(self) -> str:
        """Generate cryptographically secure server seed"""
        self.server_seed = secrets.token_hex(32)
        self.server_seed_hash = hashlib.sha256(self.server_seed.encode()).hexdigest()
        return self.server_seed_hash
    
    def calculate_winner(self, client_seed: str) -> int:
        """
        Provably fair winner calculation.
        Winner = SHA256(server_seed + client_seed) mod total_spots
        """
        if not self.server_seed:
            raise ValueError("Server seed not set")
        
        self.client_seed = client_seed
        combined = f"{self.server_seed}{client_seed}"
        combined_hash = hashlib.sha256(combined.encode()).hexdigest()
        
        # Convert first 8 bytes of hash to integer, mod by total spots
        winning_number = int(combined_hash[:16], 16) % self.total_spots
        
        # Create proof
        self.proof = RazzProof(
            server_seed=self.server_seed,
            server_seed_hash=self.server_seed_hash,
            client_seed=client_seed,
            combined_hash=combined_hash,
            winning_number=winning_number,
            calculation_method="sha256_mod"
        )
        
        self.winning_spot = winning_number + 1  # 1-indexed
        
        # Find winner user_id
        for spot in self.spots:
            if spot.spot_number == self.winning_spot:
                self.winner_id = spot.user_id
                break
        
        return self.winning_spot


class RazzCreate(BaseModel):
    """Create razz request"""
    card_id: str
    title: str
    description: Optional[str] = None
    total_spots: int
    spot_price: float
    max_spots_per_user: int = 0
    scheduled_draw_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class RazzSpotPurchase(BaseModel):
    """Purchase razz spot request"""
    spot_numbers: List[int]  # Can buy multiple spots


class RazzResponse(BaseModel):
    """Public razz response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    host_id: str
    card_id: str
    title: str
    description: Optional[str]
    total_spots: int
    spot_price: float
    spots_sold: int
    max_spots_per_user: int
    status: RazzStatus
    server_seed_hash: Optional[str]  # Published for verification
    winner_id: Optional[str]
    winning_spot: Optional[int]
    proof: Optional[RazzProof]  # Only after completion
    created_at: datetime
    published_at: Optional[datetime]
    filled_at: Optional[datetime]
    drawn_at: Optional[datetime]


class RazzVerification(BaseModel):
    """Response for razz fairness verification"""
    razz_id: str
    is_valid: bool
    server_seed: str
    server_seed_hash: str
    client_seed: str
    combined_hash: str
    calculated_winner: int
    actual_winner: int
    verification_passed: bool
    message: str
