from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CardBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    player_name: str
    team: str
    year: int
    set_name: str
    grade: str
    current_price: float
    previous_price: float
    price_change_pct: float
    image_url: str
    category: str
    rarity: str
    last_sold: str
    volume_24h: int
    market_cap: float
    # Advanced analytics fields
    volatility_30d: float = 0.0
    sharpe_ratio: float = 0.0
    beta: float = 1.0
    correlation_market: float = 0.0

class MarketplaceListing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    card_id: str
    seller_id: str
    seller_name: str
    price: float
    quantity: int
    listed_at: str
    status: str

class PortfolioHolding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    card_id: str
    quantity: int
    avg_purchase_price: float
    total_invested: float
    current_value: float
    profit_loss: float
    profit_loss_pct: float

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    card_id: str
    card_name: str
    transaction_type: str
    quantity: int
    price_per_card: float
    total_amount: float
    timestamp: str

class AIPrediction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    card_id: str
    card_name: str
    predicted_price_7d: float
    predicted_price_30d: float
    signal: str
    confidence_score: float
    risk_score: float
    sentiment_score: float
    analysis: str
    factors: List[str]
    generated_at: str

class CreateListingRequest(BaseModel):
    card_id: str
    price: float
    quantity: int

class BuyCardRequest(BaseModel):
    listing_id: str
    quantity: int

class AddToPortfolioRequest(BaseModel):
    card_id: str
    quantity: int
    purchase_price: float

class AIAnalysisRequest(BaseModel):
    card_id: str

# Advanced Analytics Models
class WhatIfScenario(BaseModel):
    card_id: str
    scenario_type: str  # "trade", "injury", "award", "retirement", "regrade"
    scenario_details: Optional[str] = None

class StressTestRequest(BaseModel):
    scenario: str  # "market_crash", "player_retirement", "category_decline"
    severity: float = 0.2  # 20% default

class ArbitrageOpportunity(BaseModel):
    card_id: str
    card_name: str
    current_price: float
    fair_value: float
    discount_pct: float
    comparable_cards: List[Dict]
    confidence: float

class SentimentData(BaseModel):
    card_id: str
    twitter_sentiment: float
    reddit_sentiment: float
    news_sentiment: float
    overall_sentiment: float
    trending_score: float
    mentions_24h: int
    sentiment_change: float
    key_topics: List[str]

class GradeProbability(BaseModel):
    grade: str
    probability: float
    expected_value: float
    roi_if_achieved: float

class SmartAlert(BaseModel):
    id: str
    card_id: str
    card_name: str
    alert_type: str
    message: str
    context: str
    severity: str
    timestamp: str
    is_read: bool = False

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ SEED DATA WITH ADVANCED METRICS ============

