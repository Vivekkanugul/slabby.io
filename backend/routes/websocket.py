"""
Slabby WebSocket Routes
Project Marvel - Real-time Notifications
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime, timezone

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # user_id -> set of websocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Global broadcast connections (for public events)
        self.broadcast_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
        else:
            self.broadcast_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        """Remove a WebSocket connection"""
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        else:
            self.broadcast_connections.discard(websocket)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.add(connection)
            
            # Clean up dead connections
            for conn in dead_connections:
                self.active_connections[user_id].discard(conn)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients"""
        dead_connections = set()
        
        # Send to all broadcast connections
        for connection in self.broadcast_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        # Also send to all user connections
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
                    pass  # Will be cleaned up on next user-specific send
        
        # Clean up dead broadcast connections
        for conn in dead_connections:
            self.broadcast_connections.discard(conn)
    
    async def notify_trade_update(self, trade_id: str, initiator_id: str, receiver_id: str, event_type: str, data: dict = None):
        """Notify both parties of a trade update"""
        message = {
            "type": "trade_update",
            "trade_id": trade_id,
            "event": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.send_to_user(initiator_id, message)
        await self.send_to_user(receiver_id, message)
    
    async def notify_razz_update(self, razz_id: str, event_type: str, data: dict = None):
        """Broadcast a razz update to all connected clients"""
        message = {
            "type": "razz_update",
            "razz_id": razz_id,
            "event": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast(message)
    
    async def notify_wallet_update(self, user_id: str, event_type: str, data: dict = None):
        """Notify user of wallet balance change"""
        message = {
            "type": "wallet_update",
            "event": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.send_to_user(user_id, message)


# Global connection manager
manager = ConnectionManager()


def get_user_id_from_token(token: str) -> str:
    """Extract user_id from JWT token"""
    import jwt
    import os
    
    try:
        secret = os.environ.get('JWT_SECRET', 'slabby_jwt_secret_key_2026')
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("user_id")
    except:
        return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Public WebSocket endpoint for broadcast events"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()
            # Echo back or handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/ws/user")
async def user_websocket_endpoint(websocket: WebSocket):
    """Authenticated WebSocket endpoint for user-specific notifications"""
    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    user_id = get_user_id_from_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


# Export manager for use in other services
def get_ws_manager() -> ConnectionManager:
    return manager
