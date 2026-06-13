"""
Slabby Wallet Routes
Project Marvel - Banking & Payment API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List

from models.wallet import WalletDeposit, WalletWithdrawal, WalletResponse, TransactionResponse
from services.wallet_service import WalletService
from routes.auth import get_current_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])


def get_wallet_service():
    """Dependency to get wallet service - set by main app"""
    from server import wallet_service
    return wallet_service


@router.get("", response_model=WalletResponse)
async def get_wallet(
    current_user: dict = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
):
    """Get current user's wallet"""
    wallet = await wallet_service.get_or_create_wallet(current_user["id"])
    return wallet


@router.post("/deposit", response_model=WalletResponse)
async def deposit(
    data: WalletDeposit,
    current_user: dict = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
):
    """Deposit funds to wallet"""
    try:
        # In production, this would integrate with Stripe
        # For now, simulate instant deposit
        return await wallet_service.deposit(current_user["id"], data.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdraw", response_model=WalletResponse)
async def withdraw(
    data: WalletWithdrawal,
    current_user: dict = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
):
    """Withdraw funds from wallet"""
    try:
        # In production, this would integrate with Stripe Connect
        return await wallet_service.withdraw(current_user["id"], data.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
):
    """Get wallet transaction history"""
    return await wallet_service.get_transactions(current_user["id"], limit)