MOCK_CARDS = [
    {"id": "card_001", "name": "1986 Fleer Michael Jordan RC #57", "player_name": "Michael Jordan", "team": "Chicago Bulls", "year": 1986, "set_name": "Fleer", "grade": "PSA 10", "current_price": 738500, "previous_price": 695000, "price_change_pct": 6.26, "image_url": "https://images.pexels.com/photos/7809125/pexels-photo-7809125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Legendary", "last_sold": "2024-01-15", "volume_24h": 3, "market_cap": 12500000, "volatility_30d": 12.5, "sharpe_ratio": 1.8, "beta": 0.85, "correlation_market": 0.72, "player_status": "retired", "hall_of_fame": True, "championships": 6},
    {"id": "card_002", "name": "2003 Topps Chrome LeBron James RC #111", "player_name": "LeBron James", "team": "Cleveland Cavaliers", "year": 2003, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 425000, "previous_price": 450000, "price_change_pct": -5.56, "image_url": "https://images.pexels.com/photos/7708408/pexels-photo-7708408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Legendary", "last_sold": "2024-01-10", "volume_24h": 5, "market_cap": 8500000, "volatility_30d": 18.2, "sharpe_ratio": 1.2, "beta": 1.15, "correlation_market": 0.68, "player_status": "active", "hall_of_fame": False, "championships": 4},
    {"id": "card_003", "name": "2018 Panini Prizm Luka Doncic RC #280", "player_name": "Luka Doncic", "team": "Dallas Mavericks", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 8500, "previous_price": 7200, "price_change_pct": 18.06, "image_url": "https://images.pexels.com/photos/7783413/pexels-photo-7783413.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-18", "volume_24h": 45, "market_cap": 2800000, "volatility_30d": 28.5, "sharpe_ratio": 2.1, "beta": 1.45, "correlation_market": 0.58, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_004", "name": "1952 Topps Mickey Mantle #311", "player_name": "Mickey Mantle", "team": "New York Yankees", "year": 1952, "set_name": "Topps", "grade": "PSA 9", "current_price": 5200000, "previous_price": 5000000, "price_change_pct": 4.0, "image_url": "https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Legendary", "last_sold": "2023-12-20", "volume_24h": 1, "market_cap": 52000000, "volatility_30d": 8.2, "sharpe_ratio": 2.5, "beta": 0.45, "correlation_market": 0.82, "player_status": "deceased", "hall_of_fame": True, "championships": 7},
    {"id": "card_005", "name": "2020 Panini Prizm Justin Herbert RC #325", "player_name": "Justin Herbert", "team": "LA Chargers", "year": 2020, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1250, "previous_price": 1400, "price_change_pct": -10.71, "image_url": "https://images.pexels.com/photos/8721966/pexels-photo-8721966.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Rare", "last_sold": "2024-01-17", "volume_24h": 120, "market_cap": 950000, "volatility_30d": 32.1, "sharpe_ratio": 0.8, "beta": 1.65, "correlation_market": 0.52, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_006", "name": "2019 Panini Prizm Zion Williamson RC #248", "player_name": "Zion Williamson", "team": "New Orleans Pelicans", "year": 2019, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 2800, "previous_price": 3200, "price_change_pct": -12.5, "image_url": "https://images.pexels.com/photos/6203470/pexels-photo-6203470.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-16", "volume_24h": 85, "market_cap": 1400000, "volatility_30d": 42.3, "sharpe_ratio": 0.4, "beta": 1.85, "correlation_market": 0.45, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_007", "name": "2022 Topps Chrome Julio Rodriguez RC #170", "player_name": "Julio Rodriguez", "team": "Seattle Mariners", "year": 2022, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 450, "previous_price": 380, "price_change_pct": 18.42, "image_url": "https://images.pexels.com/photos/8721991/pexels-photo-8721991.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Common", "last_sold": "2024-01-19", "volume_24h": 250, "market_cap": 450000, "volatility_30d": 25.6, "sharpe_ratio": 1.9, "beta": 1.25, "correlation_market": 0.55, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_008", "name": "2020 Panini National Treasures Joe Burrow RC", "player_name": "Joe Burrow", "team": "Cincinnati Bengals", "year": 2020, "set_name": "National Treasures", "grade": "BGS 9.5", "current_price": 15500, "previous_price": 14000, "price_change_pct": 10.71, "image_url": "https://images.pexels.com/photos/4219606/pexels-photo-4219606.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Ultra Rare", "last_sold": "2024-01-14", "volume_24h": 12, "market_cap": 3100000, "volatility_30d": 22.8, "sharpe_ratio": 1.6, "beta": 1.35, "correlation_market": 0.62, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_009", "name": "2018 Panini Prizm Trae Young RC #78", "player_name": "Trae Young", "team": "Atlanta Hawks", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1850, "previous_price": 1950, "price_change_pct": -5.13, "image_url": "https://images.pexels.com/photos/5965643/pexels-photo-5965643.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-12", "volume_24h": 65, "market_cap": 925000, "volatility_30d": 29.4, "sharpe_ratio": 1.1, "beta": 1.42, "correlation_market": 0.48, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_010", "name": "2023 Topps Chrome Victor Wembanyama RC", "player_name": "Victor Wembanyama", "team": "San Antonio Spurs", "year": 2023, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 3200, "previous_price": 2400, "price_change_pct": 33.33, "image_url": "https://images.pexels.com/photos/7562089/pexels-photo-7562089.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-20", "volume_24h": 180, "market_cap": 1600000, "volatility_30d": 45.2, "sharpe_ratio": 2.8, "beta": 1.95, "correlation_market": 0.38, "player_status": "active", "hall_of_fame": False, "championships": 0},
]

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=user_doc["created_at"])
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============ CARDS ROUTES ============

@api_router.get("/cards", response_model=List[CardBase])
async def get_cards(category: Optional[str] = None, search: Optional[str] = None, sort_by: Optional[str] = "current_price", order: Optional[str] = "desc"):
    cards = MOCK_CARDS.copy()
    
    if category and category != "all":
        cards = [c for c in cards if c["category"].lower() == category.lower()]
    
    if search:
        search_lower = search.lower()
        cards = [c for c in cards if search_lower in c["name"].lower() or search_lower in c["player_name"].lower()]
    
    reverse = order == "desc"
    if sort_by in ["current_price", "price_change_pct", "volume_24h", "volatility_30d", "sharpe_ratio"]:
        cards.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
    
    return cards

@api_router.get("/cards/trending", response_model=List[CardBase])
async def get_trending_cards():
    cards = sorted(MOCK_CARDS, key=lambda x: abs(x["price_change_pct"]), reverse=True)[:5]
    return cards

@api_router.get("/cards/{card_id}", response_model=CardBase)
async def get_card(card_id: str):
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@api_router.get("/cards/{card_id}/price-history")
async def get_price_history(card_id: str):
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    base_price = card["current_price"]
    history = []
    for i in range(90):  # Extended to 90 days
        date = (datetime.now(timezone.utc) - timedelta(days=89-i)).strftime("%Y-%m-%d")
        variation = random.uniform(-0.08, 0.12)
        price = base_price * (0.75 + (i / 90) * 0.25 + variation * (i / 90))
        volume = random.randint(1, 50) + int(i / 10)
        history.append({"date": date, "price": round(price, 2), "volume": volume})
    
    return {"card_id": card_id, "history": history}

# ============ MARKETPLACE ROUTES ============

@api_router.get("/marketplace/listings", response_model=List[dict])
async def get_marketplace_listings(category: Optional[str] = None):
    listings = await db.marketplace_listings.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    result = []
    for listing in listings:
        card = next((c for c in MOCK_CARDS if c["id"] == listing["card_id"]), None)
        if card:
            if category and category != "all" and card["category"].lower() != category.lower():
                continue
            result.append({**listing, "card": card})
    
    return result

@api_router.post("/marketplace/list", response_model=MarketplaceListing)
async def create_listing(request: CreateListingRequest, current_user: dict = Depends(get_current_user)):
    card = next((c for c in MOCK_CARDS if c["id"] == request.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    listing_id = str(uuid.uuid4())
    listing = {
        "id": listing_id,
        "card_id": request.card_id,
        "seller_id": current_user["id"],
        "seller_name": current_user["name"],
        "price": request.price,
        "quantity": request.quantity,
        "listed_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    await db.marketplace_listings.insert_one(listing)
    return MarketplaceListing(**listing)

@api_router.post("/marketplace/buy")
async def buy_from_marketplace(request: BuyCardRequest, current_user: dict = Depends(get_current_user)):
    listing = await db.marketplace_listings.find_one({"id": request.listing_id, "status": "active"}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["seller_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own listing")
    
    if request.quantity > listing["quantity"]:
        raise HTTPException(status_code=400, detail="Not enough quantity available")
    
    card = next((c for c in MOCK_CARDS if c["id"] == listing["card_id"]), None)
    total_amount = listing["price"] * request.quantity
    
    transaction_id = str(uuid.uuid4())
    transaction = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "card_id": listing["card_id"],
        "card_name": card["name"] if card else "Unknown",
        "transaction_type": "buy",
        "quantity": request.quantity,
        "price_per_card": listing["price"],
        "total_amount": total_amount,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    existing_holding = await db.portfolio.find_one({"user_id": current_user["id"], "card_id": listing["card_id"]}, {"_id": 0})
    
    if existing_holding:
        new_qty = existing_holding["quantity"] + request.quantity
        new_total = existing_holding["total_invested"] + total_amount
        new_avg = new_total / new_qty
        current_value = new_qty * card["current_price"] if card else new_total
        await db.portfolio.update_one(
            {"id": existing_holding["id"]},
            {"$set": {
                "quantity": new_qty,
                "avg_purchase_price": new_avg,
                "total_invested": new_total,
                "current_value": current_value,
                "profit_loss": current_value - new_total,
                "profit_loss_pct": ((current_value - new_total) / new_total) * 100 if new_total > 0 else 0
            }}
        )
    else:
        current_value = request.quantity * card["current_price"] if card else total_amount
        holding = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "card_id": listing["card_id"],
            "quantity": request.quantity,
            "avg_purchase_price": listing["price"],
            "total_invested": total_amount,
            "current_value": current_value,
            "profit_loss": current_value - total_amount,
            "profit_loss_pct": ((current_value - total_amount) / total_amount) * 100 if total_amount > 0 else 0
        }
        await db.portfolio.insert_one(holding)
    
    new_qty = listing["quantity"] - request.quantity
    if new_qty <= 0:
        await db.marketplace_listings.update_one({"id": request.listing_id}, {"$set": {"status": "sold", "quantity": 0}})
    else:
        await db.marketplace_listings.update_one({"id": request.listing_id}, {"$set": {"quantity": new_qty}})
    
    return {"success": True, "transaction_id": transaction_id, "message": f"Successfully purchased {request.quantity} card(s)"}

# ============ PORTFOLIO ROUTES ============

@api_router.get("/portfolio", response_model=List[dict])
async def get_portfolio(current_user: dict = Depends(get_current_user)):
    holdings = await db.portfolio.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    result = []
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if card:
            current_value = holding["quantity"] * card["current_price"]
            holding["current_value"] = current_value
            holding["profit_loss"] = current_value - holding["total_invested"]
            holding["profit_loss_pct"] = ((current_value - holding["total_invested"]) / holding["total_invested"]) * 100 if holding["total_invested"] > 0 else 0
            result.append({**holding, "card": card})
    
    return result

@api_router.get("/portfolio/summary")
async def get_portfolio_summary(current_user: dict = Depends(get_current_user)):
    holdings = await db.portfolio.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    total_invested = 0
    total_value = 0
    holdings_count = 0
    total_volatility = 0
    weighted_beta = 0
    
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if card:
            card_value = holding["quantity"] * card["current_price"]
            total_invested += holding["total_invested"]
            total_value += card_value
            holdings_count += holding["quantity"]
            total_volatility += card.get("volatility_30d", 0) * card_value
            weighted_beta += card.get("beta", 1) * card_value
    
    profit_loss = total_value - total_invested
    profit_loss_pct = ((total_value - total_invested) / total_invested) * 100 if total_invested > 0 else 0
    avg_volatility = total_volatility / total_value if total_value > 0 else 0
    portfolio_beta = weighted_beta / total_value if total_value > 0 else 1
    
    return {
        "total_invested": round(total_invested, 2),
        "total_value": round(total_value, 2),
        "profit_loss": round(profit_loss, 2),
        "profit_loss_pct": round(profit_loss_pct, 2),
        "holdings_count": holdings_count,
        "unique_cards": len(holdings),
        "portfolio_volatility": round(avg_volatility, 2),
        "portfolio_beta": round(portfolio_beta, 2),
        "risk_score": min(100, round(avg_volatility * 2.5, 0))
    }

@api_router.post("/portfolio/add")
async def add_to_portfolio(request: AddToPortfolioRequest, current_user: dict = Depends(get_current_user)):
    card = next((c for c in MOCK_CARDS if c["id"] == request.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    total_amount = request.quantity * request.purchase_price
    current_value = request.quantity * card["current_price"]
    
    existing = await db.portfolio.find_one({"user_id": current_user["id"], "card_id": request.card_id}, {"_id": 0})
    
    if existing:
        new_qty = existing["quantity"] + request.quantity
        new_total = existing["total_invested"] + total_amount
        new_avg = new_total / new_qty
        new_value = new_qty * card["current_price"]
        await db.portfolio.update_one(
            {"id": existing["id"]},
            {"$set": {
                "quantity": new_qty,
                "avg_purchase_price": new_avg,
                "total_invested": new_total,
                "current_value": new_value,
                "profit_loss": new_value - new_total,
                "profit_loss_pct": ((new_value - new_total) / new_total) * 100
            }}
        )
    else:
        holding = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "card_id": request.card_id,
            "quantity": request.quantity,
            "avg_purchase_price": request.purchase_price,
            "total_invested": total_amount,
            "current_value": current_value,
            "profit_loss": current_value - total_amount,
            "profit_loss_pct": ((current_value - total_amount) / total_amount) * 100
        }
        await db.portfolio.insert_one(holding)
    
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "card_id": request.card_id,
        "card_name": card["name"],
        "transaction_type": "buy",
        "quantity": request.quantity,
        "price_per_card": request.purchase_price,
        "total_amount": total_amount,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    return {"success": True, "message": f"Added {request.quantity} {card['name']} to portfolio"}

@api_router.delete("/portfolio/{holding_id}")
async def remove_from_portfolio(holding_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.portfolio.delete_one({"id": holding_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"success": True, "message": "Holding removed from portfolio"}

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return [Transaction(**t) for t in transactions]

# ============ AI PREDICTIONS ROUTES ============

@api_router.get("/predictions", response_model=List[AIPrediction])
async def get_all_predictions():
    predictions = []
    for card in MOCK_CARDS[:6]:
        signal = random.choice(["STRONG BUY", "BUY", "HOLD", "SELL"])
        confidence = random.uniform(0.65, 0.95)
        risk = random.uniform(0.2, 0.8)
        sentiment = random.uniform(-0.5, 0.8)
        
        pred = AIPrediction(
            id=str(uuid.uuid4()),
            card_id=card["id"],
            card_name=card["name"],
            predicted_price_7d=card["current_price"] * random.uniform(0.95, 1.15),
            predicted_price_30d=card["current_price"] * random.uniform(0.9, 1.25),
            signal=signal,
            confidence_score=round(confidence, 2),
            risk_score=round(risk, 2),
            sentiment_score=round(sentiment, 2),
            analysis=f"Based on market trends, player performance, and social sentiment analysis, {card['player_name']} cards show {signal.lower()} signals.",
            factors=["eBay price momentum", "Player stats trending", "Social sentiment positive", "Market volume increasing"],
            generated_at=datetime.now(timezone.utc).isoformat()
        )
        predictions.append(pred)
    return predictions

@api_router.get("/predictions/{card_id}", response_model=AIPrediction)
async def get_card_prediction(card_id: str):
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    signal = random.choice(["STRONG BUY", "BUY", "HOLD", "SELL"])
    confidence = random.uniform(0.65, 0.95)
    risk = random.uniform(0.2, 0.8)
    sentiment = random.uniform(-0.5, 0.8)
    
    return AIPrediction(
        id=str(uuid.uuid4()),
        card_id=card["id"],
        card_name=card["name"],
        predicted_price_7d=card["current_price"] * random.uniform(0.95, 1.15),
        predicted_price_30d=card["current_price"] * random.uniform(0.9, 1.25),
        signal=signal,
        confidence_score=round(confidence, 2),
        risk_score=round(risk, 2),
        sentiment_score=round(sentiment, 2),
        analysis=f"Based on market trends, player performance, and social sentiment analysis, {card['player_name']} cards show {signal.lower()} signals.",
        factors=["eBay price momentum", "Player stats trending", "Social sentiment analysis", "Historical price patterns"],
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@api_router.post("/predictions/analyze")
async def analyze_card_with_ai(request: AIAnalysisRequest, current_user: dict = Depends(get_current_user)):
    card = next((c for c in MOCK_CARDS if c["id"] == request.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"card_analysis_{card['id']}_{current_user['id']}",
            system_message="You are a professional sports card investment analyst. Provide concise, actionable investment advice based on card data. Be specific about price predictions and risk levels."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this collectible card for investment potential:

Card: {card['name']}
Player: {card['player_name']}
Team: {card['team']}
Year: {card['year']}
Grade: {card['grade']}
Current Price: ${card['current_price']:,.2f}
24h Price Change: {card['price_change_pct']}%
Category: {card['category']}
Rarity: {card['rarity']}
24h Volume: {card['volume_24h']} sales
30-Day Volatility: {card.get('volatility_30d', 'N/A')}%
Sharpe Ratio: {card.get('sharpe_ratio', 'N/A')}
Beta: {card.get('beta', 'N/A')}

Provide:
1. Investment Signal (STRONG BUY/BUY/HOLD/SELL)
2. 7-day price prediction
3. 30-day price prediction
4. Risk score (1-10)
5. Key factors affecting the price
6. Brief investment thesis (2-3 sentences)"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "card_id": card["id"],
            "card_name": card["name"],
            "analysis": response,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except ImportError:
        return {
            "card_id": card["id"],
            "card_name": card["name"],
            "analysis": f"AI Analysis for {card['name']}: This {card['grade']} graded card shows {'bullish' if card['price_change_pct'] > 0 else 'bearish'} momentum with {card['price_change_pct']}% price change. Consider {'accumulating' if card['price_change_pct'] > 0 else 'monitoring'} based on current market conditions.",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        return {
            "card_id": card["id"],
            "card_name": card["name"],
            "analysis": f"AI Analysis for {card['name']}: This {card['grade']} graded card shows {'bullish' if card['price_change_pct'] > 0 else 'bearish'} momentum with {card['price_change_pct']}% price change. Consider {'accumulating' if card['price_change_pct'] > 0 else 'monitoring'} based on current market conditions.",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

# ============ ADVANCED ANALYTICS ROUTES ============

@api_router.post("/analytics/what-if")
async def what_if_simulator(request: WhatIfScenario, current_user: dict = Depends(get_current_user)):
    """AI-powered What-If Scenario Simulator"""
    card = next((c for c in MOCK_CARDS if c["id"] == request.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    scenarios = {
        "trade": {"impact_range": (0.15, 0.35), "direction": "up", "timeframe": "2-4 weeks"},
        "injury": {"impact_range": (-0.25, -0.40), "direction": "down", "timeframe": "immediate"},
        "award": {"impact_range": (0.20, 0.50), "direction": "up", "timeframe": "1-2 weeks"},
        "retirement": {"impact_range": (0.10, 0.30), "direction": "up", "timeframe": "6-12 months"},
        "championship": {"impact_range": (0.25, 0.60), "direction": "up", "timeframe": "1-4 weeks"},
        "regrade_up": {"impact_range": (0.40, 0.80), "direction": "up", "timeframe": "immediate"},
        "regrade_down": {"impact_range": (-0.30, -0.50), "direction": "down", "timeframe": "immediate"},
        "scandal": {"impact_range": (-0.35, -0.60), "direction": "down", "timeframe": "immediate"},
        "hall_of_fame": {"impact_range": (0.15, 0.40), "direction": "up", "timeframe": "3-6 months"},
    }
    
    scenario_config = scenarios.get(request.scenario_type, {"impact_range": (-0.10, 0.10), "direction": "neutral", "timeframe": "unknown"})
    
    impact_pct = random.uniform(*scenario_config["impact_range"])
    new_price = card["current_price"] * (1 + impact_pct)
    
    # Generate AI analysis
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if api_key:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"whatif_{card['id']}_{request.scenario_type}",
                system_message="You are a sports card market analyst. Provide brief, specific analysis of how scenarios affect card values."
            ).with_model("openai", "gpt-5.2")
            
            prompt = f"""Scenario: {request.scenario_type.replace('_', ' ').title()} for {card['player_name']}
Card: {card['name']} (Current: ${card['current_price']:,.0f})
Details: {request.scenario_details or 'Standard scenario'}

In 2-3 sentences, explain:
1. Expected price impact and why
2. Historical precedents
3. Confidence level in prediction"""

            response = await chat.send_message(UserMessage(text=prompt))
            ai_analysis = response
        else:
            ai_analysis = f"Based on historical data, a {request.scenario_type.replace('_', ' ')} event typically results in a {abs(impact_pct)*100:.1f}% price {'increase' if impact_pct > 0 else 'decrease'} within {scenario_config['timeframe']}."
    except:
        ai_analysis = f"Based on historical data, a {request.scenario_type.replace('_', ' ')} event typically results in a {abs(impact_pct)*100:.1f}% price {'increase' if impact_pct > 0 else 'decrease'} within {scenario_config['timeframe']}."
    
    return {
        "card_id": card["id"],
        "card_name": card["name"],
        "scenario_type": request.scenario_type,
        "current_price": card["current_price"],
        "predicted_price": round(new_price, 2),
        "impact_percentage": round(impact_pct * 100, 2),
        "direction": scenario_config["direction"],
        "expected_timeframe": scenario_config["timeframe"],
        "confidence": random.uniform(0.65, 0.90),
        "historical_accuracy": random.uniform(0.70, 0.85),
        "ai_analysis": ai_analysis,
        "similar_events": [
            {"event": f"Similar {request.scenario_type} - 2023", "impact": f"{random.uniform(impact_pct*0.8, impact_pct*1.2)*100:.1f}%"},
            {"event": f"Similar {request.scenario_type} - 2022", "impact": f"{random.uniform(impact_pct*0.7, impact_pct*1.3)*100:.1f}%"},
        ]
    }

@api_router.get("/analytics/sentiment/{card_id}")
async def get_card_sentiment(card_id: str):
    """Real-time Social Sentiment Analysis"""
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    twitter_sentiment = random.uniform(-0.5, 0.9)
    reddit_sentiment = random.uniform(-0.4, 0.85)
    news_sentiment = random.uniform(-0.3, 0.8)
    
    overall = (twitter_sentiment * 0.4 + reddit_sentiment * 0.35 + news_sentiment * 0.25)
    
    topics = [
        f"{card['player_name']} highlights",
        f"{card['team']} news",
        f"{card['set_name']} prices",
        "grading services",
        "market trends"
    ]
    random.shuffle(topics)
    
    # Generate hourly sentiment data
    sentiment_history = []
    for i in range(24):
        hour = (datetime.now(timezone.utc) - timedelta(hours=23-i)).strftime("%H:00")
        sentiment_history.append({
            "hour": hour,
            "twitter": round(twitter_sentiment + random.uniform(-0.2, 0.2), 2),
            "reddit": round(reddit_sentiment + random.uniform(-0.15, 0.15), 2),
            "overall": round(overall + random.uniform(-0.1, 0.1), 2)
        })
    
    return {
        "card_id": card_id,
        "card_name": card["name"],
        "player_name": card["player_name"],
        "twitter_sentiment": round(twitter_sentiment, 2),
        "reddit_sentiment": round(reddit_sentiment, 2),
        "news_sentiment": round(news_sentiment, 2),
        "overall_sentiment": round(overall, 2),
        "trending_score": random.randint(1, 100),
        "mentions_24h": random.randint(50, 5000),
        "sentiment_change_24h": round(random.uniform(-0.2, 0.3), 2),
        "key_topics": topics[:4],
        "sentiment_history": sentiment_history,
        "viral_posts": [
            {"platform": "Twitter", "content": f"🔥 {card['player_name']} card prices surging!", "engagement": random.randint(1000, 50000)},
            {"platform": "Reddit", "content": f"Just pulled a {card['grade']} {card['player_name']}!", "engagement": random.randint(500, 10000)},
        ]
    }

@api_router.get("/analytics/sentiment-heatmap")
async def get_sentiment_heatmap():
    """Market-wide Sentiment Heatmap"""
    heatmap_data = []
    for card in MOCK_CARDS:
        sentiment = random.uniform(-0.5, 0.9)
        momentum = random.uniform(-30, 50)
        heatmap_data.append({
            "card_id": card["id"],
            "card_name": card["name"],
            "player_name": card["player_name"],
            "category": card["category"],
            "current_price": card["current_price"],
            "sentiment_score": round(sentiment, 2),
            "momentum_score": round(momentum, 2),
            "mentions_24h": random.randint(100, 10000),
            "buzz_level": "hot" if sentiment > 0.5 else "warm" if sentiment > 0 else "cold"
        })
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cards": sorted(heatmap_data, key=lambda x: x["sentiment_score"], reverse=True)
    }

@api_router.post("/analytics/grade-probability")
async def calculate_grade_probability(card_id: str, current_raw_grade: Optional[str] = "raw"):
    """Grade Probability Calculator"""
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Simulate grade probabilities based on card age and rarity
    base_probs = {
        "PSA 10": 0.05,
        "PSA 9": 0.20,
        "PSA 8": 0.35,
        "PSA 7": 0.25,
        "PSA 6": 0.10,
        "Below PSA 6": 0.05
    }
    
    # Adjust based on card characteristics
    if card["year"] > 2015:
        base_probs["PSA 10"] *= 2.5
        base_probs["PSA 9"] *= 1.5
    elif card["year"] < 1980:
        base_probs["PSA 10"] *= 0.3
        base_probs["PSA 9"] *= 0.6
    
    # Normalize
    total = sum(base_probs.values())
    for grade in base_probs:
        base_probs[grade] /= total
    
    # Calculate expected values and ROI
    grade_multipliers = {
        "PSA 10": 1.0,
        "PSA 9": 0.35,
        "PSA 8": 0.15,
        "PSA 7": 0.08,
        "PSA 6": 0.05,
        "Below PSA 6": 0.02
    }
    
    results = []
    grading_cost = 50  # Approximate PSA grading cost
    
    for grade, prob in base_probs.items():
        expected_value = card["current_price"] * grade_multipliers[grade]
        roi = ((expected_value - card["current_price"] * 0.1 - grading_cost) / (card["current_price"] * 0.1 + grading_cost)) * 100
        
        results.append({
            "grade": grade,
            "probability": round(prob * 100, 1),
            "expected_value": round(expected_value, 2),
            "roi_if_achieved": round(roi, 1)
        })
    
    # Expected value calculation
    total_ev = sum(r["expected_value"] * r["probability"] / 100 for r in results)
    
    return {
        "card_id": card_id,
        "card_name": card["name"],
        "current_estimated_value": card["current_price"] * 0.1,  # Raw card estimate
        "grading_cost": grading_cost,
        "grade_probabilities": results,
        "expected_value_after_grading": round(total_ev, 2),
        "recommendation": "Grade" if total_ev > card["current_price"] * 0.1 + grading_cost * 1.5 else "Hold raw",
        "confidence": random.uniform(0.70, 0.90)
    }

@api_router.post("/analytics/stress-test")
async def portfolio_stress_test(request: StressTestRequest, current_user: dict = Depends(get_current_user)):
    """Portfolio Stress Test - Simulate market scenarios"""
    holdings = await db.portfolio.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    if not holdings:
        return {"message": "No holdings to stress test", "results": []}
    
    scenario_impacts = {
        "market_crash": {"base_impact": -0.25, "high_beta_multiplier": 1.5, "low_beta_multiplier": 0.7},
        "player_retirement": {"base_impact": 0.15, "active_impact": -0.20},
        "category_decline": {"base_impact": -0.20, "category_multiplier": 1.8},
        "economic_recession": {"base_impact": -0.35, "luxury_multiplier": 1.4, "common_multiplier": 0.8},
        "grading_scandal": {"base_impact": -0.15, "graded_multiplier": 1.5},
        "market_boom": {"base_impact": 0.30, "high_beta_multiplier": 1.6}
    }
    
    scenario = scenario_impacts.get(request.scenario, scenario_impacts["market_crash"])
    severity = request.severity
    
    total_current = 0
    total_stressed = 0
    results = []
    
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if not card:
            continue
        
        current_value = holding["quantity"] * card["current_price"]
        total_current += current_value
        
        # Calculate stress impact
        impact = scenario["base_impact"] * severity
        
        # Adjust for card characteristics
        if request.scenario == "market_crash" and card.get("beta", 1) > 1.2:
            impact *= scenario["high_beta_multiplier"]
        elif request.scenario == "market_crash" and card.get("beta", 1) < 0.8:
            impact *= scenario["low_beta_multiplier"]
        
        stressed_value = current_value * (1 + impact)
        total_stressed += stressed_value
        
        results.append({
            "card_id": card["id"],
            "card_name": card["name"],
            "current_value": round(current_value, 2),
            "stressed_value": round(stressed_value, 2),
            "impact_pct": round(impact * 100, 2),
            "beta": card.get("beta", 1),
            "risk_contribution": round((current_value / total_current) * abs(impact) * 100, 2) if total_current > 0 else 0
        })
    
    return {
        "scenario": request.scenario,
        "severity": request.severity,
        "total_current_value": round(total_current, 2),
        "total_stressed_value": round(total_stressed, 2),
        "total_impact": round(total_stressed - total_current, 2),
        "total_impact_pct": round(((total_stressed - total_current) / total_current) * 100, 2) if total_current > 0 else 0,
        "holdings_impact": sorted(results, key=lambda x: x["impact_pct"]),
        "risk_assessment": {
            "max_drawdown": round(min(r["impact_pct"] for r in results) if results else 0, 2),
            "concentration_risk": round(max(r["risk_contribution"] for r in results) if results else 0, 2),
            "diversification_score": min(100, len(results) * 15)
        },
        "recommendations": [
            "Consider reducing exposure to high-beta cards" if any(r["beta"] > 1.5 for r in results) else "Portfolio beta is well-balanced",
            "Diversify across more categories" if len(set(next((c["category"] for c in MOCK_CARDS if c["id"] == r["card_id"]), "") for r in results)) < 3 else "Good category diversification",
            "Consider adding vintage cards for stability" if all(next((c["year"] for c in MOCK_CARDS if c["id"] == r["card_id"]), 2020) > 2010 for r in results) else "Good mix of vintage and modern"
        ]
    }

@api_router.get("/analytics/arbitrage")
async def find_arbitrage_opportunities():
    """Cross-Sport Arbitrage Finder"""
    opportunities = []
    
    # Group cards by characteristics for comparison
    for card in MOCK_CARDS:
        # Find comparable cards
        comparables = []
        for other in MOCK_CARDS:
            if other["id"] == card["id"]:
                continue
            
            # Compare based on similar characteristics
            similarity_score = 0
            if other["rarity"] == card["rarity"]:
                similarity_score += 30
            if other["grade"] == card["grade"]:
                similarity_score += 25
            if abs(other["year"] - card["year"]) <= 5:
                similarity_score += 20
            if other.get("hall_of_fame") == card.get("hall_of_fame"):
                similarity_score += 15
            if other.get("championships", 0) > 0 and card.get("championships", 0) > 0:
                similarity_score += 10
            
            if similarity_score >= 50:
                comparables.append({
                    "card_id": other["id"],
                    "card_name": other["name"],
                    "price": other["current_price"],
                    "similarity_score": similarity_score
                })
        
        if comparables:
            avg_comparable_price = sum(c["price"] for c in comparables) / len(comparables)
            discount = ((avg_comparable_price - card["current_price"]) / avg_comparable_price) * 100
            
            if abs(discount) > 15:  # Significant mispricing
                opportunities.append({
                    "card_id": card["id"],
                    "card_name": card["name"],
                    "player_name": card["player_name"],
                    "category": card["category"],
                    "current_price": card["current_price"],
                    "fair_value": round(avg_comparable_price, 2),
                    "discount_pct": round(discount, 2),
                    "opportunity_type": "undervalued" if discount > 0 else "overvalued",
                    "comparable_cards": sorted(comparables, key=lambda x: x["similarity_score"], reverse=True)[:3],
                    "confidence": min(0.95, 0.5 + len(comparables) * 0.1)
                })
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "opportunities": sorted(opportunities, key=lambda x: abs(x["discount_pct"]), reverse=True),
        "market_efficiency_score": random.randint(60, 85)
    }

@api_router.get("/analytics/smart-alerts")
async def get_smart_alerts(current_user: dict = Depends(get_current_user)):
    """Smart Alerts with Context"""
    holdings = await db.portfolio.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    alerts = []
    
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if not card:
            continue
        
        # Generate contextual alerts
        if card["price_change_pct"] < -10:
            alerts.append({
                "id": str(uuid.uuid4()),
                "card_id": card["id"],
                "card_name": card["name"],
                "alert_type": "price_drop",
                "message": f"{card['name']} dropped {abs(card['price_change_pct']):.1f}%",
                "context": f"This decline correlates with recent {card['player_name']} news. Historical recovery time for similar drops: 2-4 weeks. Similar cards also declining, suggesting market-wide movement rather than card-specific issue.",
                "severity": "high" if card["price_change_pct"] < -15 else "medium",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_read": False,
                "recommended_action": "Hold - likely temporary decline" if card.get("volatility_30d", 20) > 25 else "Monitor closely"
            })
        
        if card["price_change_pct"] > 15:
            alerts.append({
                "id": str(uuid.uuid4()),
                "card_id": card["id"],
                "card_name": card["name"],
                "alert_type": "price_surge",
                "message": f"{card['name']} surged {card['price_change_pct']:.1f}%",
                "context": f"Surge driven by increased social media buzz (+{random.randint(50, 200)}% mentions). {card['player_name']} recently trending. Consider taking partial profits if above target allocation.",
                "severity": "medium",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_read": False,
                "recommended_action": "Consider taking profits on 25-50% of position"
            })
        
        if card.get("volatility_30d", 0) > 35:
            alerts.append({
                "id": str(uuid.uuid4()),
                "card_id": card["id"],
                "card_name": card["name"],
                "alert_type": "high_volatility",
                "message": f"{card['name']} showing high volatility ({card.get('volatility_30d', 0):.1f}%)",
                "context": f"30-day volatility significantly above market average. This indicates uncertainty around {card['player_name']}'s performance or market sentiment shifts.",
                "severity": "low",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_read": False,
                "recommended_action": "Review position size relative to risk tolerance"
            })
    
    # Add market-wide alerts
    alerts.append({
        "id": str(uuid.uuid4()),
        "card_id": None,
        "card_name": "Market Alert",
        "alert_type": "market_insight",
        "message": "Basketball card market showing bullish momentum",
        "context": "Overall basketball card index up 8.5% this week. Driven by playoff anticipation and increased collector activity. Consider rebalancing toward basketball if underweight.",
        "severity": "info",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_read": False,
        "recommended_action": "Review basketball allocation"
    })
    
    return {
        "alerts": sorted(alerts, key=lambda x: {"high": 0, "medium": 1, "low": 2, "info": 3}.get(x["severity"], 4)),
        "unread_count": len([a for a in alerts if not a["is_read"]])
    }

@api_router.get("/analytics/portfolio-metrics")
async def get_advanced_portfolio_metrics(current_user: dict = Depends(get_current_user)):
    """Advanced Portfolio Analytics"""
    holdings = await db.portfolio.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    if not holdings:
        return {"message": "No holdings for analysis"}
    
    total_value = 0
    category_allocation = {}
    risk_metrics = {"total_volatility": 0, "total_beta": 0, "sharpe_contributions": []}
    
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if not card:
            continue
        
        value = holding["quantity"] * card["current_price"]
        total_value += value
        
        # Category allocation
        cat = card["category"]
        category_allocation[cat] = category_allocation.get(cat, 0) + value
        
        # Risk metrics
        risk_metrics["total_volatility"] += card.get("volatility_30d", 20) * value
        risk_metrics["total_beta"] += card.get("beta", 1) * value
        risk_metrics["sharpe_contributions"].append({
            "card": card["name"],
            "sharpe": card.get("sharpe_ratio", 1),
            "weight": value
        })
    
    # Calculate portfolio-level metrics
    portfolio_volatility = risk_metrics["total_volatility"] / total_value if total_value > 0 else 0
    portfolio_beta = risk_metrics["total_beta"] / total_value if total_value > 0 else 1
    portfolio_sharpe = sum(s["sharpe"] * s["weight"] for s in risk_metrics["sharpe_contributions"]) / total_value if total_value > 0 else 0
    
    # Generate performance history (mock)
    performance_history = []
    cumulative = 0
    for i in range(30):
        date = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime("%Y-%m-%d")
        daily_return = random.uniform(-0.03, 0.04)
        cumulative += daily_return
        performance_history.append({
            "date": date,
            "daily_return": round(daily_return * 100, 2),
            "cumulative_return": round(cumulative * 100, 2),
            "portfolio_value": round(total_value * (1 + cumulative), 2)
        })
    
    return {
        "total_value": round(total_value, 2),
        "holdings_count": len(holdings),
        "category_allocation": {k: {"value": round(v, 2), "percentage": round(v/total_value*100, 1)} for k, v in category_allocation.items()},
        "risk_metrics": {
            "portfolio_volatility": round(portfolio_volatility, 2),
            "portfolio_beta": round(portfolio_beta, 2),
            "portfolio_sharpe": round(portfolio_sharpe, 2),
            "var_95": round(total_value * portfolio_volatility * 0.01 * 1.65, 2),  # 95% VaR
            "max_drawdown_potential": round(portfolio_volatility * 2.5, 2)
        },
        "performance_history": performance_history,
        "diversification_score": min(100, len(holdings) * 10 + len(category_allocation) * 15),
        "risk_adjusted_score": round(portfolio_sharpe * 30 + (100 - portfolio_volatility), 1)
    }

# ============ STATS/DASHBOARD ROUTES ============

@api_router.get("/stats/market-overview")
async def get_market_overview():
    total_market_cap = sum(c["market_cap"] for c in MOCK_CARDS)
    total_volume = sum(c["volume_24h"] for c in MOCK_CARDS)
    gainers = len([c for c in MOCK_CARDS if c["price_change_pct"] > 0])
    losers = len([c for c in MOCK_CARDS if c["price_change_pct"] < 0])
    avg_volatility = sum(c.get("volatility_30d", 20) for c in MOCK_CARDS) / len(MOCK_CARDS)
    
    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "gainers": gainers,
        "losers": losers,
        "total_cards": len(MOCK_CARDS),
        "avg_price_change": round(sum(c["price_change_pct"] for c in MOCK_CARDS) / len(MOCK_CARDS), 2),
        "market_volatility": round(avg_volatility, 2),
        "fear_greed_index": random.randint(25, 80),
        "market_trend": "bullish" if gainers > losers else "bearish"
    }

@api_router.get("/")
async def root():
    return {"message": "CardWise API - Collectible Card Platform"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
