"""
Shipping API Routes (USPS Integration)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
import sys
sys.path.append('..')

router = APIRouter(prefix="/shipping", tags=["shipping"])

def get_shipping_service():
    from server import db
    from services.shipping_service import USPSService
    return USPSService(db)

class AddressModel(BaseModel):
    name: str
    company: Optional[str] = ""
    address1: str
    address2: Optional[str] = ""
    city: str
    state: str
    zip: str
    phone: Optional[str] = ""

class RateRequest(BaseModel):
    origin_zip: str
    dest_zip: str
    weight_oz: float
    service_type: Optional[str] = "PRIORITY"

class LabelRequest(BaseModel):
    from_address: AddressModel
    to_address: AddressModel
    weight_oz: float
    service_type: str = "PRIORITY"
    order_id: Optional[str] = None
    description: str = "Trading Card"

class TrackingRequest(BaseModel):
    tracking_number: str

@router.get("/rates")
async def get_shipping_rates(
    origin_zip: str,
    dest_zip: str,
    weight_oz: float = 4.0
):
    """
    Get all available shipping rates
    
    Default weight is 4oz (typical for a graded card in protective case)
    """
    service = get_shipping_service()
    result = await service.get_all_rates(origin_zip, dest_zip, weight_oz)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/rate")
async def calculate_rate(request: RateRequest):
    """Calculate shipping rate for specific service"""
    service = get_shipping_service()
    result = await service.calculate_rate(
        origin_zip=request.origin_zip,
        dest_zip=request.dest_zip,
        weight_oz=request.weight_oz,
        service_type=request.service_type
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/label")
async def create_shipping_label(request: LabelRequest):
    """
    Create a shipping label
    
    Returns label as base64 encoded PDF
    """
    service = get_shipping_service()
    result = await service.create_label(
        from_address=request.from_address.dict(),
        to_address=request.to_address.dict(),
        weight_oz=request.weight_oz,
        service_type=request.service_type,
        description=request.description
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/track/{tracking_number}")
async def track_shipment(tracking_number: str):
    """
    Get tracking information for a shipment
    """
    service = get_shipping_service()
    result = await service.get_tracking(tracking_number)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/track")
async def track_shipment_post(request: TrackingRequest):
    """Track shipment (POST method)"""
    service = get_shipping_service()
    result = await service.get_tracking(request.tracking_number)
    return result

@router.post("/validate-address")
async def validate_address(address: AddressModel):
    """
    Validate and standardize a US address
    
    Returns USPS-standardized address format
    """
    service = get_shipping_service()
    result = await service.validate_address(address.dict())
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/shipment/{shipment_id}")
async def get_shipment(shipment_id: str):
    """Get shipment details by ID"""
    service = get_shipping_service()
    shipment = await service.get_shipment(shipment_id)
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return shipment

@router.get("/order/{order_id}/shipments")
async def get_order_shipments(order_id: str):
    """Get all shipments for an order"""
    service = get_shipping_service()
    shipments = await service.get_shipments_by_order(order_id)
    return {"shipments": shipments}

@router.get("/status")
async def shipping_service_status():
    """Check shipping service status"""
    service = get_shipping_service()
    return {
        "usps_configured": service.is_configured(),
        "carrier": "USPS",
        "services": ["PRIORITY", "EXPRESS", "FIRST CLASS"],
        "status": "operational"
    }
