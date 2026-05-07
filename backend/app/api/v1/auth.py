from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from fastapi.responses import RedirectResponse

from app.database import get_db
from app.crud.user import create_user, get_user_by_email
from app.schemas.auth import Token, TokenData, GoogleAuthUrl, GoogleAuthCallback, UserResponse
from app.api.deps import get_current_user
from app.models.user import User
from app.core.security import create_access_token
from app.core.config import settings
from app.core.oauth import get_google_auth_url, verify_google_token


router = APIRouter()


@router.get("/google/auth", response_model=GoogleAuthUrl)
def google_auth():
    """Get Google OAuth authorization URL."""
    auth_url = get_google_auth_url()
    return {"authorization_url": auth_url}


@router.get("/google/callback", response_model=Token)
async def google_callback(
    code: str,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    try:
        # Verify Google token and get user info
        user_info = await verify_google_token(code)
        
        # Get or create user
        user = get_user_by_email(db, user_info['email'])
        if not user:
            # Create new user from Google OAuth
            user = create_user(
                db=db,
                email=user_info['email'],
                password=None,  # No password for OAuth users
                full_name=user_info.get('name', '')
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat()
    }
