"""
PSA/Card Verification API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.append('..')

router = APIRouter(prefix="/verification", tags=["verification"])

# Import will be done at runtime to avoid circular imports
def get_psa_service():
    from server import db
    from services.psa_service import PSAService
    return PSAService(db)

class VerifyRequest(BaseModel):
    cert_number: str
    grading_company: str = "PSA"  # PSA, BGS, CGC

class SaveVerificationRequest(BaseModel):
    card_id: str
    cert_number: str
    grading_company: str = "PSA"

@router.post("/verify")
async def verify_certificate(request: VerifyRequest):
    """
    Verify a grading certificate number
    
    Supports:
    - PSA (Professional Sports Authenticator)
    - BGS (Beckett Grading Services)
    - CGC (Certified Guaranty Company)
    """
    service = get_psa_service()
    result = await service.verify_card(
        cert_number=request.cert_number,
        grading_company=request.grading_company
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/verify/{grading_company}/{cert_number}")
async def verify_certificate_get(grading_company: str, cert_number: str):
    """Quick verification via GET request"""
    service = get_psa_service()
    result = await service.verify_card(
        cert_number=cert_number,
        grading_company=grading_company.upper()
    )
    return result

@router.post("/save")
async def save_verification(request: SaveVerificationRequest):
    """
    Verify and save verification result for a card listing
    """
    service = get_psa_service()
    
    # First verify
    result = await service.verify_card(
        cert_number=request.cert_number,
        grading_company=request.grading_company
    )
    
    if result.get("verified"):
        # Save to database
        await service.save_verification(
            card_id=request.card_id,
            user_id="system",  # Will be replaced with actual user from auth
            result=result
        )
    
    return result

@router.get("/card/{card_id}")
async def get_card_verification(card_id: str):
    """Get saved verification for a card"""
    service = get_psa_service()
    verification = await service.get_verification(card_id)
    
    if not verification:
        raise HTTPException(status_code=404, detail="No verification found for this card")
    
    return verification

@router.get("/status")
async def verification_service_status():
    """Check verification service status"""
    service = get_psa_service()
    return {
        "psa_api_configured": service.is_configured(),
        "supported_companies": ["PSA", "BGS", "CGC"],
        "status": "operational"
    }
