"""
USPS Shipping Service
Handles label generation, tracking, and rate calculation
"""

import os
import httpx
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

logger = logging.getLogger(__name__)

class USPSService:
    """USPS shipping integration for labels and tracking"""
    
    def __init__(self, db):
        self.db = db
        self.user_id = os.environ.get('USPS_USER_ID')
        self.api_url = "https://secure.shippingapis.com/ShippingAPI.dll"
        
        # For production labels
        self.label_url = "https://secure.shippingapis.com/ShippingAPI.dll"
    
    def is_configured(self) -> bool:
        """Check if USPS credentials are configured"""
        return bool(self.user_id)
    
    async def get_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """
        Get tracking information for a USPS shipment
        
        Args:
            tracking_number: USPS tracking number
        """
        if not self.is_configured():
            return {"success": False, "error": "USPS API not configured"}
        
        try:
            xml_request = f"""
            <TrackFieldRequest USERID="{self.user_id}">
                <TrackID ID="{tracking_number}"/>
            </TrackFieldRequest>
            """
            
            params = {
                "API": "TrackV2",
                "XML": xml_request
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_url, params=params, timeout=15)
                
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    
                    # Check for errors
                    error = root.find('.//Error')
                    if error is not None:
                        return {
                            "success": False,
                            "error": error.find('Description').text if error.find('Description') is not None else "Unknown error"
                        }
                    
                    # Parse tracking info
                    track_info = root.find('.//TrackInfo')
                    if track_info is not None:
                        events = []
                        
                        # Get all tracking events
                        for event in track_info.findall('.//TrackDetail'):
                            events.append({
                                "date": event.find('EventDate').text if event.find('EventDate') is not None else None,
                                "time": event.find('EventTime').text if event.find('EventTime') is not None else None,
                                "city": event.find('EventCity').text if event.find('EventCity') is not None else None,
                                "state": event.find('EventState').text if event.find('EventState') is not None else None,
                                "event": event.find('Event').text if event.find('Event') is not None else None
                            })
                        
                        # Get summary
                        summary = track_info.find('TrackSummary')
                        current_status = summary.find('Event').text if summary is not None and summary.find('Event') is not None else "Unknown"
                        
                        return {
                            "success": True,
                            "tracking_number": tracking_number,
                            "status": current_status,
                            "events": events,
                            "summary": {
                                "date": summary.find('EventDate').text if summary is not None and summary.find('EventDate') is not None else None,
                                "city": summary.find('EventCity').text if summary is not None and summary.find('EventCity') is not None else None,
                                "state": summary.find('EventState').text if summary is not None and summary.find('EventState') is not None else None
                            }
                        }
                    else:
                        return {"success": False, "error": "No tracking information found"}
                else:
                    return {"success": False, "error": f"USPS API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"USPS tracking error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def calculate_rate(
        self,
        origin_zip: str,
        dest_zip: str,
        weight_oz: float,
        service_type: str = "PRIORITY"
    ) -> Dict[str, Any]:
        """
        Calculate shipping rate
        
        Args:
            origin_zip: Origin ZIP code
            dest_zip: Destination ZIP code
            weight_oz: Package weight in ounces
            service_type: PRIORITY, EXPRESS, FIRST CLASS, etc.
        """
        if not self.is_configured():
            return {"success": False, "error": "USPS API not configured"}
        
        try:
            # Convert to pounds and ounces
            pounds = int(weight_oz // 16)
            ounces = weight_oz % 16
            
            xml_request = f"""
            <RateV4Request USERID="{self.user_id}">
                <Package ID="1">
                    <Service>{service_type}</Service>
                    <ZipOrigination>{origin_zip}</ZipOrigination>
                    <ZipDestination>{dest_zip}</ZipDestination>
                    <Pounds>{pounds}</Pounds>
                    <Ounces>{ounces}</Ounces>
                    <Container>VARIABLE</Container>
                    <Width>5</Width>
                    <Length>7</Length>
                    <Height>1</Height>
                    <Machinable>true</Machinable>
                </Package>
            </RateV4Request>
            """
            
            params = {
                "API": "RateV4",
                "XML": xml_request
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_url, params=params, timeout=15)
                
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    
                    error = root.find('.//Error')
                    if error is not None:
                        return {
                            "success": False,
                            "error": error.find('Description').text if error.find('Description') is not None else "Rate calculation failed"
                        }
                    
                    postage = root.find('.//Postage')
                    if postage is not None:
                        rate = postage.find('Rate')
                        return {
                            "success": True,
                            "rate": float(rate.text) if rate is not None else 0,
                            "service": service_type,
                            "origin_zip": origin_zip,
                            "dest_zip": dest_zip,
                            "weight_oz": weight_oz
                        }
                    else:
                        return {"success": False, "error": "Could not calculate rate"}
                else:
                    return {"success": False, "error": f"USPS API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"USPS rate calculation error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_all_rates(
        self,
        origin_zip: str,
        dest_zip: str,
        weight_oz: float
    ) -> Dict[str, Any]:
        """Get rates for all available shipping services"""
        services = ["PRIORITY", "EXPRESS", "FIRST CLASS"]
        rates = []
        
        for service in services:
            result = await self.calculate_rate(origin_zip, dest_zip, weight_oz, service)
            if result.get("success"):
                rates.append({
                    "service": service,
                    "rate": result["rate"],
                    "delivery_estimate": self._get_delivery_estimate(service)
                })
        
        return {
            "success": True,
            "rates": sorted(rates, key=lambda x: x["rate"]),
            "origin_zip": origin_zip,
            "dest_zip": dest_zip
        }
    
    def _get_delivery_estimate(self, service: str) -> str:
        """Get estimated delivery time for service type"""
        estimates = {
            "EXPRESS": "1-2 business days",
            "PRIORITY": "2-3 business days",
            "FIRST CLASS": "3-5 business days"
        }
        return estimates.get(service, "5-7 business days")
    
    async def create_label(
        self,
        from_address: Dict[str, str],
        to_address: Dict[str, str],
        weight_oz: float,
        service_type: str = "PRIORITY",
        description: str = "Trading Card"
    ) -> Dict[str, Any]:
        """
        Create a shipping label
        
        Args:
            from_address: {name, company, address1, address2, city, state, zip, phone}
            to_address: {name, company, address1, address2, city, state, zip, phone}
            weight_oz: Package weight in ounces
            service_type: Shipping service type
            description: Package description
        """
        if not self.is_configured():
            return {"success": False, "error": "USPS API not configured"}
        
        try:
            # Generate unique label ID
            label_id = str(uuid.uuid4())[:8].upper()
            
            pounds = int(weight_oz // 16)
            ounces = weight_oz % 16
            
            # Build label request XML
            if service_type == "EXPRESS":
                api_name = "ExpressMailLabel"
                xml_request = f"""
                <ExpressMailLabelRequest USERID="{self.user_id}">
                    <Option>SINGLE</Option>
                    <Revision>2</Revision>
                    <EMCAAccount/>
                    <EMCAPassword/>
                    <ImageParameters/>
                    <FromFirstName>{from_address.get('name', '').split()[0]}</FromFirstName>
                    <FromLastName>{from_address.get('name', '').split()[-1] if len(from_address.get('name', '').split()) > 1 else ''}</FromLastName>
                    <FromFirm>{from_address.get('company', '')}</FromFirm>
                    <FromAddress1>{from_address.get('address2', '')}</FromAddress1>
                    <FromAddress2>{from_address.get('address1', '')}</FromAddress2>
                    <FromCity>{from_address.get('city', '')}</FromCity>
                    <FromState>{from_address.get('state', '')}</FromState>
                    <FromZip5>{from_address.get('zip', '')[:5]}</FromZip5>
                    <FromZip4/>
                    <FromPhone>{from_address.get('phone', '')}</FromPhone>
                    <ToFirstName>{to_address.get('name', '').split()[0]}</ToFirstName>
                    <ToLastName>{to_address.get('name', '').split()[-1] if len(to_address.get('name', '').split()) > 1 else ''}</ToLastName>
                    <ToFirm>{to_address.get('company', '')}</ToFirm>
                    <ToAddress1>{to_address.get('address2', '')}</ToAddress1>
                    <ToAddress2>{to_address.get('address1', '')}</ToAddress2>
                    <ToCity>{to_address.get('city', '')}</ToCity>
                    <ToState>{to_address.get('state', '')}</ToState>
                    <ToZip5>{to_address.get('zip', '')[:5]}</ToZip5>
                    <ToZip4/>
                    <ToPhone>{to_address.get('phone', '')}</ToPhone>
                    <WeightInOunces>{int(weight_oz)}</WeightInOunces>
                    <ImageType>PDF</ImageType>
                </ExpressMailLabelRequest>
                """
            else:
                api_name = "DelivConfirmCertifyV4"
                xml_request = f"""
                <DelivConfirmCertifyV4.0Request USERID="{self.user_id}">
                    <Revision>2</Revision>
                    <ImageParameters/>
                    <FromName>{from_address.get('name', '')}</FromName>
                    <FromFirm>{from_address.get('company', '')}</FromFirm>
                    <FromAddress1>{from_address.get('address2', '')}</FromAddress1>
                    <FromAddress2>{from_address.get('address1', '')}</FromAddress2>
                    <FromCity>{from_address.get('city', '')}</FromCity>
                    <FromState>{from_address.get('state', '')}</FromState>
                    <FromZip5>{from_address.get('zip', '')[:5]}</FromZip5>
                    <FromZip4/>
                    <ToName>{to_address.get('name', '')}</ToName>
                    <ToFirm>{to_address.get('company', '')}</ToFirm>
                    <ToAddress1>{to_address.get('address2', '')}</ToAddress1>
                    <ToAddress2>{to_address.get('address1', '')}</ToAddress2>
                    <ToCity>{to_address.get('city', '')}</ToCity>
                    <ToState>{to_address.get('state', '')}</ToState>
                    <ToZip5>{to_address.get('zip', '')[:5]}</ToZip5>
                    <ToZip4/>
                    <WeightInOunces>{int(weight_oz)}</WeightInOunces>
                    <ServiceType>{service_type}</ServiceType>
                    <ImageType>PDF</ImageType>
                </DelivConfirmCertifyV4.0Request>
                """
            
            params = {
                "API": api_name,
                "XML": xml_request
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.label_url, params=params, timeout=30)
                
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    
                    error = root.find('.//Error')
                    if error is not None:
                        return {
                            "success": False,
                            "error": error.find('Description').text if error.find('Description') is not None else "Label creation failed"
                        }
                    
                    # Extract label data
                    tracking = root.find('.//DeliveryConfirmationNumber') or root.find('.//EMConfirmationNumber')
                    label_image = root.find('.//DeliveryConfirmationLabel') or root.find('.//EMLabel')
                    postage = root.find('.//Postage')
                    
                    tracking_number = tracking.text if tracking is not None else f"SLABBY{label_id}"
                    
                    label_data = {
                        "success": True,
                        "label_id": label_id,
                        "tracking_number": tracking_number,
                        "service": service_type,
                        "postage": float(postage.text) if postage is not None else 0,
                        "label_image_base64": label_image.text if label_image is not None else None,
                        "from_address": from_address,
                        "to_address": to_address,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    return label_data
                else:
                    return {"success": False, "error": f"USPS API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"USPS label creation error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def validate_address(self, address: Dict[str, str]) -> Dict[str, Any]:
        """
        Validate and standardize a US address
        
        Args:
            address: {address1, address2, city, state, zip}
        """
        if not self.is_configured():
            return {"success": False, "error": "USPS API not configured"}
        
        try:
            xml_request = f"""
            <AddressValidateRequest USERID="{self.user_id}">
                <Address ID="0">
                    <Address1>{address.get('address2', '')}</Address1>
                    <Address2>{address.get('address1', '')}</Address2>
                    <City>{address.get('city', '')}</City>
                    <State>{address.get('state', '')}</State>
                    <Zip5>{address.get('zip', '')[:5]}</Zip5>
                    <Zip4/>
                </Address>
            </AddressValidateRequest>
            """
            
            params = {
                "API": "Verify",
                "XML": xml_request
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_url, params=params, timeout=10)
                
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    
                    error = root.find('.//Error')
                    if error is not None:
                        return {
                            "success": False,
                            "valid": False,
                            "error": error.find('Description').text if error.find('Description') is not None else "Address validation failed"
                        }
                    
                    addr = root.find('.//Address')
                    if addr is not None:
                        return {
                            "success": True,
                            "valid": True,
                            "standardized_address": {
                                "address1": addr.find('Address2').text if addr.find('Address2') is not None else "",
                                "address2": addr.find('Address1').text if addr.find('Address1') is not None else "",
                                "city": addr.find('City').text if addr.find('City') is not None else "",
                                "state": addr.find('State').text if addr.find('State') is not None else "",
                                "zip": f"{addr.find('Zip5').text}-{addr.find('Zip4').text}" if addr.find('Zip4') is not None and addr.find('Zip4').text else addr.find('Zip5').text
                            }
                        }
                    else:
                        return {"success": False, "valid": False, "error": "Could not validate address"}
                else:
                    return {"success": False, "error": f"USPS API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"USPS address validation error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def save_shipment(
        self,
        order_id: str,
        seller_id: str,
        buyer_id: str,
        tracking_number: str,
        label_data: Dict
    ) -> str:
        """Save shipment record to database"""
        doc = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "seller_id": seller_id,
            "buyer_id": buyer_id,
            "tracking_number": tracking_number,
            "carrier": "USPS",
            "service": label_data.get("service"),
            "postage": label_data.get("postage"),
            "status": "label_created",
            "from_address": label_data.get("from_address"),
            "to_address": label_data.get("to_address"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.db.shipments.insert_one(doc)
        return doc["id"]
    
    async def get_shipment(self, shipment_id: str) -> Optional[Dict]:
        """Get shipment by ID"""
        return await self.db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    
    async def get_shipments_by_order(self, order_id: str) -> List[Dict]:
        """Get all shipments for an order"""
        cursor = self.db.shipments.find({"order_id": order_id}, {"_id": 0})
        return await cursor.to_list(length=100)
    
    async def update_shipment_status(self, shipment_id: str, status: str) -> bool:
        """Update shipment status"""
        result = await self.db.shipments.update_one(
            {"id": shipment_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
