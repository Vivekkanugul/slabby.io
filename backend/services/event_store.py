"""
Slabby Event Store Service
Project Marvel - Event Sourcing Core

All state changes flow through this service.
Events are immutable and form the source of truth.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models.events import Event, EventType, create_event

logger = logging.getLogger(__name__)


class EventStoreService:
    """
    Event Store - Append-only event log
    
    All state mutations are recorded as events.
    Current state is derived by replaying events.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.events = db.events
        self.snapshots = db.snapshots
    
    async def append(self, event: Event) -> Event:
        """Append a new event to the store"""
        event_dict = event.model_dump()
        event_dict["timestamp"] = event.timestamp.isoformat()
        
        await self.events.insert_one(event_dict)
        logger.info(f"Event appended: {event.event_type} for {event.aggregate_type}:{event.aggregate_id}")
        
        return event
    
    async def append_batch(self, events: List[Event]) -> List[Event]:
        """Append multiple events atomically"""
        if not events:
            return []
        
        event_dicts = []
        for event in events:
            d = event.model_dump()
            d["timestamp"] = event.timestamp.isoformat()
            event_dicts.append(d)
        
        await self.events.insert_many(event_dicts)
        logger.info(f"Batch of {len(events)} events appended")
        
        return events
    
    async def get_events(
        self,
        aggregate_type: str,
        aggregate_id: str,
        after_version: int = 0
    ) -> List[Event]:
        """Get all events for an aggregate after a specific version"""
        cursor = self.events.find(
            {
                "aggregate_type": aggregate_type,
                "aggregate_id": aggregate_id,
                "version": {"$gt": after_version}
            },
            {"_id": 0}
        ).sort("version", 1)
        
        events = []
        async for doc in cursor:
            events.append(Event(**doc))
        
        return events
    
    async def get_events_by_type(
        self,
        event_type: EventType,
        limit: int = 100,
        offset: int = 0
    ) -> List[Event]:
        """Get events of a specific type"""
        cursor = self.events.find(
            {"event_type": event_type.value},
            {"_id": 0}
        ).sort("timestamp", -1).skip(offset).limit(limit)
        
        events = []
        async for doc in cursor:
            events.append(Event(**doc))
        
        return events
    
    async def get_events_by_actor(
        self,
        actor_id: str,
        limit: int = 100
    ) -> List[Event]:
        """Get all events triggered by a specific user"""
        cursor = self.events.find(
            {"actor_id": actor_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        events = []
        async for doc in cursor:
            events.append(Event(**doc))
        
        return events
    
    async def get_recent_events(
        self,
        limit: int = 50,
        event_types: Optional[List[EventType]] = None
    ) -> List[Event]:
        """Get recent events, optionally filtered by type"""
        query = {}
        if event_types:
            query["event_type"] = {"$in": [et.value for et in event_types]}
        
        cursor = self.events.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        events = []
        async for doc in cursor:
            events.append(Event(**doc))
        
        return events
    
    async def save_snapshot(
        self,
        aggregate_type: str,
        aggregate_id: str,
        state: Dict[str, Any],
        version: int
    ):
        """Save a snapshot of current state for faster reconstruction"""
        await self.snapshots.update_one(
            {
                "aggregate_type": aggregate_type,
                "aggregate_id": aggregate_id
            },
            {
                "$set": {
                    "state": state,
                    "version": version,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        logger.info(f"Snapshot saved for {aggregate_type}:{aggregate_id} at version {version}")
    
    async def get_snapshot(
        self,
        aggregate_type: str,
        aggregate_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get the latest snapshot for an aggregate"""
        snapshot = await self.snapshots.find_one(
            {
                "aggregate_type": aggregate_type,
                "aggregate_id": aggregate_id
            },
            {"_id": 0}
        )
        return snapshot
    
    async def get_aggregate_state(
        self,
        aggregate_type: str,
        aggregate_id: str,
        apply_event_fn
    ) -> Optional[Dict[str, Any]]:
        """
        Reconstruct current state by replaying events.
        Uses snapshot + subsequent events for efficiency.
        """
        # Try to get snapshot first
        snapshot = await self.get_snapshot(aggregate_type, aggregate_id)
        
        if snapshot:
            state = snapshot["state"]
            version = snapshot["version"]
        else:
            state = None
            version = 0
        
        # Get events after snapshot
        events = await self.get_events(aggregate_type, aggregate_id, version)
        
        # Apply events to reconstruct state
        for event in events:
            state = apply_event_fn(state, event)
        
        return state
    
    async def count_events(
        self,
        aggregate_type: Optional[str] = None,
        event_type: Optional[EventType] = None
    ) -> int:
        """Count events with optional filters"""
        query = {}
        if aggregate_type:
            query["aggregate_type"] = aggregate_type
        if event_type:
            query["event_type"] = event_type.value
        
        return await self.events.count_documents(query)


# Event creation helpers for common operations
def user_registered_event(user_id: str, email: str, display_name: str) -> Event:
    return create_event(
        EventType.USER_REGISTERED,
        "user",
        user_id,
        {"email": email, "display_name": display_name}
    )


def card_listed_event(card_id: str, owner_id: str, card_data: Dict) -> Event:
    return create_event(
        EventType.CARD_LISTED,
        "card",
        card_id,
        card_data,
        actor_id=owner_id
    )


def trade_initiated_event(trade_id: str, initiator_id: str, trade_data: Dict) -> Event:
    return create_event(
        EventType.TRADE_INITIATED,
        "trade",
        trade_id,
        trade_data,
        actor_id=initiator_id
    )


def razz_created_event(razz_id: str, host_id: str, razz_data: Dict) -> Event:
    return create_event(
        EventType.RAZZ_CREATED,
        "razz",
        razz_id,
        razz_data,
        actor_id=host_id
    )


def wallet_transaction_event(wallet_id: str, user_id: str, tx_data: Dict, event_type: EventType) -> Event:
    return create_event(
        event_type,
        "wallet",
        wallet_id,
        tx_data,
        actor_id=user_id
    )
