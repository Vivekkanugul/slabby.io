"""
Slabby Razz Service
Project Marvel - Provably Fair Raffle Engine
"""

from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import hashlib
import secrets
import logging

from models.razz import (
    Razz, RazzCreate, RazzSpotPurchase, RazzResponse, RazzVerification,
    RazzStatus, RazzSpot, RazzProof
)
from models.events import EventType, create_event
from services.event_store import EventStoreService

logger = logging.getLogger(__name__)

# Platform fees
RAZZ_FEE_PCT = 5.0  # 5% platform fee


class RazzService:
    """Provably fair raffle engine"""
    
    def __init__(self, db: AsyncIOMotorDatabase, event_store: EventStoreService):
        self.db = db
        self.razzes = db.razzes
        self.event_store = event_store
    
    def _razz_to_response(self, razz: dict, include_proof: bool = False) -> RazzResponse:
        proof = None
        if include_proof and razz.get("proof"):
            proof = RazzProof(**razz["proof"])
        
        return RazzResponse(
            id=razz["id"],
            host_id=razz["host_id"],
            card_id=razz["card_id"],
            title=razz["title"],
            description=razz.get("description"),
            total_spots=razz["total_spots"],
            spot_price=razz["spot_price"],
            spots_sold=razz.get("spots_sold", 0),
            max_spots_per_user=razz.get("max_spots_per_user", 0),
            status=RazzStatus(razz["status"]),
            server_seed_hash=razz.get("server_seed_hash"),
            winner_id=razz.get("winner_id"),
            winning_spot=razz.get("winning_spot"),
            proof=proof,
            created_at=razz.get("created_at", datetime.now(timezone.utc)),
            published_at=razz.get("published_at"),
            filled_at=razz.get("filled_at"),
            drawn_at=razz.get("drawn_at")
        )
    
    async def create(self, host_id: str, data: RazzCreate) -> RazzResponse:
        """Create a new razz"""
        razz_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Generate server seed and hash (hash is public, seed is secret until draw)
        server_seed = secrets.token_hex(32)
        server_seed_hash = hashlib.sha256(server_seed.encode()).hexdigest()
        
        # Initialize spots
        spots = []
        for i in range(1, data.total_spots + 1):
            spots.append({
                "spot_number": i,
                "user_id": None,
                "purchased_at": None,
                "payment_intent_id": None,
                "refunded": False
            })
        
        # Calculate financials
        total_pot = data.total_spots * data.spot_price
        platform_fee = round(total_pot * (RAZZ_FEE_PCT / 100), 2)
        host_payout = total_pot - platform_fee
        
        razz_doc = {
            "id": razz_id,
            "host_id": host_id,
            "card_id": data.card_id,
            "title": data.title,
            "description": data.description,
            "total_spots": data.total_spots,
            "spot_price": data.spot_price,
            "max_spots_per_user": data.max_spots_per_user,
            "spots": spots,
            "spots_sold": 0,
            "total_pot": total_pot,
            "platform_fee_pct": RAZZ_FEE_PCT,
            "platform_fee": platform_fee,
            "host_payout": host_payout,
            "status": RazzStatus.DRAFT.value,
            "server_seed": server_seed,
            "server_seed_hash": server_seed_hash,
            "client_seed": None,
            "proof": None,
            "winner_id": None,
            "winning_spot": None,
            "created_at": now.isoformat(),
            "published_at": None,
            "filled_at": None,
            "drawn_at": None,
            "completed_at": None,
            "scheduled_draw_at": data.scheduled_draw_at.isoformat() if data.scheduled_draw_at else None,
            "expires_at": data.expires_at.isoformat() if data.expires_at else None,
            "version": 1
        }
        
        await self.razzes.insert_one(razz_doc)
        
        # Record event
        event = create_event(
            EventType.RAZZ_CREATED,
            "razz",
            razz_id,
            {
                "card_id": data.card_id,
                "total_spots": data.total_spots,
                "spot_price": data.spot_price,
                "total_pot": total_pot
            },
            actor_id=host_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Razz created: {razz_id} by {host_id}")
        
        return self._razz_to_response(razz_doc)
    
    async def get_by_id(self, razz_id: str) -> Optional[dict]:
        """Get razz by ID"""
        return await self.razzes.find_one({"id": razz_id}, {"_id": 0})
    
    async def publish(self, razz_id: str, host_id: str) -> Optional[RazzResponse]:
        """Publish razz to make it active"""
        razz = await self.razzes.find_one({"id": razz_id, "host_id": host_id})
        if not razz:
            return None
        
        if razz["status"] != RazzStatus.DRAFT.value:
            raise ValueError("Razz is not in draft status")
        
        now = datetime.now(timezone.utc)
        
        await self.razzes.update_one(
            {"id": razz_id},
            {
                "$set": {
                    "status": RazzStatus.ACTIVE.value,
                    "published_at": now.isoformat()
                }
            }
        )
        
        updated = await self.razzes.find_one({"id": razz_id}, {"_id": 0})
        return self._razz_to_response(updated)
    
    async def purchase_spots(self, razz_id: str, user_id: str, spot_numbers: List[int]) -> Optional[RazzResponse]:
        """Purchase spots in a razz"""
        razz = await self.razzes.find_one({"id": razz_id})
        if not razz:
            return None
        
        if razz["status"] != RazzStatus.ACTIVE.value:
            raise ValueError("Razz is not active")
        
        # Check max spots per user
        if razz["max_spots_per_user"] > 0:
            user_spots = sum(1 for s in razz["spots"] if s.get("user_id") == user_id)
            if user_spots + len(spot_numbers) > razz["max_spots_per_user"]:
                raise ValueError(f"Maximum {razz['max_spots_per_user']} spots per user")
        
        # Verify spots are available
        for spot_num in spot_numbers:
            spot = next((s for s in razz["spots"] if s["spot_number"] == spot_num), None)
            if not spot:
                raise ValueError(f"Invalid spot number: {spot_num}")
            if spot.get("user_id"):
                raise ValueError(f"Spot {spot_num} is already taken")
        
        now = datetime.now(timezone.utc)
        
        # Update spots
        for spot in razz["spots"]:
            if spot["spot_number"] in spot_numbers:
                spot["user_id"] = user_id
                spot["purchased_at"] = now.isoformat()
        
        new_spots_sold = razz["spots_sold"] + len(spot_numbers)
        is_filled = new_spots_sold >= razz["total_spots"]
        
        update_data = {
            "spots": razz["spots"],
            "spots_sold": new_spots_sold
        }
        
        if is_filled:
            update_data["status"] = RazzStatus.FILLED.value
            update_data["filled_at"] = now.isoformat()
        
        await self.razzes.update_one({"id": razz_id}, {"$set": update_data})
        
        # Record event
        event = create_event(
            EventType.RAZZ_SPOT_PURCHASED,
            "razz",
            razz_id,
            {
                "spot_numbers": spot_numbers,
                "spots_sold": new_spots_sold,
                "is_filled": is_filled
            },
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        if is_filled:
            filled_event = create_event(
                EventType.RAZZ_FILLED,
                "razz",
                razz_id,
                {"total_spots": razz["total_spots"]},
                actor_id="system"
            )
            await self.event_store.append(filled_event)
        
        logger.info(f"Spots {spot_numbers} purchased in razz {razz_id} by {user_id}")
        
        updated = await self.razzes.find_one({"id": razz_id}, {"_id": 0})
        return self._razz_to_response(updated)
    
    async def draw_winner(self, razz_id: str, client_seed: Optional[str] = None) -> Optional[RazzResponse]:
        """
        Execute provably fair draw.
        
        Winner = SHA256(server_seed + client_seed) mod total_spots
        """
        razz = await self.razzes.find_one({"id": razz_id})
        if not razz:
            return None
        
        if razz["status"] != RazzStatus.FILLED.value:
            raise ValueError("Razz must be filled before drawing")
        
        now = datetime.now(timezone.utc)
        
        # Use provided client seed or generate one
        if not client_seed:
            client_seed = secrets.token_hex(16) + str(int(now.timestamp()))
        
        # Calculate winner using provably fair algorithm
        server_seed = razz["server_seed"]
        combined = f"{server_seed}{client_seed}"
        combined_hash = hashlib.sha256(combined.encode()).hexdigest()
        
        # Convert first 16 hex chars to int, mod by total spots
        winning_number = int(combined_hash[:16], 16) % razz["total_spots"]
        winning_spot = winning_number + 1  # 1-indexed
        
        # Find winner
        winner_spot = next((s for s in razz["spots"] if s["spot_number"] == winning_spot), None)
        winner_id = winner_spot["user_id"] if winner_spot else None
        
        # Create proof
        proof = {
            "server_seed": server_seed,
            "server_seed_hash": razz["server_seed_hash"],
            "client_seed": client_seed,
            "combined_hash": combined_hash,
            "winning_number": winning_number,
            "calculation_method": "sha256_mod",
            "generated_at": now.isoformat()
        }
        
        await self.razzes.update_one(
            {"id": razz_id},
            {
                "$set": {
                    "status": RazzStatus.COMPLETED.value,
                    "client_seed": client_seed,
                    "proof": proof,
                    "winner_id": winner_id,
                    "winning_spot": winning_spot,
                    "drawn_at": now.isoformat(),
                    "completed_at": now.isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.RAZZ_COMPLETED,
            "razz",
            razz_id,
            {
                "winner_id": winner_id,
                "winning_spot": winning_spot,
                "proof_hash": combined_hash[:16]
            },
            actor_id="system"
        )
        await self.event_store.append(event)
        
        logger.info(f"Razz {razz_id} completed. Winner: {winner_id} (spot {winning_spot})")
        
        updated = await self.razzes.find_one({"id": razz_id}, {"_id": 0})
        return self._razz_to_response(updated, include_proof=True)
    
    async def verify_fairness(self, razz_id: str) -> RazzVerification:
        """
        Verify the fairness of a completed razz.
        Anyone can verify using the public proof.
        """
        razz = await self.razzes.find_one({"id": razz_id})
        if not razz:
            raise ValueError("Razz not found")
        
        if razz["status"] != RazzStatus.COMPLETED.value:
            raise ValueError("Razz is not completed")
        
        proof = razz.get("proof")
        if not proof:
            raise ValueError("No proof available")
        
        # Re-calculate using public data
        combined = f"{proof['server_seed']}{proof['client_seed']}"
        calculated_hash = hashlib.sha256(combined.encode()).hexdigest()
        calculated_winner = int(calculated_hash[:16], 16) % razz["total_spots"] + 1
        
        # Verify hash matches published hash
        seed_hash_valid = hashlib.sha256(proof["server_seed"].encode()).hexdigest() == proof["server_seed_hash"]
        winner_valid = calculated_winner == razz["winning_spot"]
        
        is_valid = seed_hash_valid and winner_valid
        
        return RazzVerification(
            razz_id=razz_id,
            is_valid=is_valid,
            server_seed=proof["server_seed"],
            server_seed_hash=proof["server_seed_hash"],
            client_seed=proof["client_seed"],
            combined_hash=calculated_hash,
            calculated_winner=calculated_winner,
            actual_winner=razz["winning_spot"],
            verification_passed=is_valid,
            message="Verification successful - draw was fair" if is_valid else "Verification failed - potential tampering detected"
        )
    
    async def get_active_razzes(self, category: Optional[str] = None, limit: int = 50) -> List[RazzResponse]:
        """Get active razzes"""
        query = {"status": RazzStatus.ACTIVE.value}
        
        cursor = self.razzes.find(query, {"_id": 0, "server_seed": 0}).sort("published_at", -1).limit(limit)
        razzes = await cursor.to_list(length=limit)
        
        return [self._razz_to_response(r) for r in razzes]
    
    async def get_user_razzes(self, user_id: str, as_host: bool = True) -> List[RazzResponse]:
        """Get razzes for a user (as host or participant)"""
        if as_host:
            query = {"host_id": user_id}
        else:
            query = {"spots.user_id": user_id}
        
        cursor = self.razzes.find(query, {"_id": 0, "server_seed": 0}).sort("created_at", -1)
        razzes = await cursor.to_list(length=100)
        
        return [self._razz_to_response(r, include_proof=(r["status"] == RazzStatus.COMPLETED.value)) for r in razzes]
    
    async def cancel(self, razz_id: str, host_id: str) -> Optional[RazzResponse]:
        """Cancel razz (only if not filled)"""
        razz = await self.razzes.find_one({"id": razz_id, "host_id": host_id})
        if not razz:
            return None
        
        if razz["status"] not in [RazzStatus.DRAFT.value, RazzStatus.ACTIVE.value]:
            raise ValueError("Cannot cancel razz in current state")
        
        now = datetime.now(timezone.utc)
        
        # Mark for refunds if spots were sold
        new_status = RazzStatus.REFUNDING.value if razz["spots_sold"] > 0 else RazzStatus.CANCELLED.value
        
        await self.razzes.update_one(
            {"id": razz_id},
            {"$set": {"status": new_status}}
        )
        
        # Record event
        event = create_event(
            EventType.RAZZ_CANCELLED,
            "razz",
            razz_id,
            {"spots_sold": razz["spots_sold"], "requires_refund": razz["spots_sold"] > 0},
            actor_id=host_id
        )
        await self.event_store.append(event)
        
        updated = await self.razzes.find_one({"id": razz_id}, {"_id": 0})
        return self._razz_to_response(updated)
    
    async def get_active_count(self) -> int:
        """Get count of active razzes"""
        return await self.razzes.count_documents({"status": RazzStatus.ACTIVE.value})
