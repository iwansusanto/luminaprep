from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from fastapi.responses import RedirectResponse

from app.database import get_db
from app.crud.user import create_user, get_user_by_email, signin_user
from app.schemas.auth import Token, TokenData, UserResponse, UserSignIn, SigninResponse
from app.api.deps import get_current_user
from app.models.user import User
from app.core.security import create_access_token
from app.core.config import settings


router = APIRouter()


@router.post("/signin", response_model=SigninResponse)
async def signin(
    signin_data: UserSignIn,
    db: Session = Depends(get_db)
):
    """Signin user - get or create user with provided data."""
    try:
        # Step 1: Check user (get or create)
        user = signin_user(
            db=db,
            email=signin_data.email,
            name=signin_data.name,
            avatar_url=signin_data.avatar_url
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Step 2: Generate access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}, 
            expires_delta=access_token_expires
        )
        
        # Fetch active projects
        from app.models.project import Project
        projects = db.query(Project).filter(
            Project.user_id == user.id,
            Project.status == "active",
            Project.deleted_at.is_(None)
        ).all()
        
        # Step 3: Return response with token and user data
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
                "projects": [
                    {"id": p.id, "title": p.title, "description": p.description}
                    for p in projects
                ]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signin failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information."""
    from app.models.project import Project
    projects = db.query(Project).filter(
        Project.user_id == current_user.id,
        Project.status == "active",
        Project.deleted_at.is_(None)
    ).all()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
        "projects": [
            {"id": p.id, "title": p.title, "description": p.description}
            for p in projects
        ]
    }
