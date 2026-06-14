"""
Enhanced eBay API Routes
Price comparison, listing lookup, and market analysis
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.append('..')

router = APIRouter(prefix="/ebay", tags=["ebay"])

def get_ebay_service():
    from server import db
    from services.ebay_service import EbayService
    return EbayService(db)

class SearchRequest(BaseModel):
    query: str
    category_id: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    condition: Optional[str] = None
    limit: int = 20

class PriceAnalysisRequest(BaseModel):
    query: str
    grading_company: Optional[str] = None

@router.get("/search")
async def search_ebay_listings(
    q: str = Query(..., description="Search query (e.g., 'PSA 10 Charizard')"),
    category: Optional[str] = Query(None, description="eBay category ID"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    limit: int = Query(20, le=50)
):
    """
    Search eBay listings for price comparison
    
    Category IDs:
    - 212: Sports Trading Cards
    - 183454: Gaming Trading Cards
    """
    service = get_ebay_service()
    result = await service.search_listings(
        query=q,
        category_id=category,
        min_price=min_price,
        max_price=max_price,
        limit=limit
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/search")
async def search_ebay_listings_post(request: SearchRequest):
    """Search eBay listings (POST method)"""
    service = get_ebay_service()
    result = await service.search_listings(
        query=request.query,
        category_id=request.category_id,
        min_price=request.min_price,
        max_price=request.max_price,
        limit=request.limit
    )
    return result

@router.get("/item/{item_id}")
async def get_ebay_item(item_id: str):
    """Get detailed information about a specific eBay listing"""
    service = get_ebay_service()
    result = await service.get_item_details(item_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))
    
    return result

@router.get("/price-analysis")
async def get_price_analysis(
    q: str = Query(..., description="Card search query"),
    grading_company: Optional[str] = Query(None, description="PSA, BGS, CGC")
):
    """
    Get market price analysis for a card
    
    Returns:
    - Lowest, highest, average, median prices
    - Price range recommendations
    - Sample listings
    """
    service = get_ebay_service()
    result = await service.get_price_analysis(q, grading_company)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/price-analysis")
async def get_price_analysis_post(request: PriceAnalysisRequest):
    """Get price analysis (POST method)"""
    service = get_ebay_service()
    result = await service.get_price_analysis(
        request.query,
        request.grading_company
    )
    return result

@router.get("/status")
async def ebay_service_status():
    """Check eBay API configuration status"""
    service = get_ebay_service()
    return {
        "configured": service.is_configured(),
        "sandbox_mode": service.sandbox,
        "status": "operational" if service.is_configured() else "not_configured"
    }
