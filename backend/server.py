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
import httpx

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

# CardSight API Config
CARDSIGHT_API_KEY = os.environ.get('CARDSIGHT_API_KEY', '')
CARDSIGHT_BASE_URL = "https://api.cardsight.ai/v1"

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

# Watchlist Models
class WatchlistItem(BaseModel):
    id: str
    user_id: str
    card_id: str
    added_at: str
    price_at_add: float
    target_price_high: Optional[float] = None
    target_price_low: Optional[float] = None
    alert_enabled: bool = True
    notes: Optional[str] = None

class AddToWatchlistRequest(BaseModel):
    card_id: str
    target_price_high: Optional[float] = None
    target_price_low: Optional[float] = None
    notes: Optional[str] = None

class UpdateWatchlistAlertRequest(BaseModel):
    target_price_high: Optional[float] = None
    target_price_low: Optional[float] = None
    alert_enabled: Optional[bool] = None
    notes: Optional[str] = None

# Player Performance / Earnings Models
class GamePerformance(BaseModel):
    date: str
    opponent: str
    points: Optional[int] = None
    rebounds: Optional[int] = None
    assists: Optional[int] = None
    home_runs: Optional[int] = None
    hits: Optional[int] = None
    touchdowns: Optional[int] = None
    passing_yards: Optional[int] = None
    result: str  # W/L
    impact_score: float  # -100 to 100

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
    {"id": "card_002", "name": "2003 Topps Chrome LeBron James RC #111", "player_name": "LeBron James", "team": "Los Angeles Lakers", "year": 2003, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 425000, "previous_price": 450000, "price_change_pct": -5.56, "image_url": "https://images.pexels.com/photos/7708408/pexels-photo-7708408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Legendary", "last_sold": "2024-01-10", "volume_24h": 5, "market_cap": 8500000, "volatility_30d": 18.2, "sharpe_ratio": 1.2, "beta": 1.15, "correlation_market": 0.68, "player_status": "active", "hall_of_fame": False, "championships": 4},
    {"id": "card_003", "name": "2018 Panini Prizm Luka Doncic RC #280", "player_name": "Luka Doncic", "team": "Los Angeles Lakers", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 8500, "previous_price": 7200, "price_change_pct": 18.06, "image_url": "https://images.pexels.com/photos/7783413/pexels-photo-7783413.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-18", "volume_24h": 45, "market_cap": 2800000, "volatility_30d": 28.5, "sharpe_ratio": 2.1, "beta": 1.45, "correlation_market": 0.58, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_004", "name": "1952 Topps Mickey Mantle #311", "player_name": "Mickey Mantle", "team": "New York Yankees", "year": 1952, "set_name": "Topps", "grade": "PSA 9", "current_price": 5200000, "previous_price": 5000000, "price_change_pct": 4.0, "image_url": "https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Legendary", "last_sold": "2023-12-20", "volume_24h": 1, "market_cap": 52000000, "volatility_30d": 8.2, "sharpe_ratio": 2.5, "beta": 0.45, "correlation_market": 0.82, "player_status": "deceased", "hall_of_fame": True, "championships": 7},
    {"id": "card_005", "name": "2020 Panini Prizm Justin Herbert RC #325", "player_name": "Justin Herbert", "team": "LA Chargers", "year": 2020, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1250, "previous_price": 1400, "price_change_pct": -10.71, "image_url": "https://images.pexels.com/photos/8721966/pexels-photo-8721966.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Rare", "last_sold": "2024-01-17", "volume_24h": 120, "market_cap": 950000, "volatility_30d": 32.1, "sharpe_ratio": 0.8, "beta": 1.65, "correlation_market": 0.52, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_006", "name": "2019 Panini Prizm Zion Williamson RC #248", "player_name": "Zion Williamson", "team": "New Orleans Pelicans", "year": 2019, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 2800, "previous_price": 3200, "price_change_pct": -12.5, "image_url": "https://images.pexels.com/photos/6203470/pexels-photo-6203470.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-16", "volume_24h": 85, "market_cap": 1400000, "volatility_30d": 42.3, "sharpe_ratio": 0.4, "beta": 1.85, "correlation_market": 0.45, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_007", "name": "2022 Topps Chrome Julio Rodriguez RC #170", "player_name": "Julio Rodriguez", "team": "Seattle Mariners", "year": 2022, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 450, "previous_price": 380, "price_change_pct": 18.42, "image_url": "https://images.pexels.com/photos/8721991/pexels-photo-8721991.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Baseball", "rarity": "Common", "last_sold": "2024-01-19", "volume_24h": 250, "market_cap": 450000, "volatility_30d": 25.6, "sharpe_ratio": 1.9, "beta": 1.25, "correlation_market": 0.55, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_008", "name": "2020 Panini National Treasures Joe Burrow RC", "player_name": "Joe Burrow", "team": "Cincinnati Bengals", "year": 2020, "set_name": "National Treasures", "grade": "BGS 9.5", "current_price": 15500, "previous_price": 14000, "price_change_pct": 10.71, "image_url": "https://images.pexels.com/photos/4219606/pexels-photo-4219606.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Football", "rarity": "Ultra Rare", "last_sold": "2024-01-14", "volume_24h": 12, "market_cap": 3100000, "volatility_30d": 22.8, "sharpe_ratio": 1.6, "beta": 1.35, "correlation_market": 0.62, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_009", "name": "2018 Panini Prizm Trae Young RC #78", "player_name": "Trae Young", "team": "Washington Wizards", "year": 2018, "set_name": "Panini Prizm", "grade": "PSA 10", "current_price": 1850, "previous_price": 1950, "price_change_pct": -5.13, "image_url": "https://images.pexels.com/photos/5965643/pexels-photo-5965643.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Rare", "last_sold": "2024-01-12", "volume_24h": 65, "market_cap": 925000, "volatility_30d": 29.4, "sharpe_ratio": 1.1, "beta": 1.42, "correlation_market": 0.48, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_010", "name": "2023 Topps Chrome Victor Wembanyama RC", "player_name": "Victor Wembanyama", "team": "San Antonio Spurs", "year": 2023, "set_name": "Topps Chrome", "grade": "PSA 10", "current_price": 3200, "previous_price": 2400, "price_change_pct": 33.33, "image_url": "https://images.pexels.com/photos/7562089/pexels-photo-7562089.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Basketball", "rarity": "Ultra Rare", "last_sold": "2024-01-20", "volume_24h": 180, "market_cap": 1600000, "volatility_30d": 45.2, "sharpe_ratio": 2.8, "beta": 1.95, "correlation_market": 0.38, "player_status": "active", "hall_of_fame": False, "championships": 0},
    # NHL Cards
    {"id": "card_011", "name": "2015 Upper Deck Young Guns Connor McDavid RC #201", "player_name": "Connor McDavid", "team": "Edmonton Oilers", "year": 2015, "set_name": "Upper Deck", "grade": "PSA 10", "current_price": 95000, "previous_price": 88000, "price_change_pct": 7.95, "image_url": "https://images.pexels.com/photos/2570139/pexels-photo-2570139.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Hockey", "rarity": "Legendary", "last_sold": "2024-01-18", "volume_24h": 8, "market_cap": 4750000, "volatility_30d": 15.3, "sharpe_ratio": 2.2, "beta": 0.92, "correlation_market": 0.65, "player_status": "active", "hall_of_fame": False, "championships": 0},
    {"id": "card_012", "name": "2019 Upper Deck Young Guns Cale Makar RC #493", "player_name": "Cale Makar", "team": "Colorado Avalanche", "year": 2019, "set_name": "Upper Deck", "grade": "PSA 10", "current_price": 4200, "previous_price": 3800, "price_change_pct": 10.53, "image_url": "https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Hockey", "rarity": "Ultra Rare", "last_sold": "2024-01-16", "volume_24h": 25, "market_cap": 1260000, "volatility_30d": 20.1, "sharpe_ratio": 1.7, "beta": 1.12, "correlation_market": 0.58, "player_status": "active", "hall_of_fame": False, "championships": 1},
    {"id": "card_013", "name": "2023 Upper Deck Young Guns Connor Bedard RC", "player_name": "Connor Bedard", "team": "Chicago Blackhawks", "year": 2023, "set_name": "Upper Deck", "grade": "PSA 10", "current_price": 1800, "previous_price": 1500, "price_change_pct": 20.0, "image_url": "https://images.pexels.com/photos/2254115/pexels-photo-2254115.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "category": "Hockey", "rarity": "Rare", "last_sold": "2024-01-20", "volume_24h": 95, "market_cap": 720000, "volatility_30d": 38.5, "sharpe_ratio": 2.4, "beta": 1.75, "correlation_market": 0.42, "player_status": "active", "hall_of_fame": False, "championships": 0},
]

# ============ PLAYER PERFORMANCE ENGINE ============
import random as _rng
import hashlib

def _seed_rng(card_id: str, game_idx: int, field: str = ""):
    """Deterministic random based on card + game index so data is consistent across requests"""
    seed_str = f"{card_id}_{game_idx}_{field}"
    return int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)

def _det_rand(card_id: str, game_idx: int, field: str, low: float, high: float) -> float:
    s = _seed_rng(card_id, game_idx, field)
    return low + (s % 10000) / 10000 * (high - low)

def _det_int(card_id: str, game_idx: int, field: str, low: int, high: int) -> int:
    return int(_det_rand(card_id, game_idx, field, low, high))

NBA_TEAMS = ["BOS","NYK","MIL","PHI","CLE","ORL","IND","MIA","CHI","ATL","BKN","TOR","DET","WAS","CHA",
             "DEN","OKC","MIN","LAC","DAL","PHX","SAC","HOU","NOP","LAL","GSW","MEM","SAS","UTA","POR"]
MLB_TEAMS = ["NYY","LAD","HOU","ATL","TB","BAL","TEX","MIN","SD","PHI","ARI","MIL","CIN","SEA","TOR",
             "BOS","CLE","SF","STL","CHC","MIA","KC","DET","PIT","COL","WSH","NYM","CWS","LAA","OAK"]
NFL_TEAMS = ["KC","BUF","BAL","MIA","DAL","SF","DET","PHI","CIN","JAX","CLE","HOU","IND","PIT","LAR",
             "SEA","MIN","GB","TB","NO","ATL","CAR","CHI","NYG","NYJ","WAS","LV","DEN","LAC","ARI","NE","TEN"]
NHL_TEAMS = ["EDM","COL","DAL","WPG","VAN","NSH","LAK","VGK","CAR","NYR","FLA","BOS","TOR","TBL","NJD",
             "OTT","DET","PIT","WSH","PHI","BUF","MTL","NYI","CBJ","MIN","STL","CHI","ARI","SJS","ANA","CGY","SEA"]

PLAYER_BASELINES = {
    "card_001": {"sport": "nba", "minutes": 0, "ppg": 0, "rpg": 0, "apg": 0},  # Jordan retired
    "card_002": {"sport": "nba", "minutes": 33, "ppg": 25.2, "rpg": 7.1, "apg": 8.0, "trend": "declining"},
    "card_003": {"sport": "nba", "minutes": 36, "ppg": 28.8, "rpg": 8.3, "apg": 9.5, "trend": "rising"},
    "card_004": {"sport": "mlb", "minutes": 0, "ab": 0},  # Mantle deceased
    "card_005": {"sport": "nfl", "pass_yds": 285, "pass_td": 2.1, "rush_yds": 22, "trend": "declining"},
    "card_006": {"sport": "nba", "minutes": 30, "ppg": 22.5, "rpg": 5.8, "apg": 4.2, "trend": "inconsistent"},
    "card_007": {"sport": "mlb", "ab": 4.2, "avg": 0.282, "hr_rate": 0.065, "rbi_rate": 0.22, "trend": "rising"},
    "card_008": {"sport": "nfl", "pass_yds": 268, "pass_td": 1.9, "rush_yds": 15, "trend": "rising"},
    "card_009": {"sport": "nba", "minutes": 35, "ppg": 26.3, "rpg": 3.2, "apg": 10.8, "trend": "stable"},
    "card_010": {"sport": "nba", "minutes": 32, "ppg": 22.8, "rpg": 10.5, "apg": 3.8, "trend": "rising"},
    "card_011": {"sport": "nhl", "toi": 22.5, "goals_rate": 0.45, "assists_rate": 0.75, "shots": 4.2, "trend": "rising"},
    "card_012": {"sport": "nhl", "toi": 25.0, "goals_rate": 0.22, "assists_rate": 0.55, "shots": 3.1, "trend": "stable"},
    "card_013": {"sport": "nhl", "toi": 18.5, "goals_rate": 0.32, "assists_rate": 0.42, "shots": 3.5, "trend": "rising"},
}

def generate_nba_game(card_id: str, idx: int, baseline: dict, trend_factor: float):
    teams = [t for t in NBA_TEAMS]
    opp = teams[_det_int(card_id, idx, "opp", 0, len(teams))]
    mins = max(10, baseline["minutes"] + _det_rand(card_id, idx, "mins", -8, 8) + trend_factor * 2)
    min_factor = mins / max(1, baseline["minutes"])
    pts = max(0, round(baseline["ppg"] * min_factor + _det_rand(card_id, idx, "pts", -10, 10)))
    reb = max(0, round(baseline["rpg"] * min_factor + _det_rand(card_id, idx, "reb", -4, 4)))
    ast = max(0, round(baseline["apg"] * min_factor + _det_rand(card_id, idx, "ast", -4, 4)))
    stl = max(0, _det_int(card_id, idx, "stl", 0, 4))
    blk = max(0, _det_int(card_id, idx, "blk", 0, 3))
    fg_pct = max(20, min(75, 45 + _det_rand(card_id, idx, "fg", -15, 15)))
    three_pct = max(10, min(65, 35 + _det_rand(card_id, idx, "3p", -20, 20)))
    won = _det_rand(card_id, idx, "win", 0, 1) > 0.45
    # Impact score: big game = high pts + efficiency + minutes
    impact = ((pts - baseline["ppg"]) / max(1, baseline["ppg"])) * 40 + ((mins - baseline["minutes"]) / max(1, baseline["minutes"])) * 20 + (10 if won else -5)
    return {
        "sport": "NBA", "opponent": opp, "minutes": round(mins, 1),
        "points": pts, "rebounds": reb, "assists": ast, "steals": stl, "blocks": blk,
        "fg_pct": round(fg_pct, 1), "three_pt_pct": round(three_pct, 1),
        "result": "W" if won else "L", "impact_score": round(max(-100, min(100, impact)), 1),
    }

def generate_mlb_game(card_id: str, idx: int, baseline: dict, trend_factor: float):
    teams = [t for t in MLB_TEAMS]
    opp = teams[_det_int(card_id, idx, "opp", 0, len(teams))]
    ab = max(2, round(baseline["ab"] + _det_rand(card_id, idx, "ab", -1, 1)))
    avg_adj = baseline["avg"] + trend_factor * 0.01
    hits = sum(1 for j in range(ab) if _det_rand(card_id, idx, f"hit{j}", 0, 1) < avg_adj)
    hr = sum(1 for j in range(ab) if _det_rand(card_id, idx, f"hr{j}", 0, 1) < baseline["hr_rate"] * (1 + trend_factor * 0.1))
    rbi = max(hr, round(ab * baseline["rbi_rate"] + _det_rand(card_id, idx, "rbi", -1, 2)))
    runs = max(0, _det_int(card_id, idx, "runs", 0, 3))
    sb = 1 if _det_rand(card_id, idx, "sb", 0, 1) > 0.85 else 0
    won = _det_rand(card_id, idx, "win", 0, 1) > 0.48
    impact = ((hits / max(1, ab) - baseline["avg"]) / max(0.01, baseline["avg"])) * 30 + hr * 25 + rbi * 8
    return {
        "sport": "MLB", "opponent": opp, "at_bats": ab, "hits": hits,
        "home_runs": hr, "rbi": rbi, "runs": runs, "stolen_bases": sb,
        "batting_avg": round(hits / max(1, ab), 3),
        "result": "W" if won else "L", "impact_score": round(max(-100, min(100, impact)), 1),
    }

def generate_nfl_game(card_id: str, idx: int, baseline: dict, trend_factor: float):
    teams = [t for t in NFL_TEAMS]
    opp = teams[_det_int(card_id, idx, "opp", 0, len(teams))]
    pass_yds = max(100, round(baseline["pass_yds"] + _det_rand(card_id, idx, "pyds", -80, 80) + trend_factor * 20))
    pass_td = max(0, round(baseline["pass_td"] + _det_rand(card_id, idx, "ptd", -1.5, 1.5)))
    rush_yds = max(0, round(baseline["rush_yds"] + _det_rand(card_id, idx, "ryds", -15, 25)))
    ints = max(0, _det_int(card_id, idx, "int", 0, 3))
    comp_pct = max(50, min(80, 65 + _det_rand(card_id, idx, "cmp", -12, 12)))
    passer_rating = max(50, min(158, 90 + _det_rand(card_id, idx, "pr", -30, 40)))
    won = _det_rand(card_id, idx, "win", 0, 1) > 0.48
    impact = ((pass_yds - baseline["pass_yds"]) / max(1, baseline["pass_yds"])) * 25 + pass_td * 15 - ints * 20
    return {
        "sport": "NFL", "opponent": opp, "passing_yards": pass_yds,
        "passing_tds": pass_td, "interceptions": ints, "rushing_yards": rush_yds,
        "completion_pct": round(comp_pct, 1), "passer_rating": round(passer_rating, 1),
        "result": "W" if won else "L", "impact_score": round(max(-100, min(100, impact)), 1),
    }

def generate_nhl_game(card_id: str, idx: int, baseline: dict, trend_factor: float):
    teams = [t for t in NHL_TEAMS]
    opp = teams[_det_int(card_id, idx, "opp", 0, len(teams))]
    toi = max(12, round(baseline["toi"] + _det_rand(card_id, idx, "toi", -4, 4) + trend_factor * 1.5, 1))
    goals = 1 if _det_rand(card_id, idx, "goal", 0, 1) < baseline["goals_rate"] * (1 + trend_factor * 0.15) else 0
    if _det_rand(card_id, idx, "goal2", 0, 1) < baseline["goals_rate"] * 0.3:
        goals += 1  # Multi-goal game chance
    assists = 1 if _det_rand(card_id, idx, "ast", 0, 1) < baseline["assists_rate"] * (1 + trend_factor * 0.1) else 0
    if _det_rand(card_id, idx, "ast2", 0, 1) < baseline["assists_rate"] * 0.25:
        assists += 1
    shots = max(1, round(baseline["shots"] + _det_rand(card_id, idx, "shots", -2, 2)))
    plus_minus = _det_int(card_id, idx, "pm", -3, 3)
    hits_game = _det_int(card_id, idx, "hits", 0, 5)
    won = _det_rand(card_id, idx, "win", 0, 1) > 0.47
    impact = goals * 30 + assists * 15 + ((toi - baseline["toi"]) / max(1, baseline["toi"])) * 20 + plus_minus * 5
    return {
        "sport": "NHL", "opponent": opp, "ice_time": f"{int(toi)}:{int((toi % 1) * 60):02d}",
        "goals": goals, "assists": assists, "points": goals + assists,
        "shots": shots, "plus_minus": plus_minus, "hits": hits_game,
        "result": "W" if won else "L", "impact_score": round(max(-100, min(100, impact)), 1),
    }

def generate_player_performance(card_id: str) -> dict:
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        return None
    baseline = PLAYER_BASELINES.get(card_id)
    if not baseline:
        return None

    sport = baseline["sport"]
    status = card.get("player_status", "active")
    
    # Retired/deceased players don't have current game data
    if status in ["retired", "deceased"]:
        return {
            "card_id": card_id, "player_name": card["player_name"], "team": card["team"],
            "sport": sport.upper(), "category": card["category"], "status": status,
            "has_current_data": False,
            "legacy_note": f"{card['player_name']} is {'retired' if status == 'retired' else 'no longer active'}. Card value driven by legacy, scarcity, and collector demand.",
            "career_highlights": {"championships": card.get("championships", 0), "hall_of_fame": card.get("hall_of_fame", False)},
            "performance_impact_on_value": "minimal",
            "game_log": [], "trends": {}, "streak": None,
        }

    trend = baseline.get("trend", "stable")
    trend_map = {"rising": 1.0, "declining": -1.0, "stable": 0.0, "inconsistent": 0.0}
    trend_base = trend_map.get(trend, 0.0)

    # Generate 20 game logs with progressive trend
    games = []
    today = datetime.now(timezone.utc)
    gen_fn = {"nba": generate_nba_game, "mlb": generate_mlb_game, "nfl": generate_nfl_game, "nhl": generate_nhl_game}[sport]
    
    for i in range(20):
        # Trend increases as games get more recent
        game_trend = trend_base * (0.3 + (i / 20) * 0.7)
        # Add some randomness for "inconsistent"
        if trend == "inconsistent":
            game_trend = 0.8 if i % 3 == 0 else -0.6
        
        game = gen_fn(card_id, i, baseline, game_trend)
        game_date = today - timedelta(days=(19 - i) * (2 if sport in ["nba", "nhl"] else 1 if sport == "mlb" else 7))
        game["date"] = game_date.strftime("%Y-%m-%d")
        game["game_number"] = i + 1
        games.append(game)

    # Calculate trends
    first_half = games[:10]
    second_half = games[10:]
    
    def avg_field(game_list, field):
        vals = [g.get(field, 0) for g in game_list if g.get(field) is not None]
        return sum(vals) / max(1, len(vals))
    
    trends = {}
    if sport == "nba":
        trends = {
            "minutes": {"first_10": round(avg_field(first_half, "minutes"), 1), "last_10": round(avg_field(second_half, "minutes"), 1)},
            "scoring": {"first_10": round(avg_field(first_half, "points"), 1), "last_10": round(avg_field(second_half, "points"), 1)},
            "rebounds": {"first_10": round(avg_field(first_half, "rebounds"), 1), "last_10": round(avg_field(second_half, "rebounds"), 1)},
            "assists": {"first_10": round(avg_field(first_half, "assists"), 1), "last_10": round(avg_field(second_half, "assists"), 1)},
            "efficiency": {"first_10": round(avg_field(first_half, "fg_pct"), 1), "last_10": round(avg_field(second_half, "fg_pct"), 1)},
        }
    elif sport == "mlb":
        trends = {
            "batting_avg": {"first_10": round(avg_field(first_half, "batting_avg"), 3), "last_10": round(avg_field(second_half, "batting_avg"), 3)},
            "home_runs": {"first_10": round(avg_field(first_half, "home_runs"), 2), "last_10": round(avg_field(second_half, "home_runs"), 2)},
            "rbi": {"first_10": round(avg_field(first_half, "rbi"), 1), "last_10": round(avg_field(second_half, "rbi"), 1)},
        }
    elif sport == "nfl":
        trends = {
            "passing_yards": {"first_10": round(avg_field(first_half, "passing_yards"), 0), "last_10": round(avg_field(second_half, "passing_yards"), 0)},
            "passing_tds": {"first_10": round(avg_field(first_half, "passing_tds"), 1), "last_10": round(avg_field(second_half, "passing_tds"), 1)},
            "passer_rating": {"first_10": round(avg_field(first_half, "passer_rating"), 1), "last_10": round(avg_field(second_half, "passer_rating"), 1)},
        }
    elif sport == "nhl":
        trends = {
            "goals": {"first_10": round(avg_field(first_half, "goals"), 2), "last_10": round(avg_field(second_half, "goals"), 2)},
            "assists": {"first_10": round(avg_field(first_half, "assists"), 2), "last_10": round(avg_field(second_half, "assists"), 2)},
            "points": {"first_10": round(avg_field(first_half, "points"), 2), "last_10": round(avg_field(second_half, "points"), 2)},
            "shots": {"first_10": round(avg_field(first_half, "shots"), 1), "last_10": round(avg_field(second_half, "shots"), 1)},
        }

    # Add direction to each trend
    for key in trends:
        f10 = trends[key]["first_10"]
        l10 = trends[key]["last_10"]
        if f10 == 0:
            pct_change = 0
        else:
            pct_change = round(((l10 - f10) / abs(f10)) * 100, 1)
        trends[key]["change_pct"] = pct_change
        trends[key]["direction"] = "up" if pct_change > 3 else ("down" if pct_change < -3 else "flat")

    # Streak detection
    last_5 = games[-5:]
    last_5_impact = [g["impact_score"] for g in last_5]
    avg_impact = sum(last_5_impact) / 5
    hot_games = sum(1 for x in last_5_impact if x > 15)
    cold_games = sum(1 for x in last_5_impact if x < -15)
    
    if hot_games >= 3:
        streak = {"type": "hot", "games": hot_games, "label": f"{hot_games}-game hot streak", "description": "Performing significantly above average recently"}
    elif cold_games >= 3:
        streak = {"type": "cold", "games": cold_games, "label": f"{cold_games}-game cold streak", "description": "Underperforming compared to season averages"}
    else:
        streak = {"type": "neutral", "games": 0, "label": "Consistent", "description": "Playing near expected levels"}

    # Performance Impact on Card Value
    impact_score = avg_impact
    for key in trends:
        d = trends[key].get("direction", "flat")
        if d == "up":
            impact_score += 5
        elif d == "down":
            impact_score -= 5

    if impact_score > 15:
        performance_impact = "strongly_bullish"
        impact_label = "Performance is driving card value UP"
    elif impact_score > 5:
        performance_impact = "bullish"
        impact_label = "Positive on-field trends support value"
    elif impact_score < -15:
        performance_impact = "strongly_bearish"
        impact_label = "Declining performance is hurting card value"
    elif impact_score < -5:
        performance_impact = "bearish"
        impact_label = "On-field concerns may pressure value"
    else:
        performance_impact = "neutral"
        impact_label = "Performance has minimal impact currently"

    # Season averages
    season_avgs = {}
    for field in games[0]:
        if isinstance(games[0][field], (int, float)) and field not in ["game_number", "impact_score"]:
            vals = [g[field] for g in games]
            season_avgs[field] = round(sum(vals) / len(vals), 2)

    return {
        "card_id": card_id, "player_name": card["player_name"], "team": card["team"],
        "sport": sport.upper(), "category": card["category"], "status": status,
        "has_current_data": True,
        "season_averages": season_avgs,
        "game_log": games,
        "trends": trends,
        "streak": streak,
        "performance_impact": performance_impact,
        "performance_impact_label": impact_label,
        "performance_impact_score": round(impact_score, 1),
        "trend_direction": trend,
    }

@api_router.get("/players/{card_id}/performance")
async def get_player_performance(card_id: str):
    result = generate_player_performance(card_id)
    if not result:
        raise HTTPException(status_code=404, detail="Card not found or no performance data")
    return result

@api_router.get("/players/performance/all")
async def get_all_player_performance():
    """Get performance summaries for all active players"""
    results = []
    for card in MOCK_CARDS:
        perf = generate_player_performance(card["id"])
        if perf and perf.get("has_current_data"):
            results.append({
                "card_id": perf["card_id"],
                "player_name": perf["player_name"],
                "team": perf["team"],
                "sport": perf["sport"],
                "streak": perf["streak"],
                "performance_impact": perf["performance_impact"],
                "performance_impact_label": perf["performance_impact_label"],
                "performance_impact_score": perf["performance_impact_score"],
                "trend_direction": perf["trend_direction"],
                "trends": perf["trends"],
            })
    return results

# ============ HOLD PROJECTOR ENGINE ============

class HoldProjectionRequest(BaseModel):
    card_id: str
    purchase_price: Optional[float] = None  # defaults to current price
    hold_months: int = 12  # how many months to hold

def calculate_hold_projection(card: dict, purchase_price: float, hold_months: int) -> dict:
    """Project card value over a hold period based on player profile, market dynamics, and performance"""
    current = card["current_price"]
    sport = card["category"]
    status = card.get("player_status", "active")
    age_factor = 1.0  # how card age affects growth
    
    # Player archetype determines growth curves
    # Prospects: high upside, high variance
    # Active stars: moderate growth, moderate variance
    # Veterans/declining: low growth, lower variance
    # Retired HOF: slow steady appreciation
    # Retired non-HOF/deceased: scarcity-driven, very slow
    
    perf = generate_player_performance(card["id"])
    trend = perf.get("trend_direction", "stable") if perf and perf.get("has_current_data") else "stable"
    perf_impact = perf.get("performance_impact_score", 0) if perf and perf.get("has_current_data") else 0
    
    # Determine player archetype
    if status in ["retired", "deceased"]:
        if card.get("hall_of_fame"):
            archetype = "hof_legend"
        else:
            archetype = "retired"
    elif card.get("rarity") in ["Legendary"]:
        archetype = "established_star"
    elif card["price_change_pct"] > 15 or trend == "rising":
        archetype = "prospect_hot"
    elif card["price_change_pct"] < -5 or trend == "declining":
        archetype = "declining"
    else:
        archetype = "active_stable"
    
    # Growth parameters per archetype: (annual_bull, annual_base, annual_bear, volatility)
    archetype_params = {
        "prospect_hot":     {"bull_annual": 0.80, "base_annual": 0.25, "bear_annual": -0.35, "vol": 0.45, "label": "Hot Prospect"},
        "established_star": {"bull_annual": 0.35, "base_annual": 0.12, "bear_annual": -0.15, "vol": 0.22, "label": "Established Star"},
        "active_stable":    {"bull_annual": 0.25, "base_annual": 0.08, "bear_annual": -0.20, "vol": 0.25, "label": "Active Player"},
        "declining":        {"bull_annual": 0.10, "base_annual": -0.05, "bear_annual": -0.30, "vol": 0.30, "label": "Declining Trend"},
        "hof_legend":       {"bull_annual": 0.15, "base_annual": 0.06, "bear_annual": -0.08, "vol": 0.12, "label": "HOF Legend"},
        "retired":          {"bull_annual": 0.08, "base_annual": 0.03, "bear_annual": -0.10, "vol": 0.15, "label": "Retired"},
    }
    
    params = archetype_params.get(archetype, archetype_params["active_stable"])
    
    # Adjust based on live performance
    perf_adj = perf_impact * 0.002  # small adjustment per impact score
    
    # Grade premium factor (PSA 10 appreciates faster)
    grade_boost = 0.0
    if "PSA 10" in card.get("grade", ""):
        grade_boost = 0.03  # 3% annual premium for gem mint
    elif "PSA 9" in card.get("grade", "") or "BGS 9.5" in card.get("grade", ""):
        grade_boost = 0.015
    
    # Generate projections at each time point
    time_points = []
    months_to_check = [1, 3, 6, 12, 18, 24, 36, 60]
    
    for m in months_to_check:
        if m > hold_months:
            break
        
        years = m / 12
        
        # Compound growth for each scenario
        bull_growth = (1 + params["bull_annual"] + perf_adj + grade_boost) ** years
        base_growth = (1 + params["base_annual"] + perf_adj * 0.5 + grade_boost) ** years
        bear_growth = (1 + params["bear_annual"] + perf_adj * 0.3) ** years
        
        bull_value = round(current * bull_growth, 2)
        base_value = round(current * base_growth, 2)
        bear_value = round(current * bear_growth, 2)
        
        # Probability shifts over time (longer holds = more uncertain)
        uncertainty = min(0.4, years * 0.08)
        bull_prob = max(10, round(20 + (perf_impact * 0.3) - uncertainty * 30))
        bear_prob = max(10, round(25 - (perf_impact * 0.3) - uncertainty * 10))
        base_prob = 100 - bull_prob - bear_prob
        
        # P&L from purchase price
        bull_pnl = round(bull_value - purchase_price, 2)
        base_pnl = round(base_value - purchase_price, 2)
        bear_pnl = round(bear_value - purchase_price, 2)
        
        time_points.append({
            "months": m,
            "label": f"{m}mo" if m < 12 else f"{m // 12}yr" if m % 12 == 0 else f"{m // 12}yr {m % 12}mo",
            "bull": {"value": bull_value, "pnl": bull_pnl, "pnl_pct": round((bull_pnl / purchase_price) * 100, 1), "probability": bull_prob},
            "base": {"value": base_value, "pnl": base_pnl, "pnl_pct": round((base_pnl / purchase_price) * 100, 1), "probability": base_prob},
            "bear": {"value": bear_value, "pnl": bear_pnl, "pnl_pct": round((bear_pnl / purchase_price) * 100, 1), "probability": bear_prob},
        })
    
    # Also add the exact hold_months if not in the list
    if hold_months not in months_to_check:
        years = hold_months / 12
        bull_growth = (1 + params["bull_annual"] + perf_adj + grade_boost) ** years
        base_growth = (1 + params["base_annual"] + perf_adj * 0.5 + grade_boost) ** years
        bear_growth = (1 + params["bear_annual"] + perf_adj * 0.3) ** years
        bull_value = round(current * bull_growth, 2)
        base_value = round(current * base_growth, 2)
        bear_value = round(current * bear_growth, 2)
        uncertainty = min(0.4, years * 0.08)
        bull_prob = max(10, round(20 + (perf_impact * 0.3) - uncertainty * 30))
        bear_prob = max(10, round(25 - (perf_impact * 0.3) - uncertainty * 10))
        base_prob = 100 - bull_prob - bear_prob
        bull_pnl = round(bull_value - purchase_price, 2)
        base_pnl = round(base_value - purchase_price, 2)
        bear_pnl = round(bear_value - purchase_price, 2)
        time_points.append({
            "months": hold_months,
            "label": f"{hold_months}mo" if hold_months < 12 else f"{hold_months // 12}yr" if hold_months % 12 == 0 else f"{hold_months // 12}yr {hold_months % 12}mo",
            "bull": {"value": bull_value, "pnl": bull_pnl, "pnl_pct": round((bull_pnl / purchase_price) * 100, 1), "probability": bull_prob},
            "base": {"value": base_value, "pnl": base_pnl, "pnl_pct": round((base_pnl / purchase_price) * 100, 1), "probability": base_prob},
            "bear": {"value": bear_value, "pnl": bear_pnl, "pnl_pct": round((bear_pnl / purchase_price) * 100, 1), "probability": bear_prob},
        })
        time_points.sort(key=lambda x: x["months"])
    
    # Key catalysts that could swing value
    catalysts = []
    if status == "active":
        if sport in ["Basketball", "Football", "Hockey"]:
            catalysts.append({"event": "Championship Win", "impact": "+25-40%", "timeframe": "Within season"})
            catalysts.append({"event": "MVP Award", "impact": "+15-25%", "timeframe": "End of season"})
            catalysts.append({"event": "Injury (Season-ending)", "impact": "-20-35%", "timeframe": "Immediate"})
        if sport == "Baseball":
            catalysts.append({"event": "World Series Win", "impact": "+20-30%", "timeframe": "October"})
            catalysts.append({"event": "All-Star Selection", "impact": "+5-10%", "timeframe": "Mid-season"})
        catalysts.append({"event": "Record-Breaking Season", "impact": "+30-50%", "timeframe": "During season"})
        catalysts.append({"event": "Trade to Contender", "impact": "+10-20%", "timeframe": "Trade deadline"})
        if trend == "declining":
            catalysts.append({"event": "Retirement Announcement", "impact": "-15-30%", "timeframe": "Off-season"})
    elif card.get("hall_of_fame"):
        catalysts.append({"event": "Documentary/Film Release", "impact": "+5-15%", "timeframe": "Cultural moments"})
        catalysts.append({"event": "Anniversary Milestone", "impact": "+5-10%", "timeframe": "Yearly"})
    catalysts.append({"event": "Market Boom/Crash", "impact": "+-20%", "timeframe": "Unpredictable"})
    catalysts.append({"event": "PSA Population Increase", "impact": "-5-15%", "timeframe": "Ongoing"})
    
    # Recommendation
    final_point = time_points[-1]
    expected_value = (final_point["bull"]["value"] * final_point["bull"]["probability"] / 100 +
                     final_point["base"]["value"] * final_point["base"]["probability"] / 100 +
                     final_point["bear"]["value"] * final_point["bear"]["probability"] / 100)
    expected_pnl = round(expected_value - purchase_price, 2)
    expected_pnl_pct = round((expected_pnl / purchase_price) * 100, 1)
    
    if expected_pnl_pct > 15:
        recommendation = "strong_hold"
        rec_label = f"Strong Hold — Expected {expected_pnl_pct}% return over {final_point['label']}"
    elif expected_pnl_pct > 5:
        recommendation = "hold"
        rec_label = f"Hold — Modest {expected_pnl_pct}% expected return"
    elif expected_pnl_pct > -5:
        recommendation = "neutral"
        rec_label = f"Neutral — Marginal {expected_pnl_pct}% expected return"
    else:
        recommendation = "consider_selling"
        rec_label = f"Consider Selling — Expected {expected_pnl_pct}% return"
    
    return {
        "card_id": card["id"],
        "card_name": card["name"],
        "player_name": card["player_name"],
        "sport": card["category"],
        "team": card["team"],
        "archetype": params["label"],
        "current_price": current,
        "purchase_price": purchase_price,
        "hold_months": hold_months,
        "projections": time_points,
        "expected_value": round(expected_value, 2),
        "expected_pnl": expected_pnl,
        "expected_pnl_pct": expected_pnl_pct,
        "recommendation": recommendation,
        "recommendation_label": rec_label,
        "catalysts": catalysts,
        "grade": card["grade"],
        "rarity": card["rarity"],
        "performance_trend": trend,
        "performance_impact_score": perf_impact,
    }

@api_router.post("/projections/hold")
async def get_hold_projection(req: HoldProjectionRequest):
    card = next((c for c in MOCK_CARDS if c["id"] == req.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    purchase_price = req.purchase_price or card["current_price"]
    return calculate_hold_projection(card, purchase_price, req.hold_months)

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

# CardSight API integration for searching real cards
async def search_cardsight(query: str, limit: int = 20, sport: Optional[str] = None) -> List[Dict]:
    """Search CardSight API for real card data"""
    if not CARDSIGHT_API_KEY:
        logger.warning("CardSight API key not configured")
        return []
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {"q": query, "limit": limit}
            if sport:
                params["sport"] = sport.lower()
            
            response = await client.get(
                f"{CARDSIGHT_BASE_URL}/catalog/search",
                params=params,
                headers={"x-api-key": CARDSIGHT_API_KEY}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                logger.error(f"CardSight API error: {response.status_code}")
                return []
    except Exception as e:
        logger.error(f"CardSight API request failed: {e}")
        return []

def cardsight_to_cardbase(cs_card: Dict, index: int = 0) -> Dict:
    """Convert CardSight API response to our CardBase format with simulated pricing"""
    # Generate deterministic but varied pricing based on card characteristics
    card_id = cs_card.get("id", str(uuid.uuid4()))
    name = cs_card.get("name", "Unknown Card")
    year_str = cs_card.get("year", "2023-24")
    year = int(year_str.split("-")[0]) if "-" in year_str else int(year_str[:4]) if year_str else 2023
    set_name = cs_card.get("setName", "Base Set")
    release_name = cs_card.get("releaseName", "Unknown")
    manufacturer = cs_card.get("manufacturerName", "Unknown")
    
    # Determine category/sport from release name or set name
    category = "Basketball"  # Default
    hockey_keywords = ["upper deck", "o-pee-chee", "young guns", "sp game used", "the cup"]
    baseball_keywords = ["topps", "bowman", "panini diamond", "donruss diamond"]
    football_keywords = ["score", "playoff", "contenders nfl"]
    
    lower_release = release_name.lower()
    lower_set = set_name.lower()
    
    if any(kw in lower_release or kw in lower_set for kw in hockey_keywords):
        category = "Hockey"
    elif any(kw in lower_release or kw in lower_set for kw in baseball_keywords):
        category = "Baseball"
    elif any(kw in lower_release or kw in lower_set for kw in football_keywords):
        category = "Football"
    
    # Generate semi-realistic pricing based on card attributes
    import hashlib
    seed = int(hashlib.md5(card_id.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    # Base price factors
    age_factor = max(0.5, 1 + (2024 - year) * 0.05)  # Older cards tend to be worth more
    rarity_score = random.uniform(0.8, 1.5)
    
    # Price ranges by manufacturer prestige
    if "panini" in manufacturer.lower():
        base_price = random.uniform(50, 5000) * rarity_score * age_factor
    elif "topps" in manufacturer.lower():
        base_price = random.uniform(30, 3000) * rarity_score * age_factor
    elif "upper deck" in manufacturer.lower():
        base_price = random.uniform(40, 4000) * rarity_score * age_factor
    else:
        base_price = random.uniform(20, 1000) * rarity_score * age_factor
    
    current_price = round(base_price, 2)
    price_change = random.uniform(-15, 25)
    previous_price = round(current_price / (1 + price_change / 100), 2)
    
    # Simulate grade distribution
    grades = ["PSA 10", "PSA 9", "BGS 9.5", "PSA 8", "BGS 10"]
    grade = random.choices(grades, weights=[10, 25, 15, 30, 5])[0]
    
    # Rarity based on set
    rarities = ["Common", "Rare", "Ultra Rare", "Legendary"]
    if "prizm" in lower_set or "chrome" in lower_set:
        rarity = random.choices(rarities, weights=[40, 35, 20, 5])[0]
    elif "national treasures" in lower_set or "flawless" in lower_set:
        rarity = random.choices(rarities, weights=[5, 20, 45, 30])[0]
    else:
        rarity = random.choices(rarities, weights=[50, 30, 15, 5])[0]
    
    # Generate other metrics
    volatility = round(random.uniform(10, 45), 1)
    sharpe = round(random.uniform(0.3, 2.5), 2)
    beta = round(random.uniform(0.5, 1.8), 2)
    
    return {
        "id": f"cs_{card_id}",  # Prefix to distinguish from mock cards
        "name": f"{year_str} {release_name} {name}",
        "player_name": name,
        "team": "TBD",  # CardSight doesn't provide team info
        "year": year,
        "set_name": set_name,
        "grade": grade,
        "current_price": current_price,
        "previous_price": previous_price,
        "price_change_pct": round(price_change, 2),
        "image_url": f"https://images.pexels.com/photos/{7800000 + (seed % 10000)}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "category": category,
        "rarity": rarity,
        "last_sold": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
        "volume_24h": random.randint(5, 200),
        "market_cap": round(current_price * random.randint(100, 5000), 2),
        "volatility_30d": volatility,
        "sharpe_ratio": sharpe,
        "beta": beta,
        "correlation_market": round(random.uniform(0.3, 0.8), 2),
        "player_status": "active",
        "hall_of_fame": False,
        "championships": 0,
        "source": "cardsight",  # Mark as from CardSight API
        "cardsight_id": card_id,
        "manufacturer": manufacturer,
        "release_name": release_name,
    }

@api_router.get("/cards/search/cardsight")
async def search_cards_cardsight(q: str, limit: int = 20, sport: Optional[str] = None):
    """Search real cards from CardSight API"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    results = await search_cardsight(q, limit, sport)
    
    # Convert to our card format
    cards = [cardsight_to_cardbase(r, i) for i, r in enumerate(results)]
    
    return {
        "query": q,
        "total": len(cards),
        "source": "cardsight",
        "cards": cards
    }

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

# ============ MARKET VALUATION ============

def calculate_market_value(card: dict) -> dict:
    """Calculate AI market value based on card attributes + live player performance"""
    base = card["current_price"]
    # Factor in rarity multiplier
    rarity_mult = {"Legendary": 1.12, "Ultra Rare": 1.08, "Rare": 1.05, "Common": 1.02}
    mult = rarity_mult.get(card["rarity"], 1.0)
    
    # Factor in grade premium
    grade_mult = 1.0
    if "PSA 10" in card["grade"]:
        grade_mult = 1.10
    elif "PSA 9" in card["grade"] or "BGS 9.5" in card["grade"]:
        grade_mult = 1.06
    
    # Factor in player status (HOF, active rising star, etc.)
    status_mult = 1.0
    if card.get("hall_of_fame"):
        status_mult = 1.08
    elif card.get("player_status") == "active" and card["price_change_pct"] > 10:
        status_mult = 1.12  # Rising star premium
    
    # Factor in momentum (volume + price trend)
    momentum = 1.0 + (card["price_change_pct"] / 200)  # Slight adjust for momentum
    
    # Factor in LIVE PLAYER PERFORMANCE
    perf_mult = 1.0
    perf_note = None
    if card.get("player_status") == "active":
        perf = generate_player_performance(card["id"])
        if perf and perf.get("has_current_data"):
            impact = perf["performance_impact"]
            if impact == "strongly_bullish":
                perf_mult = 1.08
                perf_note = f"Hot performance: {perf['streak']['label'] if perf['streak']['type'] == 'hot' else 'Strong trends'}"
            elif impact == "bullish":
                perf_mult = 1.04
                perf_note = "Positive on-field trends"
            elif impact == "strongly_bearish":
                perf_mult = 0.92
                perf_note = f"Declining stats: {perf['streak']['label'] if perf['streak']['type'] == 'cold' else 'Negative trends'}"
            elif impact == "bearish":
                perf_mult = 0.96
                perf_note = "On-field concerns"
    
    fair_market_value = base * mult * grade_mult * status_mult * momentum * perf_mult
    
    # Confidence based on volume
    confidence = min(0.95, 0.60 + (card["volume_24h"] / 500))
    
    # Suggested buy range: 80-90% of FMV
    buy_low = round(fair_market_value * 0.80, 2)
    buy_high = round(fair_market_value * 0.90, 2)
    
    # Suggested sell range: 95-105% of FMV
    sell_low = round(fair_market_value * 0.95, 2)
    sell_high = round(fair_market_value * 1.05, 2)
    
    result = {
        "card_id": card["id"],
        "card_name": card["name"],
        "current_price": card["current_price"],
        "fair_market_value": round(fair_market_value, 2),
        "value_vs_price_pct": round(((fair_market_value - base) / base) * 100, 2),
        "confidence": round(confidence, 2),
        "buy_range": {"low": buy_low, "high": buy_high},
        "sell_range": {"low": sell_low, "high": sell_high},
        "potential_profit_at_buy_low": round(fair_market_value - buy_low, 2),
        "potential_profit_pct_at_buy_low": round(((fair_market_value - buy_low) / buy_low) * 100, 2),
        "potential_profit_at_buy_high": round(fair_market_value - buy_high, 2),
        "potential_profit_pct_at_buy_high": round(((fair_market_value - buy_high) / buy_high) * 100, 2),
        "grade_premium": card["grade"],
        "rarity": card["rarity"],
        "volume_24h": card["volume_24h"],
        "momentum": "Bullish" if card["price_change_pct"] > 3 else ("Bearish" if card["price_change_pct"] < -3 else "Neutral"),
        "performance_factor": perf_mult,
        "performance_note": perf_note,
    }
    return result

@api_router.get("/marketplace/valuations")
async def get_market_valuations(category: Optional[str] = None):
    """Get AI market valuations for all cards with buy/sell ranges"""
    cards = MOCK_CARDS.copy()
    if category and category != "all":
        cards = [c for c in cards if c["category"].lower() == category.lower()]
    
    valuations = [calculate_market_value(c) for c in cards]
    # Sort by potential profit percentage descending
    valuations.sort(key=lambda x: x["potential_profit_pct_at_buy_low"], reverse=True)
    return valuations

@api_router.get("/marketplace/valuation/{card_id}")
async def get_card_valuation(card_id: str):
    """Get AI market valuation for a specific card"""
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return calculate_market_value(card)

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
    for card in MOCK_CARDS:
        # Factor player performance into the signal
        perf = generate_player_performance(card["id"])
        perf_impact = perf.get("performance_impact", "neutral") if perf and perf.get("has_current_data") else "neutral"
        
        # Generate signal based on card metrics + performance
        if perf_impact == "strongly_bullish":
            signal = random.choice(["STRONG BUY", "BUY"])
        elif perf_impact == "bullish":
            signal = random.choice(["BUY", "BUY", "HOLD"])
        elif perf_impact == "strongly_bearish":
            signal = random.choice(["SELL", "SELL", "HOLD"])
        elif perf_impact == "bearish":
            signal = random.choice(["SELL", "HOLD", "HOLD"])
        elif card.get("player_status") in ["retired", "deceased"]:
            signal = random.choice(["HOLD", "HOLD", "BUY"])
        else:
            signal = random.choice(["STRONG BUY", "BUY", "HOLD", "SELL"])
        
        confidence = random.uniform(0.65, 0.95)
        risk = random.uniform(0.2, 0.8)
        sentiment = random.uniform(-0.5, 0.8)
        
        factors = ["eBay price momentum", "Market volume trends", "Social sentiment analysis"]
        if perf and perf.get("has_current_data"):
            factors.append(f"Player stats: {perf.get('trend_direction', 'stable')}")
            if perf.get("streak", {}).get("type") == "hot":
                factors.append(f"Hot streak: {perf['streak']['label']}")
            elif perf.get("streak", {}).get("type") == "cold":
                factors.append(f"Cold streak: {perf['streak']['label']}")
        else:
            factors.append("Legacy/scarcity premium")
        
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
            analysis=f"Based on market trends, {'live player performance data, ' if perf and perf.get('has_current_data') else ''}and social sentiment analysis, {card['player_name']} cards show {signal.lower()} signals. {'Performance trending ' + perf.get('trend_direction', '') + '. ' if perf and perf.get('has_current_data') else 'Value driven by legacy and scarcity. '}{card.get('category', '')} market {'showing strength' if card['price_change_pct'] > 0 else 'under pressure'}.",
            factors=factors,
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

# ============ WATCHLIST ROUTES ============

@api_router.get("/watchlist")
async def get_watchlist(current_user: dict = Depends(get_current_user)):
    """Get user's watchlist with current prices and alert status"""
    watchlist = await db.watchlist.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    result = []
    for item in watchlist:
        card = next((c for c in MOCK_CARDS if c["id"] == item["card_id"]), None)
        if card:
            price_change_since_add = ((card["current_price"] - item["price_at_add"]) / item["price_at_add"]) * 100
            
            # Check if alerts triggered
            alert_triggered = None
            if item.get("alert_enabled"):
                if item.get("target_price_high") and card["current_price"] >= item["target_price_high"]:
                    alert_triggered = "high"
                elif item.get("target_price_low") and card["current_price"] <= item["target_price_low"]:
                    alert_triggered = "low"
            
            result.append({
                **item,
                "card": card,
                "current_price": card["current_price"],
                "price_change_since_add": round(price_change_since_add, 2),
                "alert_triggered": alert_triggered
            })
    
    return result

@api_router.post("/watchlist")
async def add_to_watchlist(request: AddToWatchlistRequest, current_user: dict = Depends(get_current_user)):
    """Add a card to watchlist"""
    card = next((c for c in MOCK_CARDS if c["id"] == request.card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Check if already in watchlist
    existing = await db.watchlist.find_one({"user_id": current_user["id"], "card_id": request.card_id})
    if existing:
        raise HTTPException(status_code=400, detail="Card already in watchlist")
    
    watchlist_item = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "card_id": request.card_id,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "price_at_add": card["current_price"],
        "target_price_high": request.target_price_high,
        "target_price_low": request.target_price_low,
        "alert_enabled": True,
        "notes": request.notes
    }
    await db.watchlist.insert_one(watchlist_item)
    
    return {"success": True, "message": f"Added {card['name']} to watchlist", "item": watchlist_item}

@api_router.put("/watchlist/{item_id}")
async def update_watchlist_item(item_id: str, request: UpdateWatchlistAlertRequest, current_user: dict = Depends(get_current_user)):
    """Update watchlist item alerts"""
    item = await db.watchlist.find_one({"id": item_id, "user_id": current_user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    update_data = {}
    if request.target_price_high is not None:
        update_data["target_price_high"] = request.target_price_high
    if request.target_price_low is not None:
        update_data["target_price_low"] = request.target_price_low
    if request.alert_enabled is not None:
        update_data["alert_enabled"] = request.alert_enabled
    if request.notes is not None:
        update_data["notes"] = request.notes
    
    if update_data:
        await db.watchlist.update_one({"id": item_id}, {"$set": update_data})
    
    return {"success": True, "message": "Watchlist item updated"}

@api_router.delete("/watchlist/{item_id}")
async def remove_from_watchlist(item_id: str, current_user: dict = Depends(get_current_user)):
    """Remove card from watchlist"""
    result = await db.watchlist.delete_one({"id": item_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"success": True, "message": "Removed from watchlist"}

@api_router.get("/watchlist/alerts")
async def get_watchlist_alerts(current_user: dict = Depends(get_current_user)):
    """Get all triggered alerts from watchlist"""
    watchlist = await db.watchlist.find({"user_id": current_user["id"], "alert_enabled": True}, {"_id": 0}).to_list(100)
    
    triggered_alerts = []
    for item in watchlist:
        card = next((c for c in MOCK_CARDS if c["id"] == item["card_id"]), None)
        if not card:
            continue
        
        if item.get("target_price_high") and card["current_price"] >= item["target_price_high"]:
            triggered_alerts.append({
                "id": str(uuid.uuid4()),
                "watchlist_id": item["id"],
                "card_id": card["id"],
                "card_name": card["name"],
                "alert_type": "price_above_target",
                "message": f"{card['player_name']} hit your target price of {item['target_price_high']:,.0f}",
                "current_price": card["current_price"],
                "target_price": item["target_price_high"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        if item.get("target_price_low") and card["current_price"] <= item["target_price_low"]:
            triggered_alerts.append({
                "id": str(uuid.uuid4()),
                "watchlist_id": item["id"],
                "card_id": card["id"],
                "card_name": card["name"],
                "alert_type": "price_below_target",
                "message": f"{card['player_name']} dropped to your buy target of {item['target_price_low']:,.0f}",
                "current_price": card["current_price"],
                "target_price": item["target_price_low"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    return {"alerts": triggered_alerts, "count": len(triggered_alerts)}

# ============ EARNINGS / PLAYER PERFORMANCE ROUTES ============

# Mock player stats data
PLAYER_STATS = {
    "Michael Jordan": {
        "sport": "Basketball",
        "position": "SG",
        "status": "Retired",
        "career_highlights": ["6x NBA Champion", "5x MVP", "14x All-Star", "10x Scoring Champion"],
        "season_stats": None,
        "recent_games": [],
        "legacy_score": 100,
        "card_value_correlation": 0.95
    },
    "LeBron James": {
        "sport": "Basketball",
        "position": "SF",
        "status": "Active",
        "team": "Los Angeles Lakers",
        "career_highlights": ["4x NBA Champion", "4x MVP", "20x All-Star"],
        "season_stats": {"ppg": 25.7, "rpg": 7.3, "apg": 8.3, "games": 55},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "GSW", "points": 30, "rebounds": 8, "assists": 12, "result": "W", "impact_score": 85},
            {"date": "2024-01-18", "opponent": "BOS", "points": 27, "rebounds": 6, "assists": 9, "result": "L", "impact_score": 45},
            {"date": "2024-01-16", "opponent": "MIA", "points": 35, "rebounds": 10, "assists": 7, "result": "W", "impact_score": 90},
            {"date": "2024-01-14", "opponent": "PHX", "points": 22, "rebounds": 5, "assists": 11, "result": "W", "impact_score": 60},
            {"date": "2024-01-12", "opponent": "DEN", "points": 28, "rebounds": 9, "assists": 8, "result": "L", "impact_score": 50},
        ],
        "legacy_score": 95,
        "card_value_correlation": 0.78
    },
    "Luka Doncic": {
        "sport": "Basketball",
        "position": "PG",
        "status": "Active",
        "team": "Dallas Mavericks",
        "career_highlights": ["5x All-Star", "All-NBA First Team"],
        "season_stats": {"ppg": 33.9, "rpg": 9.2, "apg": 9.8, "games": 45},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "LAL", "points": 42, "rebounds": 11, "assists": 14, "result": "W", "impact_score": 95},
            {"date": "2024-01-18", "opponent": "MEM", "points": 38, "rebounds": 8, "assists": 10, "result": "W", "impact_score": 88},
            {"date": "2024-01-16", "opponent": "SAS", "points": 35, "rebounds": 12, "assists": 8, "result": "W", "impact_score": 82},
            {"date": "2024-01-14", "opponent": "HOU", "points": 29, "rebounds": 7, "assists": 11, "result": "L", "impact_score": 55},
            {"date": "2024-01-12", "opponent": "OKC", "points": 44, "rebounds": 10, "assists": 9, "result": "W", "impact_score": 92},
        ],
        "legacy_score": 75,
        "card_value_correlation": 0.88
    },
    "Victor Wembanyama": {
        "sport": "Basketball",
        "position": "C",
        "status": "Active",
        "team": "San Antonio Spurs",
        "career_highlights": ["Rookie of the Year Favorite", "#1 Overall Pick"],
        "season_stats": {"ppg": 21.4, "rpg": 10.6, "apg": 3.7, "bpg": 3.6, "games": 50},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "DAL", "points": 28, "rebounds": 14, "assists": 5, "result": "L", "impact_score": 70},
            {"date": "2024-01-18", "opponent": "POR", "points": 32, "rebounds": 12, "assists": 4, "result": "W", "impact_score": 85},
            {"date": "2024-01-16", "opponent": "UTA", "points": 25, "rebounds": 11, "assists": 6, "result": "W", "impact_score": 78},
            {"date": "2024-01-14", "opponent": "SAC", "points": 19, "rebounds": 8, "assists": 3, "result": "L", "impact_score": 40},
            {"date": "2024-01-12", "opponent": "LAC", "points": 24, "rebounds": 13, "assists": 4, "result": "W", "impact_score": 72},
        ],
        "legacy_score": 50,
        "card_value_correlation": 0.92
    },
    "Mickey Mantle": {
        "sport": "Baseball",
        "position": "CF",
        "status": "Deceased",
        "career_highlights": ["3x MVP", "7x World Series Champion", "Triple Crown Winner", "Hall of Fame"],
        "season_stats": None,
        "recent_games": [],
        "legacy_score": 98,
        "card_value_correlation": 0.85
    },
    "Julio Rodriguez": {
        "sport": "Baseball",
        "position": "CF",
        "status": "Active",
        "team": "Seattle Mariners",
        "career_highlights": ["AL Rookie of the Year", "All-Star"],
        "season_stats": {"avg": ".275", "hr": 32, "rbi": 95, "sb": 37, "games": 155},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "NYY", "hits": 2, "home_runs": 1, "rbi": 3, "result": "W", "impact_score": 80},
            {"date": "2024-01-19", "opponent": "NYY", "hits": 1, "home_runs": 0, "rbi": 0, "result": "L", "impact_score": 25},
            {"date": "2024-01-18", "opponent": "BOS", "hits": 3, "home_runs": 1, "rbi": 2, "result": "W", "impact_score": 85},
        ],
        "legacy_score": 45,
        "card_value_correlation": 0.82
    },
    "Justin Herbert": {
        "sport": "Football",
        "position": "QB",
        "status": "Active",
        "team": "Los Angeles Chargers",
        "career_highlights": ["Offensive Rookie of the Year", "Pro Bowl"],
        "season_stats": {"passing_yards": 4200, "touchdowns": 28, "interceptions": 12, "passer_rating": 98.5, "games": 16},
        "recent_games": [
            {"date": "2024-01-21", "opponent": "KC", "passing_yards": 320, "touchdowns": 3, "result": "L", "impact_score": 65},
            {"date": "2024-01-14", "opponent": "LV", "passing_yards": 285, "touchdowns": 2, "result": "W", "impact_score": 72},
            {"date": "2024-01-07", "opponent": "DEN", "passing_yards": 350, "touchdowns": 4, "result": "W", "impact_score": 90},
        ],
        "legacy_score": 55,
        "card_value_correlation": 0.75
    },
    "Joe Burrow": {
        "sport": "Football",
        "position": "QB",
        "status": "Active",
        "team": "Cincinnati Bengals",
        "career_highlights": ["Super Bowl Appearance", "Comeback Player of the Year"],
        "season_stats": {"passing_yards": 4475, "touchdowns": 34, "interceptions": 9, "passer_rating": 101.8, "games": 17},
        "recent_games": [
            {"date": "2024-01-21", "opponent": "BUF", "passing_yards": 375, "touchdowns": 3, "result": "W", "impact_score": 88},
            {"date": "2024-01-14", "opponent": "BAL", "passing_yards": 290, "touchdowns": 2, "result": "L", "impact_score": 55},
            {"date": "2024-01-07", "opponent": "CLE", "passing_yards": 340, "touchdowns": 4, "result": "W", "impact_score": 85},
        ],
        "legacy_score": 60,
        "card_value_correlation": 0.80
    },
    "Zion Williamson": {
        "sport": "Basketball",
        "position": "PF",
        "status": "Active",
        "team": "New Orleans Pelicans",
        "career_highlights": ["All-Star", "#1 Overall Pick"],
        "season_stats": {"ppg": 22.9, "rpg": 5.8, "apg": 5.0, "games": 35},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "ATL", "points": 28, "rebounds": 7, "assists": 6, "result": "W", "impact_score": 75},
            {"date": "2024-01-16", "opponent": "CHI", "points": 18, "rebounds": 4, "assists": 3, "result": "L", "impact_score": 35},
        ],
        "legacy_score": 40,
        "card_value_correlation": 0.65
    },
    "Trae Young": {
        "sport": "Basketball",
        "position": "PG",
        "status": "Active",
        "team": "Atlanta Hawks",
        "career_highlights": ["3x All-Star"],
        "season_stats": {"ppg": 26.2, "rpg": 3.1, "apg": 10.8, "games": 50},
        "recent_games": [
            {"date": "2024-01-20", "opponent": "NOP", "points": 35, "rebounds": 4, "assists": 12, "result": "L", "impact_score": 68},
            {"date": "2024-01-18", "opponent": "MIL", "points": 41, "rebounds": 3, "assists": 14, "result": "W", "impact_score": 92},
        ],
        "legacy_score": 50,
        "card_value_correlation": 0.70
    }
}

@api_router.get("/earnings/{card_id}")
async def get_player_earnings(card_id: str):
    """Get player performance/earnings data for a card"""
    card = next((c for c in MOCK_CARDS if c["id"] == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    player_name = card["player_name"]
    player_data = PLAYER_STATS.get(player_name)
    
    if not player_data:
        # Generate mock data for unknown players
        player_data = {
            "sport": card["category"],
            "position": "N/A",
            "status": "Active",
            "career_highlights": [],
            "season_stats": None,
            "recent_games": [],
            "legacy_score": 50,
            "card_value_correlation": 0.5
        }
    
    # Calculate performance trend
    recent_games = player_data.get("recent_games", [])
    if recent_games:
        avg_impact = sum(g["impact_score"] for g in recent_games) / len(recent_games)
        trend = "hot" if avg_impact > 70 else "cold" if avg_impact < 50 else "stable"
    else:
        avg_impact = None
        trend = "stable"
    
    # Generate earnings calendar (upcoming games/events)
    upcoming_events = []
    if player_data["status"] == "Active":
        for i in range(5):
            event_date = (datetime.now(timezone.utc) + timedelta(days=i*3+1)).strftime("%Y-%m-%d")
            opponents = ["LAL", "BOS", "GSW", "MIA", "PHX", "NYK", "CHI", "DEN"]
            upcoming_events.append({
                "date": event_date,
                "type": "game",
                "opponent": random.choice(opponents),
                "importance": random.choice(["low", "medium", "high"]),
                "projected_impact": random.randint(-10, 25)
            })
    
    return {
        "card_id": card_id,
        "card_name": card["name"],
        "player_name": player_name,
        "player_data": player_data,
        "performance_trend": trend,
        "avg_impact_score": round(avg_impact, 1) if avg_impact else None,
        "upcoming_events": upcoming_events,
        "value_correlation": player_data.get("card_value_correlation", 0.5),
        "next_catalyst": get_next_catalyst(player_data, card)
    }

def get_next_catalyst(player_data: dict, card: dict) -> dict:
    """Determine the next potential catalyst for card value"""
    catalysts = []
    
    if player_data["status"] == "Active":
        catalysts.append({
            "event": "Playoff Performance",
            "probability": 0.7,
            "potential_impact": "+15-30%",
            "timeframe": "2-3 months"
        })
        catalysts.append({
            "event": "All-Star Selection",
            "probability": 0.5,
            "potential_impact": "+5-10%",
            "timeframe": "1 month"
        })
        if player_data.get("legacy_score", 0) > 70:
            catalysts.append({
                "event": "Award/MVP Consideration",
                "probability": 0.3,
                "potential_impact": "+20-40%",
                "timeframe": "3-4 months"
            })
    elif player_data["status"] == "Retired":
        catalysts.append({
            "event": "Documentary/Anniversary",
            "probability": 0.2,
            "potential_impact": "+5-15%",
            "timeframe": "Unknown"
        })
        catalysts.append({
            "event": "Market Appreciation",
            "probability": 0.8,
            "potential_impact": "+3-8% annually",
            "timeframe": "Ongoing"
        })
    
    return catalysts[0] if catalysts else None

@api_router.get("/earnings/calendar")
async def get_earnings_calendar():
    """Get calendar of upcoming events that may impact card values"""
    events = []
    
    for card in MOCK_CARDS[:6]:
        player_name = card["player_name"]
        player_data = PLAYER_STATS.get(player_name, {})
        
        if player_data.get("status") == "Active":
            # Add game events
            for i in range(2):
                event_date = (datetime.now(timezone.utc) + timedelta(days=i*2+1))
                opponents = ["LAL", "BOS", "GSW", "MIA", "PHX", "NYK"]
                events.append({
                    "id": str(uuid.uuid4()),
                    "date": event_date.isoformat(),
                    "date_display": event_date.strftime("%b %d"),
                    "player_name": player_name,
                    "card_id": card["id"],
                    "event_type": "game",
                    "description": f"vs {random.choice(opponents)}",
                    "importance": random.choice(["medium", "high"]),
                    "projected_impact": random.randint(-5, 20)
                })
    
    # Add market-wide events
    events.append({
        "id": str(uuid.uuid4()),
        "date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "date_display": (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%b %d"),
        "player_name": None,
        "card_id": None,
        "event_type": "market",
        "description": "All-Star Weekend",
        "importance": "high",
        "projected_impact": 15
    })
    
    # Sort by date
    events.sort(key=lambda x: x["date"])
    
    return {"events": events[:10]}

@api_router.get("/earnings/leaderboard")
async def get_performance_leaderboard():
    """Get leaderboard of players by recent performance impact"""
    leaderboard = []
    
    for card in MOCK_CARDS:
        player_name = card["player_name"]
        player_data = PLAYER_STATS.get(player_name, {})
        recent_games = player_data.get("recent_games", [])
        
        if recent_games:
            avg_impact = sum(g["impact_score"] for g in recent_games) / len(recent_games)
            wins = len([g for g in recent_games if g["result"] == "W"])
            
            leaderboard.append({
                "card_id": card["id"],
                "player_name": player_name,
                "team": player_data.get("team", card["team"]),
                "category": card["category"],
                "avg_impact_score": round(avg_impact, 1),
                "recent_record": f"{wins}-{len(recent_games)-wins}",
                "trend": "hot" if avg_impact > 70 else "cold" if avg_impact < 50 else "stable",
                "card_price_change": card["price_change_pct"],
                "correlation": player_data.get("card_value_correlation", 0.5)
            })
    
    # Sort by impact score
    leaderboard.sort(key=lambda x: x["avg_impact_score"], reverse=True)
    
    return {"leaderboard": leaderboard}

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
