"""
Slabby Card Service
Project Marvel - Card/Asset Management
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

from models.card import (
    Card, CardCreate, CardUpdate, CardResponse, CardImage,
    CardStatus, CardCategory, CardCondition, CardCertification
)
from models.events import EventType, create_event
from services.event_store import EventStoreService

logger = logging.getLogger(__name__)


class CardService:
    """Card/Asset management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase, event_store: EventStoreService):
        self.db = db
        self.cards = db.cards
        self.event_store = event_store
    
    def _card_to_response(self, card: dict) -> CardResponse:
        return CardResponse(
            id=card["id"],
            owner_id=card["owner_id"],
            title=card["title"],
            player_name=card.get("player_name"),
            team=card.get("team"),
            year=card.get("year"),
            set_name=card.get("set_name"),
            category=CardCategory(card.get("category", "basketball")),
            condition=CardCondition(card.get("condition", "raw")),
            certification=CardCertification(**card["certification"]) if card.get("certification") else None,
            images=[CardImage(**img) for img in card.get("images", [])],
            asking_price=card.get("asking_price"),
            estimated_value=card.get("estimated_value"),
            status=CardStatus(card.get("status", "draft")),
            accept_trades=card.get("accept_trades", True),
            accept_cash=card.get("accept_cash", True),
            accept_partial=card.get("accept_partial", True),
            created_at=card.get("created_at", datetime.now(timezone.utc)),
            listed_at=card.get("listed_at")
        )
    
    async def create(self, owner_id: str, data: CardCreate) -> CardResponse:
        """Create a new card listing"""
        card_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Process images
        images = []
        for i, url in enumerate(data.images):
            images.append({
                "id": str(uuid.uuid4()),
                "url": url,
                "thumbnail_url": url,  # Would generate thumbnail in production
                "is_front": i == 0,
                "order": i
            })
        
        card_doc = {
            "id": card_id,
            "owner_id": owner_id,
            "title": data.title,
            "player_name": data.player_name,
            "team": data.team,
            "year": data.year,
            "set_name": data.set_name,
            "card_number": data.card_number,
            "parallel": data.parallel,
            "category": data.category.value,
            "condition": data.condition.value,
            "certification": None,
            "images": images,
            "asking_price": data.asking_price,
            "floor_price": data.floor_price,
            "estimated_value": None,
            "status": CardStatus.DRAFT.value,
            "accept_trades": data.accept_trades,
            "accept_cash": data.accept_cash,
            "accept_partial": data.accept_partial,
            "provenance": [{
                "owner_id": owner_id,
                "acquired_at": now.isoformat(),
                "method": "listed"
            }],
            "cardsight_id": None,
            "ebay_item_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "listed_at": None,
            "version": 1
        }
        
        await self.cards.insert_one(card_doc)
        
        # Record event
        event = create_event(
            EventType.CARD_LISTED,
            "card",
            card_id,
            {
                "title": data.title,
                "category": data.category.value,
                "asking_price": data.asking_price
            },
            actor_id=owner_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Card created: {card_id} by {owner_id}")
        
        return self._card_to_response(card_doc)
    
    async def get_by_id(self, card_id: str) -> Optional[dict]:
        """Get card by ID"""
        return await self.cards.find_one({"id": card_id}, {"_id": 0})
    
    async def get_user_cards(self, user_id: str, status: Optional[CardStatus] = None) -> List[CardResponse]:
        """Get all cards owned by a user"""
        query = {"owner_id": user_id}
        if status:
            query["status"] = status.value
        
        cursor = self.cards.find(query, {"_id": 0}).sort("created_at", -1)
        cards = await cursor.to_list(length=100)
        
        return [self._card_to_response(c) for c in cards]
    
    async def search(
        self,
        query: Optional[str] = None,
        category: Optional[CardCategory] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        condition: Optional[CardCondition] = None,
        status: CardStatus = CardStatus.AVAILABLE,
        limit: int = 50,
        offset: int = 0
    ) -> List[CardResponse]:
        """Search cards in marketplace"""
        filters = {"status": status.value}
        
        if query:
            filters["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"player_name": {"$regex": query, "$options": "i"}},
                {"team": {"$regex": query, "$options": "i"}},
                {"set_name": {"$regex": query, "$options": "i"}}
            ]
        
        if category:
            filters["category"] = category.value
        
        if min_price is not None:
            filters["asking_price"] = {"$gte": min_price}
        
        if max_price is not None:
            if "asking_price" in filters:
                filters["asking_price"]["$lte"] = max_price
            else:
                filters["asking_price"] = {"$lte": max_price}
        
        if condition:
            filters["condition"] = condition.value
        
        cursor = self.cards.find(filters, {"_id": 0}).skip(offset).limit(limit).sort("listed_at", -1)
        cards = await cursor.to_list(length=limit)
        
        return [self._card_to_response(c) for c in cards]
    
    async def update(self, card_id: str, owner_id: str, updates: CardUpdate) -> Optional[CardResponse]:
        """Update card details"""
        card = await self.cards.find_one({"id": card_id, "owner_id": owner_id})
        if not card:
            return None
        
        update_dict = {}
        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                if isinstance(value, (CardStatus,)):
                    update_dict[field] = value.value
                else:
                    update_dict[field] = value
        
        if update_dict:
            update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            await self.cards.update_one({"id": card_id}, {"$set": update_dict})
        
        updated = await self.cards.find_one({"id": card_id}, {"_id": 0})
        return self._card_to_response(updated)
    
    async def publish(self, card_id: str, owner_id: str) -> Optional[CardResponse]:
        """Publish card to marketplace"""
        card = await self.cards.find_one({"id": card_id, "owner_id": owner_id})
        if not card:
            return None
        
        if card.get("status") != CardStatus.DRAFT.value:
            raise ValueError("Card is not in draft status")
        
        now = datetime.now(timezone.utc)
        await self.cards.update_one(
            {"id": card_id},
            {
                "$set": {
                    "status": CardStatus.AVAILABLE.value,
                    "listed_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
        
        updated = await self.cards.find_one({"id": card_id}, {"_id": 0})
        return self._card_to_response(updated)
    
    async def unlist(self, card_id: str, owner_id: str) -> Optional[CardResponse]:
        """Remove card from marketplace"""
        card = await self.cards.find_one({"id": card_id, "owner_id": owner_id})
        if not card:
            return None
        
        if card.get("status") in [CardStatus.IN_TRADE.value, CardStatus.IN_RAZZ.value, CardStatus.IN_ESCROW.value]:
            raise ValueError("Card is locked in an active transaction")
        
        await self.cards.update_one(
            {"id": card_id},
            {
                "$set": {
                    "status": CardStatus.UNLISTED.value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Record event
        event = create_event(
            EventType.CARD_UNLISTED,
            "card",
            card_id,
            {},
            actor_id=owner_id
        )
        await self.event_store.append(event)
        
        updated = await self.cards.find_one({"id": card_id}, {"_id": 0})
        return self._card_to_response(updated)
    
    async def lock_for_trade(self, card_id: str) -> bool:
        """Lock card for active trade"""
        result = await self.cards.update_one(
            {"id": card_id, "status": CardStatus.AVAILABLE.value},
            {"$set": {"status": CardStatus.IN_TRADE.value}}
        )
        return result.modified_count > 0
    
    async def lock_for_razz(self, card_id: str) -> bool:
        """Lock card for active razz"""
        result = await self.cards.update_one(
            {"id": card_id, "status": CardStatus.AVAILABLE.value},
            {"$set": {"status": CardStatus.IN_RAZZ.value}}
        )
        return result.modified_count > 0
    
    async def unlock(self, card_id: str) -> bool:
        """Unlock card back to available"""
        result = await self.cards.update_one(
            {"id": card_id, "status": {"$in": [CardStatus.IN_TRADE.value, CardStatus.IN_RAZZ.value]}},
            {"$set": {"status": CardStatus.AVAILABLE.value}}
        )
        return result.modified_count > 0
    
    async def transfer(self, card_id: str, from_user_id: str, to_user_id: str, method: str = "trade") -> bool:
        """Transfer card ownership"""
        card = await self.cards.find_one({"id": card_id, "owner_id": from_user_id})
        if not card:
            return False
        
        now = datetime.now(timezone.utc)
        
        # Add to provenance
        provenance_entry = {
            "owner_id": to_user_id,
            "acquired_at": now.isoformat(),
            "method": method,
            "from_user_id": from_user_id
        }
        
        await self.cards.update_one(
            {"id": card_id},
            {
                "$set": {
                    "owner_id": to_user_id,
                    "status": CardStatus.AVAILABLE.value,
                    "updated_at": now.isoformat()
                },
                "$push": {"provenance": provenance_entry}
            }
        )
        
        # Record event
        event = create_event(
            EventType.CARD_TRANSFERRED,
            "card",
            card_id,
            {
                "from_user_id": from_user_id,
                "to_user_id": to_user_id,
                "method": method
            },
            actor_id=from_user_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Card {card_id} transferred from {from_user_id} to {to_user_id}")
        
        return True
    
    async def get_trending(self, category: Optional[CardCategory] = None, limit: int = 20) -> List[CardResponse]:
        """Get trending cards (most viewed/traded recently)"""
        query = {"status": CardStatus.AVAILABLE.value}
        if category:
            query["category"] = category.value
        
        cursor = self.cards.find(query, {"_id": 0}).sort("listed_at", -1).limit(limit)
        cards = await cursor.to_list(length=limit)
        
        return [self._card_to_response(c) for c in cards]
