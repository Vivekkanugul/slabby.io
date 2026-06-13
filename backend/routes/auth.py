"""
Slabby Auth Routes
Project Marvel - Authentication API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from models.user import UserCreate, UserLogin, TokenResponse, UserResponse
from services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


def get_user_service():
    """Dependency to get user service - set by main app"""
    from server import user_service
    return user_service


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user from JWT token"""
    user = await user_service.verify_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, user_service: UserService = Depends(get_user_service)):
    """Register a new user account"""
    try:
        return await user_service.register(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, user_service: UserService = Depends(get_user_service)):
    """Login with email and password"""
    try:
        return await user_service.login(data.email, data.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@router.put("/profile")
async def update_profile(
    updates: dict,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Update user profile"""
    result = await user_service.update_profile(current_user["id"], updates)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result
