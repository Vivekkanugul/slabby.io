"""
Slabby Image Upload Routes
Project Marvel - Card Image Management
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
import os
import uuid
import base64
from datetime import datetime, timezone

from routes.auth import get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Store images as base64 in MongoDB for simplicity
# In production, use S3 or similar cloud storage

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    card_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image for a card"""
    from server import db
    
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Convert to base64
    base64_content = base64.b64encode(content).decode('utf-8')
    
    # Create image record
    image_id = str(uuid.uuid4())
    image_record = {
        "id": image_id,
        "user_id": current_user["id"],
        "card_id": card_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64_content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.images.insert_one(image_record)
    
    # Return URL-like reference
    return {
        "id": image_id,
        "url": f"/api/uploads/image/{image_id}",
        "filename": file.filename,
        "size": len(content)
    }


@router.post("/images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    card_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload multiple images for a card"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")
    
    results = []
    for file in files:
        try:
            result = await upload_image(file, card_id, current_user)
            results.append(result)
        except HTTPException as e:
            results.append({"error": str(e.detail), "filename": file.filename})
    
    return {"images": results}


@router.get("/image/{image_id}")
async def get_image(image_id: str):
    """Get an image by ID (returns base64 data URL)"""
    from server import db
    
    image = await db.images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Return as data URL for direct use in img src
    data_url = f"data:{image['content_type']};base64,{image['data']}"
    
    return {
        "id": image["id"],
        "url": data_url,
        "filename": image["filename"],
        "content_type": image["content_type"],
        "size": image["size"]
    }


@router.delete("/image/{image_id}")
async def delete_image(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image"""
    from server import db
    
    # Check ownership
    image = await db.images.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.images.delete_one({"id": image_id})
    
    return {"message": "Image deleted"}


@router.get("/card/{card_id}")
async def get_card_images(card_id: str):
    """Get all images for a card"""
    from server import db
    
    cursor = db.images.find({"card_id": card_id}, {"_id": 0, "data": 0})
    images = await cursor.to_list(length=20)
    
    # Add URLs
    for img in images:
        img["url"] = f"/api/uploads/image/{img['id']}"
    
    return {"images": images}
