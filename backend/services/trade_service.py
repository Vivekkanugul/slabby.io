"""
Slabby Trade Service
Project Marvel - P2P Trade Engine
"""

from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

from models.trade import (
    Trade, TradeCreate, TradeCounter, TradeResponse,
    TradeStatus, TradeType, TradeSide, TradeOffer, Escrow
)
from models.events import EventType, create_event
from services.event_store import EventStoreService

logger = logging.getLogger(__name__)

# Platform fees
TRADE_FEE_PCT = 3.0  # 3% platform fee


class TradeService:
    """P2P Trade engine with escrow support"""
    
    def __init__(self, db: AsyncIOMotorDatabase, event_store: EventStoreService):
        self.db = db
        self.trades = db.trades
        self.escrows = db.escrows
        self.event_store = event_store
    
    def _calculate_trade_type(self, initiator_cards: List, initiator_cash: float, receiver_cash: float) -> TradeType:
        has_cards = len(initiator_cards) > 0
        has_cash = initiator_cash > 0 or receiver_cash > 0
        
        if has_cards and has_cash:
            return TradeType.CARD_FOR_MIXED
        elif has_cash and not has_cards:
            return TradeType.CARD_FOR_CASH
        else:
            return TradeType.CARD_FOR_CARD
    
    def _calculate_fee(self, total_value: float) -> float:
        return round(total_value * (TRADE_FEE_PCT / 100), 2)
    
    def _trade_to_response(self, trade: dict) -> TradeResponse:
        return TradeResponse(
            id=trade["id"],
            initiator_id=trade["initiator_id"],
            receiver_id=trade["receiver_id"],
            trade_type=TradeType(trade["trade_type"]),
            initiator_side=TradeSide(**trade["initiator_side"]),
            receiver_side=TradeSide(**trade["receiver_side"]),
            status=TradeStatus(trade["status"]),
            platform_fee=trade.get("platform_fee", 0),
            created_at=trade.get("created_at", datetime.now(timezone.utc)),
            expires_at=trade.get("expires_at"),
            accepted_at=trade.get("accepted_at"),
            completed_at=trade.get("completed_at")
        )
    
    async def create(self, initiator_id: str, data: TradeCreate) -> TradeResponse:
        """Create a new trade offer"""
        trade_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=data.expires_hours)
        
        # Determine trade type
        trade_type = self._calculate_trade_type(
            data.offered_card_ids,
            data.offered_cash,
            data.requested_cash
        )
        
        # Calculate total value for fee
        total_cash = data.offered_cash + data.requested_cash
        
        initiator_side = {
            "user_id": initiator_id,
            "card_ids": data.offered_card_ids,
            "cash_amount": data.offered_cash,
            "confirmed": False,
            "shipped": False,
            "tracking_number": None,
            "shipped_at": None,
            "received": False,
            "received_at": None
        }
        
        receiver_side = {
            "user_id": data.receiver_id,
            "card_ids": data.receiver_card_ids,
            "cash_amount": data.requested_cash,
            "confirmed": False,
            "shipped": False,
            "tracking_number": None,
            "shipped_at": None,
            "received": False,
            "received_at": None
        }
        
        # Create initial offer
        initial_offer = {
            "id": str(uuid.uuid4()),
            "offered_by": initiator_id,
            "initiator_side": initiator_side,
            "receiver_side": receiver_side,
            "message": data.message,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat()
        }
        
        trade_doc = {
            "id": trade_id,
            "initiator_id": initiator_id,
            "receiver_id": data.receiver_id,
            "trade_type": trade_type.value,
            "initiator_side": initiator_side,
            "receiver_side": receiver_side,
            "offers": [initial_offer],
            "current_offer_id": initial_offer["id"],
            "status": TradeStatus.PENDING.value,
            "escrow_id": None,
            "escrow_locked_at": None,
            "platform_fee": self._calculate_fee(total_cash),
            "fee_paid_by": "split",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "accepted_at": None,
            "completed_at": None,
            "expires_at": expires_at.isoformat(),
            "dispute_reason": None,
            "dispute_opened_at": None,
            "dispute_resolved_at": None,
            "dispute_resolution": None,
            "version": 1
        }
        
        await self.trades.insert_one(trade_doc)
        
        # Record event
        event = create_event(
            EventType.TRADE_INITIATED,
            "trade",
            trade_id,
            {
                "receiver_id": data.receiver_id,
                "trade_type": trade_type.value,
                "cards_offered": len(data.offered_card_ids),
                "cash_offered": data.offered_cash
            },
            actor_id=initiator_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Trade created: {trade_id} by {initiator_id}")
        
        return self._trade_to_response(trade_doc)
    
    async def get_by_id(self, trade_id: str) -> Optional[dict]:
        """Get trade by ID"""
        return await self.trades.find_one({"id": trade_id}, {"_id": 0})
    
    async def get_user_trades(
        self,
        user_id: str,
        status: Optional[TradeStatus] = None,
        role: Optional[str] = None  # 'initiator', 'receiver', or None for both
    ) -> List[TradeResponse]:
        """Get all trades for a user"""
        query = {}
        
        if role == "initiator":
            query["initiator_id"] = user_id
        elif role == "receiver":
            query["receiver_id"] = user_id
        else:
            query["$or"] = [{"initiator_id": user_id}, {"receiver_id": user_id}]
        
        if status:
            query["status"] = status.value
        
        cursor = self.trades.find(query, {"_id": 0}).sort("updated_at", -1)
        trades = await cursor.to_list(length=100)
        
        return [self._trade_to_response(t) for t in trades]
    
    async def counter_offer(self, trade_id: str, user_id: str, counter: TradeCounter) -> Optional[TradeResponse]:
        """Make a counter-offer"""
        trade = await self.trades.find_one({"id": trade_id})
        if not trade:
            return None
        
        # Verify user is part of trade
        if user_id not in [trade["initiator_id"], trade["receiver_id"]]:
            raise ValueError("Not authorized to counter this trade")
        
        if trade["status"] not in [TradeStatus.PENDING.value, TradeStatus.COUNTERED.value]:
            raise ValueError("Trade is not open for counter-offers")
        
        now = datetime.now(timezone.utc)
        
        # Determine which side user is on
        is_initiator = user_id == trade["initiator_id"]
        
        new_initiator_side = {
            "user_id": trade["initiator_id"],
            "card_ids": counter.offered_card_ids if is_initiator else counter.requested_card_ids,
            "cash_amount": counter.offered_cash if is_initiator else counter.requested_cash,
            "confirmed": False,
            "shipped": False,
            "tracking_number": None,
            "shipped_at": None,
            "received": False,
            "received_at": None
        }
        
        new_receiver_side = {
            "user_id": trade["receiver_id"],
            "card_ids": counter.requested_card_ids if is_initiator else counter.offered_card_ids,
            "cash_amount": counter.requested_cash if is_initiator else counter.offered_cash,
            "confirmed": False,
            "shipped": False,
            "tracking_number": None,
            "shipped_at": None,
            "received": False,
            "received_at": None
        }
        
        new_offer = {
            "id": str(uuid.uuid4()),
            "offered_by": user_id,
            "initiator_side": new_initiator_side,
            "receiver_side": new_receiver_side,
            "message": counter.message,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=48)).isoformat()
        }
        
        await self.trades.update_one(
            {"id": trade_id},
            {
                "$set": {
                    "initiator_side": new_initiator_side,
                    "receiver_side": new_receiver_side,
                    "current_offer_id": new_offer["id"],
                    "status": TradeStatus.COUNTERED.value,
                    "updated_at": now.isoformat()
                },
                "$push": {"offers": new_offer}
            }
        )
        
        # Record event
        event = create_event(
            EventType.TRADE_OFFER_COUNTERED,
            "trade",
            trade_id,
            {"offer_id": new_offer["id"]},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        updated = await self.trades.find_one({"id": trade_id}, {"_id": 0})
        return self._trade_to_response(updated)
    
    async def accept(self, trade_id: str, user_id: str) -> Optional[TradeResponse]:
        """Accept current offer"""
        trade = await self.trades.find_one({"id": trade_id})
        if not trade:
            return None
        
        # Verify user is the one who should accept (not the one who made current offer)
        current_offer = next((o for o in trade["offers"] if o["id"] == trade["current_offer_id"]), None)
        if not current_offer:
            raise ValueError("No current offer found")
        
        if current_offer["offered_by"] == user_id:
            raise ValueError("Cannot accept your own offer")
        
        if user_id not in [trade["initiator_id"], trade["receiver_id"]]:
            raise ValueError("Not authorized")
        
        if trade["status"] not in [TradeStatus.PENDING.value, TradeStatus.COUNTERED.value]:
            raise ValueError("Trade cannot be accepted in current state")
        
        now = datetime.now(timezone.utc)
        
        await self.trades.update_one(
            {"id": trade_id},
            {
                "$set": {
                    "status": TradeStatus.ACCEPTED.value,
                    "accepted_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.TRADE_ACCEPTED,
            "trade",
            trade_id,
            {},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Trade accepted: {trade_id}")
        
        updated = await self.trades.find_one({"id": trade_id}, {"_id": 0})
        return self._trade_to_response(updated)
    
    async def reject(self, trade_id: str, user_id: str) -> Optional[TradeResponse]:
        """Reject trade offer"""
        trade = await self.trades.find_one({"id": trade_id})
        if not trade:
            return None
        
        if user_id not in [trade["initiator_id"], trade["receiver_id"]]:
            raise ValueError("Not authorized")
        
        if trade["status"] not in [TradeStatus.PENDING.value, TradeStatus.COUNTERED.value]:
            raise ValueError("Trade cannot be rejected in current state")
        
        now = datetime.now(timezone.utc)
        
        await self.trades.update_one(
            {"id": trade_id},
            {
                "$set": {
                    "status": TradeStatus.REJECTED.value,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.TRADE_REJECTED,
            "trade",
            trade_id,
            {},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        updated = await self.trades.find_one({"id": trade_id}, {"_id": 0})
        return self._trade_to_response(updated)
    
    async def cancel(self, trade_id: str, user_id: str) -> Optional[TradeResponse]:
        """Cancel trade (by either party before escrow)"""
        trade = await self.trades.find_one({"id": trade_id})
        if not trade:
            return None
        
        if user_id not in [trade["initiator_id"], trade["receiver_id"]]:
            raise ValueError("Not authorized")
        
        if trade["status"] in [TradeStatus.IN_ESCROW.value, TradeStatus.COMPLETED.value]:
            raise ValueError("Trade cannot be cancelled in current state")
        
        now = datetime.now(timezone.utc)
        
        await self.trades.update_one(
            {"id": trade_id},
            {
                "$set": {
                    "status": TradeStatus.CANCELLED.value,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.TRADE_CANCELLED,
            "trade",
            trade_id,
            {"cancelled_by": user_id},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        updated = await self.trades.find_one({"id": trade_id}, {"_id": 0})
        return self._trade_to_response(updated)
    
    async def complete(self, trade_id: str) -> Optional[TradeResponse]:
        """Mark trade as completed (after both sides confirm receipt)"""
        trade = await self.trades.find_one({"id": trade_id})
        if not trade:
            return None
        
        # Verify both sides have confirmed receipt
        initiator_received = trade["initiator_side"].get("received", False)
        receiver_received = trade["receiver_side"].get("received", False)
        
        if not (initiator_received and receiver_received):
            raise ValueError("Both parties must confirm receipt before completion")
        
        now = datetime.now(timezone.utc)
        
        await self.trades.update_one(
            {"id": trade_id},
            {
                "$set": {
                    "status": TradeStatus.COMPLETED.value,
                    "completed_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.TRADE_COMPLETED,
            "trade",
            trade_id,
            {},
            actor_id="system"
        )
        await self.event_store.append(event)
        
        logger.info(f"Trade completed: {trade_id}")
        
        updated = await self.trades.find_one({"id": trade_id}, {"_id": 0})
        return self._trade_to_response(updated)
    
    async def get_active_count(self) -> int:
        """Get count of active trades"""
        return await self.trades.count_documents({
            "status": {"$in": [
                TradeStatus.PENDING.value,
                TradeStatus.COUNTERED.value,
                TradeStatus.ACCEPTED.value,
                TradeStatus.IN_ESCROW.value
            ]}
        })
