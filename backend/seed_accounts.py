"""
Slabby Seed Script
Project Marvel - Demo Account Creation
"""

import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import uuid
from datetime import datetime, timezone

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']


def hash_password(password: str) -> str:
    """Hash password with bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


async def seed_demo_accounts():
    """Create demo user and admin accounts"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Slabby Demo Account Seeder")
    print("=" * 40)
    
    # Demo User Account
    demo_user_email = "demo@slabby.com"
    demo_user_password = "demo123"
    
    existing_demo = await db.users.find_one({"email": demo_user_email})
    if existing_demo:
        print(f"Demo user already exists: {demo_user_email}")
        demo_user_id = existing_demo["id"]
    else:
        demo_user_id = str(uuid.uuid4())
        demo_user = {
            "id": demo_user_id,
            "email": demo_user_email,
            "password_hash": hash_password(demo_user_password),
            "role": "user",
            "status": "active",
            "profile": {
                "display_name": "Demo Trader",
                "bio": "Demo account for testing Slabby platform",
                "avatar_url": None
            },
            "verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(demo_user)
        print(f"Created demo user: {demo_user_email}")
    
    # Create wallet for demo user
    existing_wallet = await db.wallets.find_one({"user_id": demo_user_id})
    if not existing_wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": demo_user_id,
            "available_balance": 1000.00,  # $1000 starting balance
            "pending_balance": 0.0,
            "escrow_balance": 0.0,
            "total_balance": 1000.00,
            "currency": "USD",
            "is_locked": False,
            "is_rewarded": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        print(f"Created wallet for demo user with $1000 balance")
    
    # Demo Admin Account
    admin_email = "admin@slabby.com"
    admin_password = "admin123"
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if existing_admin:
        print(f"Admin already exists: {admin_email}")
        admin_user_id = existing_admin["id"]
        # Ensure admin role
        if existing_admin.get("role") != "admin":
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"role": "admin"}}
            )
            print(f"Updated {admin_email} to admin role")
    else:
        admin_user_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_user_id,
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "status": "active",
            "profile": {
                "display_name": "Slabby Admin",
                "bio": "Platform administrator",
                "avatar_url": None
            },
            "verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print(f"Created admin: {admin_email}")
    
    # Create wallet for admin
    existing_admin_wallet = await db.wallets.find_one({"user_id": admin_user_id})
    if not existing_admin_wallet:
        admin_wallet = {
            "id": str(uuid.uuid4()),
            "user_id": admin_user_id,
            "available_balance": 10000.00,  # $10k for admin
            "pending_balance": 0.0,
            "escrow_balance": 0.0,
            "total_balance": 10000.00,
            "currency": "USD",
            "is_locked": False,
            "is_rewarded": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(admin_wallet)
        print(f"Created wallet for admin with $10,000 balance")
    
    # Create some demo cards for the demo user
    demo_cards = [
        {
            "id": str(uuid.uuid4()),
            "owner_id": demo_user_id,
            "title": "2023 Panini Prizm Victor Wembanyama RC #280",
            "player_name": "Victor Wembanyama",
            "team": "San Antonio Spurs",
            "year": 2023,
            "set_name": "Panini Prizm",
            "card_number": "280",
            "category": "basketball",
            "condition": "psa_10",
            "asking_price": 3500.00,
            "status": "available",
            "images": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "listed_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "owner_id": demo_user_id,
            "title": "2018 Panini Prizm Luka Doncic RC Silver",
            "player_name": "Luka Doncic",
            "team": "Dallas Mavericks",
            "year": 2018,
            "set_name": "Panini Prizm",
            "card_number": "280",
            "category": "basketball",
            "condition": "psa_9",
            "asking_price": 1200.00,
            "status": "available",
            "images": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "listed_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "owner_id": demo_user_id,
            "title": "2011 Topps Update Mike Trout RC #US175",
            "player_name": "Mike Trout",
            "team": "Los Angeles Angels",
            "year": 2011,
            "set_name": "Topps Update",
            "card_number": "US175",
            "category": "baseball",
            "condition": "psa_10",
            "asking_price": 45000.00,
            "status": "available",
            "images": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "listed_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check if cards already exist
    existing_cards = await db.cards.count_documents({"owner_id": demo_user_id})
    if existing_cards < 3:
        for card in demo_cards:
            existing = await db.cards.find_one({"title": card["title"], "owner_id": demo_user_id})
            if not existing:
                await db.cards.insert_one(card)
                print(f"Created demo card: {card['title'][:50]}...")
    
    print("=" * 40)
    print("\nDemo Accounts Created:")
    print(f"  User:  {demo_user_email} / {demo_user_password}")
    print(f"  Admin: {admin_email} / {admin_password}")
    print("\n")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_demo_accounts())
