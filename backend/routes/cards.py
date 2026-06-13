"""
Slabby Card Routes
Project Marvel - Card Management API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from models.card import CardCreate, CardUpdate, CardResponse, CardStatus, CardCategory, CardCondition
from services.card_service import CardService
from routes.auth import get_current_user

router = APIRouter(prefix="/cards", tags=["Cards"])


def get_card_service():
    """Dependency to get card service - set by main app"""
    from server import card_service
    return card_service


@router.post("", response_model=CardResponse)
async def create_card(
    data: CardCreate,
    current_user: dict = Depends(get_current_user),
    card_service: CardService = Depends(get_card_service)
):
    """Create a new card listing (draft)"""
    return await card_service.create(current_user["id"], data)


@router.get("", response_model=List[CardResponse])
async def search_cards(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[CardCategory] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[CardCondition] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    card_service: CardService = Depends(get_card_service)
):
    """Search available cards in marketplace"""
    return await card_service.search(
        query=q,
        category=category,
        min_price=min_price,
        max_price=max_price,
        condition=condition,
        limit=limit,
        offset=offset
    )


@router.get("/my-cards", response_model=List[CardResponse])
async def get_my_cards(
    status: Optional[CardStatus] = None,
    current_user: dict = Depends(get_current_user),
    card_service: CardService = Depends(get_card_service)
):
    """Get current user's cards"""
    return await card_service.get_user_cards(current_user["id"], status)


@router.get("/trending", response_model=List[CardResponse])
async def get_trending_cards(
    category: Optional[CardCategory] = None,
    limit: int = Query(20, le=50),
    card_service: CardService = Depends(get_card_service)
):
    """Get trending cards"""
    return await card_service.get_trending(category, limit)


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: str,
    card_service: CardService = Depends(get_card_service)
):
    """Get card details"""
    card = await card_service.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card_service._card_to_response(card)


@router.put("/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: str,
    updates: CardUpdate,
    current_user: dict = Depends(get_current_user),
    card_service: CardService = Depends(get_card_service)
):
    """Update card details"""
    result = await card_service.update(card_id, current_user["id"], updates)
    if not result:
        raise HTTPException(status_code=404, detail="Card not found or not owned by you")
    return result


@router.post("/{card_id}/publish", response_model=CardResponse)
async def publish_card(
    card_id: str,
    current_user: dict = Depends(get_current_user),
    card_service: CardService = Depends(get_card_service)
):
    """Publish card to marketplace"""
    try:
        result = await card_service.publish(card_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Card not found or not owned by you")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{card_id}/unlist", response_model=CardResponse)
async def unlist_card(
    card_id: str,
    current_user: dict = Depends(get_current_user),
    card_service: CardService = Depends(get_card_service)
):
    """Remove card from marketplace"""
    try:
        result = await card_service.unlist(card_id, current_user["id"])
        if not result:
            raise HTTPException(status_code=404, detail="Card not found or not owned by you")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
