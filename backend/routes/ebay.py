"""
Slabby eBay Routes
Project Marvel - eBay Market Data Integration (Prepared)

NOTE: This module is prepared but requires eBay API credentials to function.
Set EBAY_APP_ID in .env when ready.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import os
import httpx

router = APIRouter(prefix="/ebay", tags=["eBay Market Data"])


class EbayListing(BaseModel):
    item_id: str
    title: str
    price: float
    currency: str
    condition: str
    seller: str
    listing_type: str  # auction, buy_it_now
    image_url: Optional[str] = None
    end_time: Optional[str] = None
    bid_count: Optional[int] = None


class EbaySearchResponse(BaseModel):
    items: List[EbayListing]
    total_results: int
    page: int
    page_size: int


class EbayPriceHistory(BaseModel):
    avg_price: float
    min_price: float
    max_price: float
    sample_size: int
    period_days: int


def check_ebay_configured():
    """Check if eBay API is configured"""
    app_id = os.environ.get('EBAY_APP_ID')
    if not app_id:
        raise HTTPException(
            status_code=503, 
            detail="eBay API not configured. Please provide EBAY_APP_ID in environment variables."
        )
    return app_id


@router.get("/search", response_model=EbaySearchResponse)
async def search_ebay_listings(
    q: str = Query(..., description="Search query (e.g., 'Victor Wembanyama Prizm')"),
    category: Optional[str] = Query(None, description="Card category"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = Query(None, description="Condition: new, graded, raw"),
    listing_type: Optional[str] = Query(None, description="auction or buy_it_now"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Search eBay for card listings (requires EBAY_APP_ID).
    
    This endpoint allows searching eBay's marketplace for comparable card listings
    to help users price their cards appropriately.
    """
    app_id = check_ebay_configured()
    
    # Build eBay Finding API request
    # Using eBay Finding API: findItemsAdvanced
    base_url = "https://svcs.ebay.com/services/search/FindingService/v1"
    
    params = {
        "OPERATION-NAME": "findItemsAdvanced",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": app_id,
        "RESPONSE-DATA-FORMAT": "JSON",
        "REST-PAYLOAD": "",
        "keywords": q,
        "paginationInput.entriesPerPage": page_size,
        "paginationInput.pageNumber": page,
    }
    
    # Add category filter (Sports Trading Cards = 212)
    if category:
        category_map = {
            "basketball": "214",
            "baseball": "213",
            "football": "215",
            "hockey": "216",
            "pokemon": "183454"
        }
        if category.lower() in category_map:
            params["categoryId"] = category_map[category.lower()]
    
    # Add price filters
    filter_idx = 0
    if min_price is not None:
        params[f"itemFilter({filter_idx}).name"] = "MinPrice"
        params[f"itemFilter({filter_idx}).value"] = min_price
        params[f"itemFilter({filter_idx}).paramName"] = "Currency"
        params[f"itemFilter({filter_idx}).paramValue"] = "USD"
        filter_idx += 1
    
    if max_price is not None:
        params[f"itemFilter({filter_idx}).name"] = "MaxPrice"
        params[f"itemFilter({filter_idx}).value"] = max_price
        params[f"itemFilter({filter_idx}).paramName"] = "Currency"
        params[f"itemFilter({filter_idx}).paramValue"] = "USD"
        filter_idx += 1
    
    if listing_type == "auction":
        params[f"itemFilter({filter_idx}).name"] = "ListingType"
        params[f"itemFilter({filter_idx}).value"] = "Auction"
        filter_idx += 1
    elif listing_type == "buy_it_now":
        params[f"itemFilter({filter_idx}).name"] = "ListingType"
        params[f"itemFilter({filter_idx}).value"] = "FixedPrice"
        filter_idx += 1
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        # Parse eBay response
        result = data.get("findItemsAdvancedResponse", [{}])[0]
        search_result = result.get("searchResult", [{}])[0]
        items_data = search_result.get("item", [])
        total_entries = int(result.get("paginationOutput", [{}])[0].get("totalEntries", ["0"])[0])
        
        items = []
        for item in items_data:
            try:
                listing = EbayListing(
                    item_id=item.get("itemId", [""])[0],
                    title=item.get("title", [""])[0],
                    price=float(item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("__value__", 0)),
                    currency=item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("@currencyId", "USD"),
                    condition=item.get("condition", [{}])[0].get("conditionDisplayName", ["Unknown"])[0] if item.get("condition") else "Unknown",
                    seller=item.get("sellerInfo", [{}])[0].get("sellerUserName", [""])[0] if item.get("sellerInfo") else "",
                    listing_type="auction" if item.get("listingInfo", [{}])[0].get("listingType", [""])[0] == "Auction" else "buy_it_now",
                    image_url=item.get("galleryURL", [None])[0],
                    end_time=item.get("listingInfo", [{}])[0].get("endTime", [None])[0],
                    bid_count=int(item.get("sellingStatus", [{}])[0].get("bidCount", ["0"])[0]) if item.get("sellingStatus", [{}])[0].get("bidCount") else None
                )
                items.append(listing)
            except Exception:
                continue
        
        return EbaySearchResponse(
            items=items,
            total_results=total_entries,
            page=page,
            page_size=page_size
        )
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"eBay API error: {str(e)}")


@router.get("/price-history")
async def get_price_history(
    q: str = Query(..., description="Search query for sold listings"),
    days: int = Query(90, ge=7, le=365, description="Number of days to look back")
):
    """
    Get price history for sold listings (requires EBAY_APP_ID).
    
    This searches completed/sold listings to provide market pricing data.
    """
    app_id = check_ebay_configured()
    
    base_url = "https://svcs.ebay.com/services/search/FindingService/v1"
    
    params = {
        "OPERATION-NAME": "findCompletedItems",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": app_id,
        "RESPONSE-DATA-FORMAT": "JSON",
        "REST-PAYLOAD": "",
        "keywords": q,
        "paginationInput.entriesPerPage": 100,
        "itemFilter(0).name": "SoldItemsOnly",
        "itemFilter(0).value": "true",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        result = data.get("findCompletedItemsResponse", [{}])[0]
        search_result = result.get("searchResult", [{}])[0]
        items = search_result.get("item", [])
        
        prices = []
        for item in items:
            try:
                price = float(item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("__value__", 0))
                if price > 0:
                    prices.append(price)
            except:
                continue
        
        if not prices:
            return EbayPriceHistory(
                avg_price=0,
                min_price=0,
                max_price=0,
                sample_size=0,
                period_days=days
            )
        
        return EbayPriceHistory(
            avg_price=round(sum(prices) / len(prices), 2),
            min_price=min(prices),
            max_price=max(prices),
            sample_size=len(prices),
            period_days=days
        )
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"eBay API error: {str(e)}")


@router.get("/status")
async def get_ebay_status():
    """Check eBay API configuration status"""
    app_id = os.environ.get('EBAY_APP_ID')
    return {
        "configured": bool(app_id),
        "message": "eBay API ready" if app_id else "eBay API not configured. Set EBAY_APP_ID environment variable."
    }
