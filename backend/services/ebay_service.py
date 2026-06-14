"""
eBay API Integration Service
Handles listing lookups, price comparison, and cross-posting
"""

import os
import httpx
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class EbayService:
    """eBay API integration for marketplace operations"""
    
    def __init__(self, db):
        self.db = db
        self.app_id = os.environ.get('EBAY_APP_ID')
        self.cert_id = os.environ.get('EBAY_CERT_ID')
        self.dev_id = os.environ.get('EBAY_DEV_ID')
        self.redirect_uri = os.environ.get('EBAY_REDIRECT_URI')
        self.sandbox = os.environ.get('EBAY_SANDBOX', 'true').lower() == 'true'
        
        # API endpoints
        if self.sandbox:
            self.auth_url = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
            self.api_url = "https://api.sandbox.ebay.com"
        else:
            self.auth_url = "https://api.ebay.com/identity/v1/oauth2/token"
            self.api_url = "https://api.ebay.com"
        
        self._access_token = None
        self._token_expires = None
    
    def is_configured(self) -> bool:
        """Check if eBay credentials are configured"""
        return bool(self.app_id and self.cert_id)
    
    async def _get_access_token(self) -> Optional[str]:
        """Get OAuth access token for eBay API"""
        if not self.is_configured():
            logger.warning("eBay API not configured")
            return None
        
        # Return cached token if still valid
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._access_token
        
        try:
            # Create auth header
            credentials = f"{self.app_id}:{self.cert_id}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {encoded_credentials}"
            }
            
            data = {
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(self.auth_url, headers=headers, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    self._access_token = result.get("access_token")
                    expires_in = result.get("expires_in", 7200)
                    self._token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                    return self._access_token
                else:
                    logger.error(f"eBay auth failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"eBay auth error: {str(e)}")
            return None
    
    async def search_listings(
        self,
        query: str,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        condition: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Search eBay listings for price comparison
        
        Args:
            query: Search term (e.g., "PSA 10 Charizard")
            category_id: eBay category ID (212 = Sports Trading Cards)
            min_price: Minimum price filter
            max_price: Maximum price filter
            condition: Item condition (NEW, USED, etc.)
            limit: Number of results
        """
        token = await self._get_access_token()
        if not token:
            return {"success": False, "error": "eBay API not configured or auth failed"}
        
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
            }
            
            # Build search URL
            url = f"{self.api_url}/buy/browse/v1/item_summary/search"
            params = {
                "q": query,
                "limit": limit,
                "sort": "price"
            }
            
            # Add filters
            filters = []
            if category_id:
                params["category_ids"] = category_id
            if min_price:
                filters.append(f"price:[{min_price}..]")
            if max_price:
                filters.append(f"price:[..{max_price}]")
            if condition:
                filters.append(f"conditionIds:{{{condition}}}")
            
            if filters:
                params["filter"] = ",".join(filters)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("itemSummaries", [])
                    
                    # Process and standardize results
                    listings = []
                    for item in items:
                        price = item.get("price", {})
                        listings.append({
                            "ebay_id": item.get("itemId"),
                            "title": item.get("title"),
                            "price": float(price.get("value", 0)),
                            "currency": price.get("currency", "USD"),
                            "condition": item.get("condition"),
                            "image_url": item.get("image", {}).get("imageUrl"),
                            "item_url": item.get("itemWebUrl"),
                            "seller": item.get("seller", {}).get("username"),
                            "location": item.get("itemLocation", {}).get("country")
                        })
                    
                    return {
                        "success": True,
                        "total": data.get("total", len(listings)),
                        "listings": listings
                    }
                else:
                    logger.error(f"eBay search failed: {response.status_code}")
                    return {"success": False, "error": f"eBay API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"eBay search error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_item_details(self, item_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific eBay listing"""
        token = await self._get_access_token()
        if not token:
            return {"success": False, "error": "eBay API not configured"}
        
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
            }
            
            url = f"{self.api_url}/buy/browse/v1/item/{item_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    item = response.json()
                    return {
                        "success": True,
                        "item": {
                            "ebay_id": item.get("itemId"),
                            "title": item.get("title"),
                            "description": item.get("description"),
                            "price": item.get("price", {}),
                            "condition": item.get("condition"),
                            "images": [img.get("imageUrl") for img in item.get("image", {}).get("imageUrls", [])],
                            "seller": item.get("seller"),
                            "shipping": item.get("shippingOptions", []),
                            "returns": item.get("returnTerms"),
                            "item_url": item.get("itemWebUrl")
                        }
                    }
                else:
                    return {"success": False, "error": f"Item not found: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"eBay item details error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_price_analysis(self, query: str, grading_company: str = None) -> Dict[str, Any]:
        """
        Get price analysis for a card based on recent eBay sales
        
        Args:
            query: Card name/description
            grading_company: PSA, BGS, CGC, etc.
        """
        search_query = query
        if grading_company:
            search_query = f"{grading_company} {query}"
        
        result = await self.search_listings(search_query, limit=50)
        
        if not result.get("success"):
            return result
        
        listings = result.get("listings", [])
        if not listings:
            return {"success": True, "analysis": None, "message": "No listings found"}
        
        prices = [l["price"] for l in listings if l["price"] > 0]
        
        if not prices:
            return {"success": True, "analysis": None, "message": "No valid prices found"}
        
        prices.sort()
        
        analysis = {
            "query": search_query,
            "sample_size": len(prices),
            "lowest": prices[0],
            "highest": prices[-1],
            "average": sum(prices) / len(prices),
            "median": prices[len(prices) // 2],
            "price_range": {
                "low_end": prices[int(len(prices) * 0.25)] if len(prices) > 4 else prices[0],
                "high_end": prices[int(len(prices) * 0.75)] if len(prices) > 4 else prices[-1]
            }
        }
        
        return {"success": True, "analysis": analysis, "sample_listings": listings[:5]}
    
    async def save_price_check(self, card_id: str, user_id: str, analysis: Dict) -> str:
        """Save a price check result for reference"""
        doc = {
            "card_id": card_id,
            "user_id": user_id,
            "analysis": analysis,
            "created_at": datetime.utcnow()
        }
        result = await self.db.price_checks.insert_one(doc)
        return str(result.inserted_id)
