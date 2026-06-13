"""
Slabby Payments Routes
Project Marvel - Stripe Connect Integration
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import os
import uuid

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)
from routes.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

# Deposit amount packages (defined server-side for security)
DEPOSIT_PACKAGES = {
    "small": 25.00,
    "medium": 50.00,
    "large": 100.00,
    "xl": 250.00,
    "xxl": 500.00,
    "custom": None  # For custom amounts (admin only or verified users)
}


class DepositRequest(BaseModel):
    package_id: str  # small, medium, large, xl, xxl
    origin_url: str  # Frontend origin for redirect URLs


class CustomDepositRequest(BaseModel):
    amount: float
    origin_url: str


class CheckoutStatusRequest(BaseModel):
    session_id: str


@router.post("/deposit/checkout")
async def create_deposit_checkout(
    data: DepositRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a Stripe checkout session for wallet deposit"""
    from server import db
    
    # Validate package
    if data.package_id not in DEPOSIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    amount = DEPOSIT_PACKAGES[data.package_id]
    if amount is None:
        raise HTTPException(status_code=400, detail="Custom amounts require verification")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    # Build URLs
    success_url = f"{data.origin_url}/wallet?session_id={{CHECKOUT_SESSION_ID}}&status=success"
    cancel_url = f"{data.origin_url}/wallet?status=cancelled"
    
    # Initialize Stripe
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user["id"],
            "type": "wallet_deposit",
            "package_id": data.package_id
        }
    )
    
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "session_id": session.session_id,
            "amount": amount,
            "currency": "usd",
            "type": "deposit",
            "payment_status": "pending",
            "status": "initiated",
            "metadata": {
                "package_id": data.package_id,
                "source": "stripe_checkout"
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")


@router.get("/deposit/status/{session_id}")
async def get_deposit_status(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Check status of a deposit checkout session"""
    from server import db, wallet_service
    
    # Find transaction
    transaction = await db.payment_transactions.find_one({
        "session_id": session_id,
        "user_id": current_user["id"]
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return current status
    if transaction["payment_status"] == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "amount": transaction["amount"],
            "message": "Deposit already credited"
        }
    
    # Check with Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If paid and not already credited, credit the wallet
        if status.payment_status == "paid" and transaction["payment_status"] != "paid":
            await wallet_service.deposit(
                current_user["id"], 
                transaction["amount"],
                reference=f"stripe:{session_id}"
            )
            
            # Mark as credited
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"credited": True}}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": transaction["amount"],
            "currency": transaction["currency"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")


@router.get("/packages")
async def get_deposit_packages():
    """Get available deposit packages"""
    packages = []
    for pkg_id, amount in DEPOSIT_PACKAGES.items():
        if amount is not None:
            packages.append({
                "id": pkg_id,
                "amount": amount,
                "label": f"${amount:.2f}"
            })
    return {"packages": packages}


# Stripe webhook handler (registered at root level in server.py)
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from server import db, wallet_service
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        return {"status": "not_configured"}
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process the webhook event
        if webhook_response.payment_status == "paid":
            # Find and update transaction
            transaction = await db.payment_transactions.find_one({
                "session_id": webhook_response.session_id
            })
            
            if transaction and not transaction.get("credited"):
                # Credit wallet
                await wallet_service.deposit(
                    transaction["user_id"],
                    transaction["amount"],
                    reference=f"stripe:{webhook_response.session_id}"
                )
                
                # Mark as credited
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "complete",
                        "credited": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"status": "received", "event_type": webhook_response.event_type}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
