"""
Slabby User Service
Project Marvel - User Management
"""

from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import bcrypt
import jwt
import uuid
import logging

from models.user import (
    User, UserCreate, UserResponse, UserProfile, UserStats,
    UserRole, UserStatus, VerificationLevel, TokenResponse
)
from models.events import EventType, create_event
from services.event_store import EventStoreService

logger = logging.getLogger(__name__)


class UserService:
    """User management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase, event_store: EventStoreService, jwt_secret: str):
        self.db = db
        self.users = db.users
        self.event_store = event_store
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = "HS256"
        self.jwt_expiration_hours = 24
    
    def _hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _create_token(self, user_id: str) -> str:
        from datetime import timedelta
        payload = {
            "user_id": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=self.jwt_expiration_hours)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _user_to_response(self, user: dict) -> UserResponse:
        return UserResponse(
            id=user["id"],
            email=user["email"],
            profile=UserProfile(**user.get("profile", {"display_name": "User"})),
            role=UserRole(user.get("role", "user")),
            status=UserStatus(user.get("status", "active")),
            verification_level=VerificationLevel(user.get("verification_level", "none")),
            stats=UserStats(**user.get("stats", {})),
            stripe_connect_onboarded=user.get("stripe_connect_onboarded", False),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    
    async def register(self, data: UserCreate) -> TokenResponse:
        """Register a new user"""
        # Check if email exists
        existing = await self.users.find_one({"email": data.email})
        if existing:
            raise ValueError("Email already registered")
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        user_doc = {
            "id": user_id,
            "email": data.email,
            "password_hash": self._hash_password(data.password),
            "profile": {
                "display_name": data.display_name,
                "avatar_url": None,
                "bio": None,
                "location": None,
                "social_links": {}
            },
            "role": UserRole.USER.value,
            "status": UserStatus.ACTIVE.value,  # Auto-activate for now
            "verification_level": VerificationLevel.EMAIL.value,
            "stripe_customer_id": None,
            "stripe_connect_id": None,
            "stripe_connect_onboarded": False,
            "addresses": [],
            "stats": {
                "total_trades": 0,
                "successful_trades": 0,
                "cancelled_trades": 0,
                "total_razz_hosted": 0,
                "total_razz_participated": 0,
                "razz_wins": 0,
                "total_volume_usd": 0.0,
                "rating": 5.0,
                "rating_count": 0,
                "member_since": now.isoformat()
            },
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_login_at": now.isoformat(),
            "version": 1
        }
        
        await self.users.insert_one(user_doc)
        
        # Record event
        event = create_event(
            EventType.USER_REGISTERED,
            "user",
            user_id,
            {"email": data.email, "display_name": data.display_name},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        token = self._create_token(user_id)
        
        logger.info(f"User registered: {user_id}")
        
        return TokenResponse(
            access_token=token,
            user=self._user_to_response(user_doc)
        )
    
    async def login(self, email: str, password: str) -> TokenResponse:
        """Authenticate user and return token"""
        user = await self.users.find_one({"email": email}, {"_id": 0})
        
        if not user or not self._verify_password(password, user["password_hash"]):
            raise ValueError("Invalid email or password")
        
        if user.get("status") == UserStatus.SUSPENDED.value:
            raise ValueError("Account suspended")
        
        if user.get("status") == UserStatus.BANNED.value:
            raise ValueError("Account banned")
        
        # Update last login
        await self.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = self._create_token(user["id"])
        
        return TokenResponse(
            access_token=token,
            user=self._user_to_response(user)
        )
    
    async def get_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        return await self.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    async def get_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        return await self.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    
    async def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT and return user"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("user_id")
            if not user_id:
                return None
            return await self.get_by_id(user_id)
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def update_profile(self, user_id: str, updates: dict) -> Optional[UserResponse]:
        """Update user profile"""
        user = await self.users.find_one({"id": user_id})
        if not user:
            return None
        
        profile_updates = {}
        for key in ["display_name", "avatar_url", "bio", "location", "social_links"]:
            if key in updates:
                profile_updates[f"profile.{key}"] = updates[key]
        
        if profile_updates:
            profile_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await self.users.update_one({"id": user_id}, {"$set": profile_updates})
            
            # Record event
            event = create_event(
                EventType.USER_UPDATED,
                "user",
                user_id,
                {"updates": list(updates.keys())},
                actor_id=user_id
            )
            await self.event_store.append(event)
        
        updated_user = await self.users.find_one({"id": user_id}, {"_id": 0})
        return self._user_to_response(updated_user)
    
    async def update_stripe_connect(self, user_id: str, connect_id: str, onboarded: bool = False):
        """Update Stripe Connect account info"""
        await self.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "stripe_connect_id": connect_id,
                    "stripe_connect_onboarded": onboarded,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    async def increment_stats(self, user_id: str, stat_updates: dict):
        """Increment user statistics"""
        inc_updates = {f"stats.{k}": v for k, v in stat_updates.items()}
        await self.users.update_one(
            {"id": user_id},
            {"$inc": inc_updates}
        )
    
    async def get_leaderboard(self, metric: str = "total_volume_usd", limit: int = 20) -> List[dict]:
        """Get user leaderboard by metric"""
        cursor = self.users.find(
            {"status": UserStatus.ACTIVE.value},
            {"_id": 0, "password_hash": 0}
        ).sort(f"stats.{metric}", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
