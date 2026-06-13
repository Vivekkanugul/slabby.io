"""
Slabby Wallet Service
Project Marvel - Banking & Payment Management
"""

from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

from models.wallet import (
    Wallet, WalletTransaction, WalletResponse, TransactionResponse,
    WalletDeposit, WalletWithdrawal,
    TransactionType, TransactionStatus, PlatformFees
)
from models.events import EventType, create_event
from services.event_store import EventStoreService

logger = logging.getLogger(__name__)


class WalletService:
    """Wallet and payment management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase, event_store: EventStoreService):
        self.db = db
        self.wallets = db.wallets
        self.transactions = db.wallet_transactions
        self.event_store = event_store
        self.fees = PlatformFees()
    
    def _wallet_to_response(self, wallet: dict) -> WalletResponse:
        total = wallet.get("available_balance", 0) + wallet.get("pending_balance", 0) + wallet.get("escrow_balance", 0)
        return WalletResponse(
            id=wallet["id"],
            user_id=wallet["user_id"],
            available_balance=wallet.get("available_balance", 0),
            pending_balance=wallet.get("pending_balance", 0),
            escrow_balance=wallet.get("escrow_balance", 0),
            total_balance=total,
            stripe_connect_onboarded=wallet.get("stripe_connect_account_id") is not None,
            created_at=wallet.get("created_at", datetime.now(timezone.utc))
        )
    
    def _tx_to_response(self, tx: dict) -> TransactionResponse:
        return TransactionResponse(
            id=tx["id"],
            type=TransactionType(tx["type"]),
            amount=tx["amount"],
            currency=tx.get("currency", "USD"),
            balance_after=tx["balance_after"],
            status=TransactionStatus(tx["status"]),
            description=tx.get("description"),
            created_at=tx.get("created_at", datetime.now(timezone.utc)),
            completed_at=tx.get("completed_at")
        )
    
    async def get_or_create_wallet(self, user_id: str) -> Wallet:
        """Get user's wallet or create one if it doesn't exist"""
        wallet = await self.wallets.find_one({"user_id": user_id}, {"_id": 0})
        
        if not wallet:
            wallet_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            wallet = {
                "id": wallet_id,
                "user_id": user_id,
                "available_balance": 0.0,
                "pending_balance": 0.0,
                "escrow_balance": 0.0,
                "total_deposited": 0.0,
                "total_withdrawn": 0.0,
                "total_fees_paid": 0.0,
                "stripe_customer_id": None,
                "stripe_connect_account_id": None,
                "stripe_default_payment_method": None,
                "auto_withdraw": False,
                "auto_withdraw_threshold": 100.0,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "version": 1
            }
            
            await self.wallets.insert_one(wallet)
            
            # Record event
            event = create_event(
                EventType.WALLET_CREATED,
                "wallet",
                wallet_id,
                {"user_id": user_id},
                actor_id=user_id
            )
            await self.event_store.append(event)
            
            logger.info(f"Wallet created for user: {user_id}")
        
        return self._wallet_to_response(wallet)
    
    async def get_wallet(self, user_id: str) -> Optional[WalletResponse]:
        """Get user's wallet"""
        wallet = await self.wallets.find_one({"user_id": user_id}, {"_id": 0})
        if not wallet:
            return None
        return self._wallet_to_response(wallet)
    
    async def _record_transaction(
        self,
        wallet_id: str,
        user_id: str,
        tx_type: TransactionType,
        amount: float,
        balance_after: float,
        description: Optional[str] = None,
        related_trade_id: Optional[str] = None,
        related_razz_id: Optional[str] = None,
        stripe_payment_intent: Optional[str] = None
    ) -> WalletTransaction:
        """Record a wallet transaction"""
        tx_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        wallet = await self.wallets.find_one({"id": wallet_id})
        balance_before = wallet.get("available_balance", 0) if wallet else 0
        
        tx = {
            "id": tx_id,
            "wallet_id": wallet_id,
            "user_id": user_id,
            "type": tx_type.value,
            "amount": amount,
            "currency": "USD",
            "balance_before": balance_before,
            "balance_after": balance_after,
            "related_trade_id": related_trade_id,
            "related_razz_id": related_razz_id,
            "related_escrow_id": None,
            "stripe_payment_intent": stripe_payment_intent,
            "stripe_transfer_id": None,
            "stripe_payout_id": None,
            "status": TransactionStatus.COMPLETED.value,
            "description": description,
            "metadata": {},
            "created_at": now.isoformat(),
            "completed_at": now.isoformat(),
            "version": 1
        }
        
        await self.transactions.insert_one(tx)
        
        return tx
    
    async def deposit(self, user_id: str, amount: float, stripe_payment_intent: Optional[str] = None) -> WalletResponse:
        """Process a deposit to user's wallet"""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        
        wallet = await self.wallets.find_one({"user_id": user_id})
        if not wallet:
            # Create wallet first
            await self.get_or_create_wallet(user_id)
            wallet = await self.wallets.find_one({"user_id": user_id})
        
        new_balance = wallet["available_balance"] + amount
        now = datetime.now(timezone.utc)
        
        await self.wallets.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "available_balance": new_balance,
                    "updated_at": now.isoformat()
                },
                "$inc": {"total_deposited": amount}
            }
        )
        
        # Record transaction
        await self._record_transaction(
            wallet["id"],
            user_id,
            TransactionType.DEPOSIT,
            amount,
            new_balance,
            "Wallet deposit",
            stripe_payment_intent=stripe_payment_intent
        )
        
        # Record event
        event = create_event(
            EventType.WALLET_DEPOSIT_COMPLETED,
            "wallet",
            wallet["id"],
            {"amount": amount, "new_balance": new_balance},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Deposit of ${amount} completed for user {user_id}")
        
        updated_wallet = await self.wallets.find_one({"user_id": user_id}, {"_id": 0})
        return self._wallet_to_response(updated_wallet)
    
    async def withdraw(self, user_id: str, amount: float) -> WalletResponse:
        """Process a withdrawal from user's wallet"""
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        
        if amount < self.fees.minimum_withdrawal:
            raise ValueError(f"Minimum withdrawal is ${self.fees.minimum_withdrawal}")
        
        if amount > self.fees.maximum_withdrawal:
            raise ValueError(f"Maximum withdrawal is ${self.fees.maximum_withdrawal}")
        
        wallet = await self.wallets.find_one({"user_id": user_id})
        if not wallet:
            raise ValueError("Wallet not found")
        
        if wallet["available_balance"] < amount:
            raise ValueError("Insufficient balance")
        
        new_balance = wallet["available_balance"] - amount
        now = datetime.now(timezone.utc)
        
        await self.wallets.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "available_balance": new_balance,
                    "updated_at": now.isoformat()
                },
                "$inc": {"total_withdrawn": amount}
            }
        )
        
        # Record transaction
        await self._record_transaction(
            wallet["id"],
            user_id,
            TransactionType.WITHDRAWAL,
            -amount,
            new_balance,
            "Wallet withdrawal"
        )
        
        # Record event
        event = create_event(
            EventType.WALLET_WITHDRAWAL_COMPLETED,
            "wallet",
            wallet["id"],
            {"amount": amount, "new_balance": new_balance},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Withdrawal of ${amount} completed for user {user_id}")
        
        updated_wallet = await self.wallets.find_one({"user_id": user_id}, {"_id": 0})
        return self._wallet_to_response(updated_wallet)
    
    async def hold_escrow(self, user_id: str, amount: float, trade_id: Optional[str] = None, razz_id: Optional[str] = None) -> bool:
        """Move funds from available to escrow"""
        if amount <= 0:
            raise ValueError("Escrow amount must be positive")
        
        wallet = await self.wallets.find_one({"user_id": user_id})
        if not wallet:
            raise ValueError("Wallet not found")
        
        if wallet["available_balance"] < amount:
            raise ValueError("Insufficient balance for escrow")
        
        now = datetime.now(timezone.utc)
        
        await self.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    "available_balance": -amount,
                    "escrow_balance": amount
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Record transaction
        new_available = wallet["available_balance"] - amount
        await self._record_transaction(
            wallet["id"],
            user_id,
            TransactionType.ESCROW_HOLD,
            -amount,
            new_available,
            f"Escrow hold for {'trade' if trade_id else 'razz'}",
            related_trade_id=trade_id,
            related_razz_id=razz_id
        )
        
        # Record event
        event = create_event(
            EventType.WALLET_ESCROW_HOLD,
            "wallet",
            wallet["id"],
            {"amount": amount, "trade_id": trade_id, "razz_id": razz_id},
            actor_id=user_id
        )
        await self.event_store.append(event)
        
        logger.info(f"Escrow hold of ${amount} for user {user_id}")
        
        return True
    
    async def release_escrow(self, user_id: str, amount: float, to_user_id: str, trade_id: Optional[str] = None) -> bool:
        """Release escrow funds to another user"""
        if amount <= 0:
            raise ValueError("Release amount must be positive")
        
        wallet = await self.wallets.find_one({"user_id": user_id})
        if not wallet:
            raise ValueError("Source wallet not found")
        
        if wallet["escrow_balance"] < amount:
            raise ValueError("Insufficient escrow balance")
        
        # Get or create recipient wallet
        recipient_wallet = await self.wallets.find_one({"user_id": to_user_id})
        if not recipient_wallet:
            await self.get_or_create_wallet(to_user_id)
            recipient_wallet = await self.wallets.find_one({"user_id": to_user_id})
        
        now = datetime.now(timezone.utc)
        
        # Deduct from source escrow
        await self.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {"escrow_balance": -amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Add to recipient available
        await self.wallets.update_one(
            {"user_id": to_user_id},
            {
                "$inc": {"available_balance": amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Record event
        event = create_event(
            EventType.WALLET_ESCROW_RELEASE,
            "wallet",
            wallet["id"],
            {"amount": amount, "to_user_id": to_user_id, "trade_id": trade_id},
            actor_id="system"
        )
        await self.event_store.append(event)
        
        logger.info(f"Escrow release of ${amount} from {user_id} to {to_user_id}")
        
        return True
    
    async def collect_platform_fee(self, user_id: str, amount: float, source: str, source_id: str) -> bool:
        """Collect platform fee from user's wallet"""
        if amount <= 0:
            return True  # No fee to collect
        
        wallet = await self.wallets.find_one({"user_id": user_id})
        if not wallet:
            raise ValueError("Wallet not found")
        
        # Fee comes from available balance
        if wallet["available_balance"] < amount:
            raise ValueError("Insufficient balance for fee")
        
        now = datetime.now(timezone.utc)
        
        await self.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    "available_balance": -amount,
                    "total_fees_paid": amount
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Record transaction
        new_balance = wallet["available_balance"] - amount
        await self._record_transaction(
            wallet["id"],
            user_id,
            TransactionType.PLATFORM_FEE,
            -amount,
            new_balance,
            f"Platform fee for {source}",
            related_trade_id=source_id if source == "trade" else None,
            related_razz_id=source_id if source == "razz" else None
        )
        
        # Record event
        event = create_event(
            EventType.WALLET_FEE_COLLECTED,
            "wallet",
            wallet["id"],
            {"amount": amount, "source": source, "source_id": source_id},
            actor_id="system"
        )
        await self.event_store.append(event)
        
        logger.info(f"Platform fee of ${amount} collected from {user_id}")
        
        return True
    
    async def get_transactions(self, user_id: str, limit: int = 50) -> List[TransactionResponse]:
        """Get user's transaction history"""
        cursor = self.transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        txs = await cursor.to_list(length=limit)
        return [self._tx_to_response(tx) for tx in txs]
    
    async def get_platform_balance(self) -> float:
        """Get total platform fees collected (admin only)"""
        pipeline = [
            {"$match": {"type": TransactionType.PLATFORM_FEE.value}},
            {"$group": {"_id": None, "total": {"$sum": {"$abs": "$amount"}}}}
        ]
        
        result = await self.transactions.aggregate(pipeline).to_list(length=1)
        return result[0]["total"] if result else 0.0
