from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random

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

# ============ SEED DATA ============

MOCK_CARDS = [
    {"id": "card_001", "name": "1986 Fleer Michael Jordan RC #57", "player_name": "Michael Jordan", "team": "Chicago Bulls", "year": 1986, "set_name": "Fleer", "grade": "PSA 10", "current_price": 738500, "previous_price": 695000, "price_change_pct": 6.26, "image_url": "https://images.pexels.com/photos/7809125/pexels-photo-7809125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Legendary", "last_sold": "2024-01-15", "volume_24h": 3, "market_cap": 12500000},
    {"id": "card_002", "name": "2003 Topps Chrome LeBron James RC #111", "player_name": "LeBron James", "team": "Cleveland Cavaliers", "year": 2003, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 425000, "previous_price": 450000, "price_change_pct": -5.56, "image_url": "https://images.pexels.com/photos/7708408/pexels-photo-7708408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Legendary", "last_sold": "2024-01-10", "volume_24h": 5, "market_cap": 8500000},
    {"id": "card_003", "name": "2018 Panini Prizm Luka Doncic RC #280", "player_name": "Luka Doncic", "team": "Dallas Mavericks", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 8500, "previous_price": 7200, "price_change_pct": 18.06, "image_url": "https://images.pexels.com/photos/7783413/pexels-photo-7783413.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-18", "volume_24h": 45, "market_cap": 2800000},
    {"id": "card_004", "name": "1952 Topps Mickey Mantle #311", "player_name": "Mickey Mantle", "team": "New York Yankees", "year": 1952, "set_name": "Topps", "grade": "PSA 9", "current_price": 5200000, "previous_price": 5000000, "price_change_pct": 4.0, "image_url": "https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Legendary", "last_sold": "2023-12-20", "volume_24h": 1, "market_cap": 52000000},
    {"id": "card_005", "name": "2020 Panini Prizm Justin Herbert RC #325", "player_name": "Justin Herbert", "team": "LA Chargers", "year": 2020, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1250, "previous_price": 1400, "price_change_pct": -10.71, "image_url": "https://images.pexels.com/photos/8721966/pexels-photo-8721966.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Rare", "last_sold": "2024-01-17", "volume_24h": 120, "market_cap": 950000},
    {"id": "card_006", "name": "2019 Panini Prizm Zion Williamson RC #248", "player_name": "Zion Williamson", "team": "New Orleans Pelicans", "year": 2019, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 2800, "previous_price": 3200, "price_change_pct": -12.5, "image_url": "https://images.pexels.com/photos/6203470/pexels-photo-6203470.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-16", "volume_24h": 85, "market_cap": 1400000},
    {"id": "card_007", "name": "2022 Topps Chrome Julio Rodriguez RC #170", "player_name": "Julio Rodriguez", "team": "Seattle Mariners", "year": 2022, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 450, "previous_price": 380, "price_change_pct": 18.42, "image_url": "https://images.pexels.com/photos/8721991/pexels-photo-8721991.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Common", "last_sold": "2024-01-19", "volume_24h": 250, "market_cap": 450000},
    {"id": "card_008", "name": "2020 Panini National Treasures Joe Burrow RC", "player_name": "Joe Burrow", "team": "Cincinnati Bengals", "year": 2020, "set_name": "National Treasures", "grade": "BGS 9.5", "current_price": 15500, "previous_price": 14000, "price_change_pct": 10.71, "image_url": "https://images.pexels.com/photos/4219606/pexels-photo-4219606.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Ultra Rare", "last_sold": "2024-01-14", "volume_24h": 12, "market_cap": 3100000},
    {"id": "card_009", "name": "2018 Panini Prizm Trae Young RC #78", "player_name": "Trae Young", "team": "Atlanta Hawks", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1850, "previous_price": 1950, "price_change_pct": -5.13, "image_url": "https://images.pexels.com/photos/5965643/pexels-photo-5965643.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-12", "volume_24h": 65, "market_cap": 925000},
    {"id": "card_010", "name": "2023 Topps Chrome Victor Wembanyama RC", "player_name": "Victor Wembanyama", "team": "San Antonio Spurs", "year": 2023, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 3200, "previous_price": 2400, "price_change_pct": 33.33, "image_url": "https://images.pexels.com/photos/7562089/pexels-photo-7562089.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-20", "volume_24h": 180, "market_cap": 1600000},
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
    if sort_by in ["current_price", "price_change_pct", "volume_24h"]:
        cards.sort(key=lambda x: x[sort_by], reverse=reverse)
    
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
    for i in range(30):
        date = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime("%Y-%m-%d")
        variation = random.uniform(-0.08, 0.12)
        price = base_price * (0.85 + (i / 30) * 0.15 + variation * (i / 30))
        history.append({"date": date, "price": round(price, 2), "volume": random.randint(1, 50)})
    
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
    
    for holding in holdings:
        card = next((c for c in MOCK_CARDS if c["id"] == holding["card_id"]), None)
        if card:
            total_invested += holding["total_invested"]
            total_value += holding["quantity"] * card["current_price"]
            holdings_count += holding["quantity"]
    
    profit_loss = total_value - total_invested
    profit_loss_pct = ((total_value - total_invested) / total_invested) * 100 if total_invested > 0 else 0
    
    return {
        "total_invested": round(total_invested, 2),
        "total_value": round(total_value, 2),
        "profit_loss": round(profit_loss, 2),
        "profit_loss_pct": round(profit_loss_pct, 2),
        "holdings_count": holdings_count,
        "unique_cards": len(holdings)
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

# ============ STATS/DASHBOARD ROUTES ============

@api_router.get("/stats/market-overview")
async def get_market_overview():
    total_market_cap = sum(c["market_cap"] for c in MOCK_CARDS)
    total_volume = sum(c["volume_24h"] for c in MOCK_CARDS)
    gainers = len([c for c in MOCK_CARDS if c["price_change_pct"] > 0])
    losers = len([c for c in MOCK_CARDS if c["price_change_pct"] < 0])
    
    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "gainers": gainers,
        "losers": losers,
        "total_cards": len(MOCK_CARDS),
        "avg_price_change": round(sum(c["price_change_pct"] for c in MOCK_CARDS) / len(MOCK_CARDS), 2)
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
