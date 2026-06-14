"""
PSA (Professional Sports Authenticator) Verification Service
Handles card authentication and grade verification
"""

import os
import httpx
import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class PSAService:
    """PSA card verification and authentication service"""
    
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get('PSA_API_KEY')
        self.api_url = "https://api.psacard.com/publicapi"
        
        # Public verification URL (no API key needed)
        self.public_verify_url = "https://www.psacard.com/cert"
    
    def is_configured(self) -> bool:
        """Check if PSA API is configured"""
        return bool(self.api_key)
    
    async def verify_cert_number(self, cert_number: str) -> Dict[str, Any]:
        """
        Verify a PSA certification number
        
        Args:
            cert_number: PSA certification number (e.g., "12345678")
        
        Returns:
            Verification result with card details
        """
        # Clean cert number
        cert_number = re.sub(r'[^0-9]', '', str(cert_number))
        
        if not cert_number or len(cert_number) < 6:
            return {"success": False, "error": "Invalid certification number format"}
        
        # Try API first if configured
        if self.is_configured():
            result = await self._verify_via_api(cert_number)
            if result.get("success"):
                return result
        
        # Fallback to public verification
        return await self._verify_via_public(cert_number)
    
    async def _verify_via_api(self, cert_number: str) -> Dict[str, Any]:
        """Verify using PSA's official API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.api_url}/cert/GetByCertNumber/{cert_number}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("PSACert"):
                        cert = data["PSACert"]
                        return {
                            "success": True,
                            "verified": True,
                            "source": "psa_api",
                            "cert_number": cert_number,
                            "card_info": {
                                "year": cert.get("Year"),
                                "brand": cert.get("Brand"),
                                "series": cert.get("Series"),
                                "card_number": cert.get("CardNumber"),
                                "player": cert.get("Subject"),
                                "grade": cert.get("CardGrade"),
                                "grade_description": self._get_grade_description(cert.get("CardGrade")),
                                "variety": cert.get("Variety"),
                                "label_type": cert.get("LabelType")
                            },
                            "population": {
                                "total_graded": cert.get("TotalPopulation"),
                                "higher_grades": cert.get("PopulationHigher")
                            }
                        }
                    else:
                        return {"success": True, "verified": False, "error": "Certificate not found"}
                        
                elif response.status_code == 404:
                    return {"success": True, "verified": False, "error": "Certificate not found"}
                else:
                    logger.error(f"PSA API error: {response.status_code}")
                    return {"success": False, "error": f"PSA API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"PSA API verification error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _verify_via_public(self, cert_number: str) -> Dict[str, Any]:
        """Verify using PSA's public verification page (scraping fallback)"""
        try:
            url = f"{self.public_verify_url}/{cert_number}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10, follow_redirects=True)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Check if certificate exists
                    error_div = soup.find('div', class_='cert-error')
                    if error_div:
                        return {"success": True, "verified": False, "error": "Certificate not found"}
                    
                    # Extract card information
                    card_info = {}
                    
                    # Look for certification details
                    details_table = soup.find('table', class_='cert-details')
                    if details_table:
                        rows = details_table.find_all('tr')
                        for row in rows:
                            cells = row.find_all(['th', 'td'])
                            if len(cells) >= 2:
                                key = cells[0].get_text(strip=True).lower().replace(' ', '_')
                                value = cells[1].get_text(strip=True)
                                card_info[key] = value
                    
                    # Try to extract grade
                    grade_elem = soup.find('span', class_='grade') or soup.find('div', class_='grade-value')
                    grade = grade_elem.get_text(strip=True) if grade_elem else card_info.get('grade')
                    
                    return {
                        "success": True,
                        "verified": True,
                        "source": "psa_public",
                        "cert_number": cert_number,
                        "card_info": {
                            "description": card_info.get('description', card_info.get('card')),
                            "grade": grade,
                            "grade_description": self._get_grade_description(grade),
                            "year": card_info.get('year'),
                            "brand": card_info.get('brand'),
                            "player": card_info.get('subject', card_info.get('player'))
                        },
                        "verify_url": url
                    }
                    
                else:
                    return {"success": True, "verified": False, "error": "Certificate not found"}
                    
        except Exception as e:
            logger.error(f"PSA public verification error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _get_grade_description(self, grade) -> str:
        """Get human-readable description for PSA grade"""
        grade_map = {
            "10": "Gem Mint",
            "9": "Mint",
            "8": "Near Mint-Mint",
            "7": "Near Mint",
            "6": "Excellent-Mint",
            "5": "Excellent",
            "4": "Very Good-Excellent",
            "3": "Very Good",
            "2": "Good",
            "1": "Poor",
            "A": "Authentic (Altered)"
        }
        return grade_map.get(str(grade), "Unknown")
    
    async def verify_bgs_cert(self, cert_number: str) -> Dict[str, Any]:
        """
        Verify a BGS (Beckett Grading Services) certification
        """
        cert_number = re.sub(r'[^0-9]', '', str(cert_number))
        
        try:
            url = f"https://www.beckett.com/grading/card-lookup?cert_no={cert_number}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10, follow_redirects=True)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract BGS card info
                    card_info = {}
                    grade_elem = soup.find('span', class_='grade-value')
                    
                    if grade_elem:
                        return {
                            "success": True,
                            "verified": True,
                            "source": "bgs_public",
                            "cert_number": cert_number,
                            "card_info": {
                                "grade": grade_elem.get_text(strip=True),
                                "grading_company": "BGS"
                            },
                            "verify_url": url
                        }
                    else:
                        return {"success": True, "verified": False, "error": "BGS certificate not found"}
                        
        except Exception as e:
            logger.error(f"BGS verification error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def verify_cgc_cert(self, cert_number: str) -> Dict[str, Any]:
        """
        Verify a CGC (Certified Guaranty Company) certification
        """
        cert_number = re.sub(r'[^0-9]', '', str(cert_number))
        
        try:
            url = f"https://www.cgccomics.com/certlookup/{cert_number}/"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10, follow_redirects=True)
                
                if response.status_code == 200 and "not found" not in response.text.lower():
                    return {
                        "success": True,
                        "verified": True,
                        "source": "cgc_public",
                        "cert_number": cert_number,
                        "card_info": {
                            "grading_company": "CGC"
                        },
                        "verify_url": url
                    }
                else:
                    return {"success": True, "verified": False, "error": "CGC certificate not found"}
                    
        except Exception as e:
            logger.error(f"CGC verification error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def verify_card(
        self,
        cert_number: str,
        grading_company: str = "PSA"
    ) -> Dict[str, Any]:
        """
        Universal card verification - routes to appropriate grading company
        
        Args:
            cert_number: Certification number
            grading_company: PSA, BGS, or CGC
        """
        company = grading_company.upper()
        
        if company == "PSA":
            return await self.verify_cert_number(cert_number)
        elif company == "BGS" or company == "BECKETT":
            return await self.verify_bgs_cert(cert_number)
        elif company == "CGC":
            return await self.verify_cgc_cert(cert_number)
        else:
            return {"success": False, "error": f"Unsupported grading company: {grading_company}"}
    
    async def save_verification(self, card_id: str, user_id: str, result: Dict) -> str:
        """Save verification result to database"""
        doc = {
            "card_id": card_id,
            "user_id": user_id,
            "verification_result": result,
            "verified_at": datetime.utcnow(),
            "is_verified": result.get("verified", False)
        }
        
        # Update or insert
        await self.db.card_verifications.update_one(
            {"card_id": card_id},
            {"$set": doc},
            upsert=True
        )
        
        return card_id
    
    async def get_verification(self, card_id: str) -> Optional[Dict]:
        """Get saved verification for a card"""
        doc = await self.db.card_verifications.find_one(
            {"card_id": card_id},
            {"_id": 0}
        )
        return doc
