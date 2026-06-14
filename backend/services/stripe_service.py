"""
Stripe Payment Service
Enhanced payment processing, Connect payouts, and escrow management
"""

import os
import stripe
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

logger = logging.getLogger(__name__)

class StripeService:
    """Comprehensive Stripe payment integration"""
    
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get('STRIPE_API_KEY')
        self.webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        
        if self.api_key:
            stripe.api_key = self.api_key
        
        # Platform fee percentage (e.g., 5%)
        self.platform_fee_percent = float(os.environ.get('STRIPE_PLATFORM_FEE', '5'))
    
    def is_configured(self) -> bool:
        """Check if Stripe is configured"""
        return bool(self.api_key)
    
    def is_live_mode(self) -> bool:
        """Check if using live keys"""
        return self.api_key and self.api_key.startswith('sk_live_')
    
    # ==================== CUSTOMER MANAGEMENT ====================
    
    async def create_customer(self, user_id: str, email: str, name: str = None) -> Dict[str, Any]:
        """Create a Stripe customer for a user"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"user_id": user_id}
            )
            
            # Save customer ID
            await self.db.users.update_one(
                {"id": user_id},
                {"$set": {"stripe_customer_id": customer.id}}
            )
            
            return {"success": True, "customer_id": customer.id}
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe create customer error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_or_create_customer(self, user_id: str, email: str, name: str = None) -> Optional[str]:
        """Get existing customer or create new one"""
        user = await self.db.users.find_one({"id": user_id})
        
        if user and user.get("stripe_customer_id"):
            return user["stripe_customer_id"]
        
        result = await self.create_customer(user_id, email, name)
        return result.get("customer_id") if result.get("success") else None
    
    # ==================== PAYMENT INTENTS ====================
    
    async def create_payment_intent(
        self,
        amount_cents: int,
        customer_id: str,
        metadata: Dict = None,
        description: str = None
    ) -> Dict[str, Any]:
        """Create a payment intent for one-time payment"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                customer=customer_id,
                metadata=metadata or {},
                description=description,
                automatic_payment_methods={"enabled": True}
            )
            
            return {
                "success": True,
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def confirm_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm a payment intent"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "success": True,
                "status": intent.status,
                "amount": intent.amount,
                "paid": intent.status == "succeeded"
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    # ==================== CHECKOUT SESSIONS ====================
    
    async def create_checkout_session(
        self,
        user_id: str,
        amount_cents: int,
        success_url: str,
        cancel_url: str,
        metadata: Dict = None,
        description: str = "Slabby Wallet Deposit"
    ) -> Dict[str, Any]:
        """Create a Stripe Checkout session for deposits"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": description,
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": user_id,
                    "type": "wallet_deposit",
                    **(metadata or {})
                }
            )
            
            # Save session record
            await self.db.payment_sessions.insert_one({
                "session_id": session.id,
                "user_id": user_id,
                "amount_cents": amount_cents,
                "status": "pending",
                "created_at": datetime.utcnow()
            })
            
            return {
                "success": True,
                "session_id": session.id,
                "checkout_url": session.url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout session error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ==================== STRIPE CONNECT ====================
    
    async def create_connect_account(
        self,
        user_id: str,
        email: str,
        country: str = "US"
    ) -> Dict[str, Any]:
        """Create a Stripe Connect account for seller payouts"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            account = stripe.Account.create(
                type="express",
                country=country,
                email=email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True}
                },
                metadata={"user_id": user_id}
            )
            
            # Save connect account ID
            await self.db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "stripe_connect_id": account.id,
                    "stripe_connect_status": "pending"
                }}
            )
            
            return {
                "success": True,
                "account_id": account.id,
                "status": "pending"
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Connect account error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_connect_onboarding_link(
        self,
        account_id: str,
        return_url: str,
        refresh_url: str
    ) -> Dict[str, Any]:
        """Create onboarding link for Connect account"""
        try:
            link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding"
            )
            
            return {
                "success": True,
                "onboarding_url": link.url,
                "expires_at": link.expires_at
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    async def get_connect_account_status(self, account_id: str) -> Dict[str, Any]:
        """Get Connect account status and capabilities"""
        try:
            account = stripe.Account.retrieve(account_id)
            
            return {
                "success": True,
                "account_id": account.id,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "capabilities": dict(account.capabilities) if account.capabilities else {}
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    async def create_transfer(
        self,
        amount_cents: int,
        destination_account_id: str,
        description: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """Transfer funds to a Connect account (payout to seller)"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=destination_account_id,
                description=description,
                metadata=metadata or {}
            )
            
            return {
                "success": True,
                "transfer_id": transfer.id,
                "amount": transfer.amount,
                "status": "completed"
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe transfer error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_payout(
        self,
        account_id: str,
        amount_cents: int
    ) -> Dict[str, Any]:
        """Create a payout from Connect account to bank"""
        try:
            payout = stripe.Payout.create(
                amount=amount_cents,
                currency="usd",
                stripe_account=account_id
            )
            
            return {
                "success": True,
                "payout_id": payout.id,
                "amount": payout.amount,
                "status": payout.status,
                "arrival_date": payout.arrival_date
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    # ==================== ESCROW / HELD PAYMENTS ====================
    
    async def create_escrow_payment(
        self,
        buyer_id: str,
        seller_id: str,
        amount_cents: int,
        order_id: str,
        description: str
    ) -> Dict[str, Any]:
        """Create an escrow payment (held until release)"""
        if not self.is_configured():
            return {"success": False, "error": "Stripe not configured"}
        
        try:
            # Get seller's Connect account
            seller = await self.db.users.find_one({"id": seller_id})
            if not seller or not seller.get("stripe_connect_id"):
                return {"success": False, "error": "Seller not set up for payments"}
            
            # Calculate platform fee
            fee_amount = int(amount_cents * self.platform_fee_percent / 100)
            
            # Create payment intent with transfer_data for later transfer
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                transfer_data={
                    "destination": seller["stripe_connect_id"]
                },
                application_fee_amount=fee_amount,
                metadata={
                    "order_id": order_id,
                    "buyer_id": buyer_id,
                    "seller_id": seller_id,
                    "type": "escrow"
                },
                description=description,
                capture_method="manual"  # Don't capture immediately
            )
            
            # Save escrow record
            escrow_id = str(uuid.uuid4())
            await self.db.escrow_payments.insert_one({
                "id": escrow_id,
                "payment_intent_id": intent.id,
                "order_id": order_id,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "amount_cents": amount_cents,
                "fee_cents": fee_amount,
                "status": "pending",
                "created_at": datetime.utcnow()
            })
            
            return {
                "success": True,
                "escrow_id": escrow_id,
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "amount": amount_cents,
                "fee": fee_amount
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe escrow error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def capture_escrow(self, escrow_id: str) -> Dict[str, Any]:
        """Capture/release an escrow payment to seller"""
        escrow = await self.db.escrow_payments.find_one({"id": escrow_id})
        if not escrow:
            return {"success": False, "error": "Escrow not found"}
        
        try:
            intent = stripe.PaymentIntent.capture(escrow["payment_intent_id"])
            
            await self.db.escrow_payments.update_one(
                {"id": escrow_id},
                {"$set": {"status": "released", "released_at": datetime.utcnow()}}
            )
            
            return {
                "success": True,
                "status": "released",
                "amount": intent.amount
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    async def refund_escrow(self, escrow_id: str, reason: str = None) -> Dict[str, Any]:
        """Refund an escrow payment to buyer"""
        escrow = await self.db.escrow_payments.find_one({"id": escrow_id})
        if not escrow:
            return {"success": False, "error": "Escrow not found"}
        
        try:
            intent = stripe.PaymentIntent.cancel(escrow["payment_intent_id"])
            
            await self.db.escrow_payments.update_one(
                {"id": escrow_id},
                {"$set": {
                    "status": "refunded",
                    "refund_reason": reason,
                    "refunded_at": datetime.utcnow()
                }}
            )
            
            return {"success": True, "status": "refunded"}
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    # ==================== WEBHOOK HANDLING ====================
    
    def verify_webhook(self, payload: bytes, signature: str) -> Optional[Dict]:
        """Verify and parse webhook payload"""
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured")
            return None
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except stripe.error.SignatureVerificationError:
            logger.error("Webhook signature verification failed")
            return None
    
    async def handle_webhook_event(self, event: Dict) -> Dict[str, Any]:
        """Process webhook event"""
        event_type = event.get("type")
        data = event.get("data", {}).get("object", {})
        
        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "payment_intent.succeeded": self._handle_payment_succeeded,
            "payment_intent.payment_failed": self._handle_payment_failed,
            "account.updated": self._handle_connect_account_updated,
            "transfer.created": self._handle_transfer_created,
            "payout.paid": self._handle_payout_completed
        }
        
        handler = handlers.get(event_type)
        if handler:
            return await handler(data)
        
        return {"success": True, "handled": False}
    
    async def _handle_checkout_completed(self, session: Dict) -> Dict:
        """Handle completed checkout session"""
        session_id = session.get("id")
        user_id = session.get("metadata", {}).get("user_id")
        amount = session.get("amount_total", 0)
        
        # Update session status
        await self.db.payment_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )
        
        # Credit user's wallet
        if user_id:
            await self.db.wallets.update_one(
                {"user_id": user_id},
                {"$inc": {"balance": amount / 100}},  # Convert cents to dollars
                upsert=True
            )
        
        return {"success": True, "action": "wallet_credited"}
    
    async def _handle_payment_succeeded(self, intent: Dict) -> Dict:
        """Handle successful payment"""
        metadata = intent.get("metadata", {})
        
        if metadata.get("type") == "escrow":
            await self.db.escrow_payments.update_one(
                {"payment_intent_id": intent["id"]},
                {"$set": {"status": "captured", "captured_at": datetime.utcnow()}}
            )
        
        return {"success": True}
    
    async def _handle_payment_failed(self, intent: Dict) -> Dict:
        """Handle failed payment"""
        return {"success": True, "status": "payment_failed"}
    
    async def _handle_connect_account_updated(self, account: Dict) -> Dict:
        """Handle Connect account status changes"""
        account_id = account.get("id")
        
        await self.db.users.update_one(
            {"stripe_connect_id": account_id},
            {"$set": {
                "stripe_connect_status": "active" if account.get("charges_enabled") else "pending",
                "stripe_payouts_enabled": account.get("payouts_enabled", False)
            }}
        )
        
        return {"success": True}
    
    async def _handle_transfer_created(self, transfer: Dict) -> Dict:
        """Handle transfer to seller"""
        return {"success": True, "transfer_id": transfer.get("id")}
    
    async def _handle_payout_completed(self, payout: Dict) -> Dict:
        """Handle completed payout to bank"""
        return {"success": True, "payout_id": payout.get("id")}
    
    # ==================== BALANCE & REPORTING ====================
    
    async def get_platform_balance(self) -> Dict[str, Any]:
        """Get platform's Stripe balance"""
        try:
            balance = stripe.Balance.retrieve()
            
            available = sum(b.amount for b in balance.available)
            pending = sum(b.amount for b in balance.pending)
            
            return {
                "success": True,
                "available_cents": available,
                "pending_cents": pending,
                "currency": "usd"
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
    
    async def get_connect_balance(self, account_id: str) -> Dict[str, Any]:
        """Get a Connect account's balance"""
        try:
            balance = stripe.Balance.retrieve(stripe_account=account_id)
            
            available = sum(b.amount for b in balance.available)
            pending = sum(b.amount for b in balance.pending)
            
            return {
                "success": True,
                "available_cents": available,
                "pending_cents": pending
            }
            
        except stripe.error.StripeError as e:
            return {"success": False, "error": str(e)}
