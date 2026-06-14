"""
Enhanced Stripe Payment Routes
Full payment processing, Connect payouts, and escrow management
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict
import sys
sys.path.append('..')

router = APIRouter(prefix="/payments", tags=["payments"])

def get_stripe_service():
    from server import db
    from services.stripe_service import StripeService
    return StripeService(db)

# ==================== REQUEST MODELS ====================

class DepositRequest(BaseModel):
    amount: float  # In dollars
    success_url: str
    cancel_url: str

class ConnectOnboardRequest(BaseModel):
    return_url: str
    refresh_url: str

class EscrowRequest(BaseModel):
    seller_id: str
    amount: float  # In dollars
    order_id: str
    description: str

class TransferRequest(BaseModel):
    seller_id: str
    amount: float  # In dollars
    description: Optional[str] = None

class PayoutRequest(BaseModel):
    amount: float  # In dollars

# ==================== DEPOSIT / CHECKOUT ====================

@router.post("/deposit")
async def create_deposit_session(request: DepositRequest):
    """
    Create a Stripe Checkout session for wallet deposit
    
    Returns checkout URL to redirect user
    """
    service = get_stripe_service()
    
    # TODO: Get user_id from auth token
    user_id = "demo_user"
    
    result = await service.create_checkout_session(
        user_id=user_id,
        amount_cents=int(request.amount * 100),
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

# ==================== STRIPE CONNECT ====================

@router.post("/connect/create")
async def create_connect_account(email: str):
    """
    Create a Stripe Connect account for seller payouts
    
    Required for sellers to receive payments
    """
    service = get_stripe_service()
    
    # TODO: Get user_id from auth token
    user_id = "demo_user"
    
    result = await service.create_connect_account(
        user_id=user_id,
        email=email
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/connect/onboarding")
async def get_connect_onboarding_link(request: ConnectOnboardRequest):
    """
    Get onboarding link for Connect account setup
    
    Redirect user to this URL to complete identity verification
    """
    service = get_stripe_service()
    
    # TODO: Get account_id from user's profile
    from server import db
    user = await db.users.find_one({"id": "demo_user"})
    
    if not user or not user.get("stripe_connect_id"):
        raise HTTPException(status_code=400, detail="No Connect account found")
    
    result = await service.create_connect_onboarding_link(
        account_id=user["stripe_connect_id"],
        return_url=request.return_url,
        refresh_url=request.refresh_url
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/connect/status")
async def get_connect_status():
    """Get current user's Connect account status"""
    service = get_stripe_service()
    
    # TODO: Get from auth
    from server import db
    user = await db.users.find_one({"id": "demo_user"})
    
    if not user or not user.get("stripe_connect_id"):
        return {
            "has_connect_account": False,
            "status": "not_created"
        }
    
    result = await service.get_connect_account_status(user["stripe_connect_id"])
    return result

# ==================== ESCROW PAYMENTS ====================

@router.post("/escrow/create")
async def create_escrow_payment(request: EscrowRequest):
    """
    Create an escrow payment for a transaction
    
    Funds are held until the transaction is completed
    """
    service = get_stripe_service()
    
    # TODO: Get buyer_id from auth
    buyer_id = "demo_buyer"
    
    result = await service.create_escrow_payment(
        buyer_id=buyer_id,
        seller_id=request.seller_id,
        amount_cents=int(request.amount * 100),
        order_id=request.order_id,
        description=request.description
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/escrow/{escrow_id}/release")
async def release_escrow(escrow_id: str):
    """
    Release escrow funds to seller
    
    Call this when transaction is completed successfully
    """
    service = get_stripe_service()
    result = await service.capture_escrow(escrow_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/escrow/{escrow_id}/refund")
async def refund_escrow(escrow_id: str, reason: Optional[str] = None):
    """
    Refund escrow payment to buyer
    
    Call this if transaction is cancelled or disputed
    """
    service = get_stripe_service()
    result = await service.refund_escrow(escrow_id, reason)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

# ==================== TRANSFERS & PAYOUTS ====================

@router.post("/transfer")
async def create_transfer(request: TransferRequest):
    """
    Transfer funds to a seller's Connect account
    
    Used for direct payouts outside of escrow
    """
    service = get_stripe_service()
    
    from server import db
    seller = await db.users.find_one({"id": request.seller_id})
    
    if not seller or not seller.get("stripe_connect_id"):
        raise HTTPException(status_code=400, detail="Seller not set up for payments")
    
    result = await service.create_transfer(
        amount_cents=int(request.amount * 100),
        destination_account_id=seller["stripe_connect_id"],
        description=request.description
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/payout")
async def create_payout(request: PayoutRequest):
    """
    Request payout from Connect account to bank
    
    Transfers funds from Stripe balance to linked bank account
    """
    service = get_stripe_service()
    
    # TODO: Get from auth
    from server import db
    user = await db.users.find_one({"id": "demo_user"})
    
    if not user or not user.get("stripe_connect_id"):
        raise HTTPException(status_code=400, detail="No Connect account found")
    
    result = await service.create_payout(
        account_id=user["stripe_connect_id"],
        amount_cents=int(request.amount * 100)
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

# ==================== BALANCE ====================

@router.get("/balance")
async def get_user_balance():
    """Get user's Connect account balance"""
    service = get_stripe_service()
    
    from server import db
    user = await db.users.find_one({"id": "demo_user"})
    
    if not user or not user.get("stripe_connect_id"):
        return {"available_cents": 0, "pending_cents": 0}
    
    result = await service.get_connect_balance(user["stripe_connect_id"])
    return result

@router.get("/platform/balance")
async def get_platform_balance():
    """Get platform's total Stripe balance (admin only)"""
    service = get_stripe_service()
    result = await service.get_platform_balance()
    return result

# ==================== WEBHOOKS ====================

@router.post("/webhook")
async def handle_webhook(request: Request):
    """
    Handle Stripe webhook events
    
    Processes:
    - checkout.session.completed
    - payment_intent.succeeded/failed
    - account.updated (Connect)
    - transfer.created
    - payout.paid
    """
    service = get_stripe_service()
    
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    
    event = service.verify_webhook(payload, signature)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    result = await service.handle_webhook_event(event)
    return result

# ==================== STATUS ====================

@router.get("/status")
async def payment_service_status():
    """Check payment service configuration"""
    service = get_stripe_service()
    return {
        "configured": service.is_configured(),
        "live_mode": service.is_live_mode(),
        "platform_fee_percent": service.platform_fee_percent,
        "status": "operational" if service.is_configured() else "not_configured"
    }
