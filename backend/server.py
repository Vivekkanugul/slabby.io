"""
Slabby API Server
Project Marvel - Event-Sourced Trading & Razz Platform

Main application entry point with modular architecture:
- /routes: API route handlers
- /services: Business logic services  
- /models: Pydantic data models
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'slabby_jwt_secret_key_2026')

# Import services
from services.event_store import EventStoreService
from services.user_service import UserService
from services.card_service import CardService
from services.trade_service import TradeService
from services.razz_service import RazzService
from services.wallet_service import WalletService

# Initialize services (module-level for dependency injection)
event_store = EventStoreService(db)
user_service = UserService(db, event_store, JWT_SECRET)
card_service = CardService(db, event_store)
trade_service = TradeService(db, event_store)
razz_service = RazzService(db, event_store)
wallet_service = WalletService(db, event_store)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Slabby API starting up...")
    logger.info(f"Database: {db_name}")
    
    # Create indexes for performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.cards.create_index("id", unique=True)
    await db.cards.create_index("owner_id")
    await db.cards.create_index("status")
    await db.trades.create_index("id", unique=True)
    await db.trades.create_index("initiator_id")
    await db.trades.create_index("receiver_id")
    await db.razzes.create_index("id", unique=True)
    await db.razzes.create_index("host_id")
    await db.razzes.create_index("status")
    await db.wallets.create_index("user_id", unique=True)
    await db.events.create_index([("aggregate_type", 1), ("aggregate_id", 1), ("version", 1)])
    await db.events.create_index("timestamp")
    
    logger.info("Database indexes created")
    
    yield
    
    # Cleanup
    logger.info("Slabby API shutting down...")
    client.close()


# Create FastAPI app
app = FastAPI(
    title="Slabby API",
    description="Trading & Razz Platform - Project Marvel",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.auth import router as auth_router
from routes.cards import router as cards_router
from routes.trades import router as trades_router
from routes.razz import router as razz_router
from routes.wallet import router as wallet_router
from routes.admin import router as admin_router

# Register all routes under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(cards_router, prefix="/api")
app.include_router(trades_router, prefix="/api")
app.include_router(razz_router, prefix="/api")
app.include_router(wallet_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api")
async def root():
    """API health check"""
    return {
        "name": "Slabby API",
        "version": "2.0.0",
        "status": "operational",
        "architecture": "event-sourced"
    }


@app.get("/api/health")
async def health():
    """Detailed health check"""
    try:
        # Test DB connection
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Get counts
    try:
        user_count = await db.users.count_documents({})
        card_count = await db.cards.count_documents({})
        event_count = await db.events.count_documents({})
    except:
        user_count = card_count = event_count = 0
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "counts": {
            "users": user_count,
            "cards": card_count,
            "events": event_count
        }
    }


@app.get("/api/stats")
async def get_platform_stats():
    """Public platform statistics"""
    try:
        user_count = await db.users.count_documents({})
        card_count = await db.cards.count_documents({"status": "available"})
        active_trades = await trade_service.get_active_count()
        active_razzes = await razz_service.get_active_count()
    except:
        user_count = card_count = active_trades = active_razzes = 0
    
    return {
        "total_users": user_count,
        "cards_listed": card_count,
        "active_trades": active_trades,
        "active_razzes": active_razzes
    }
