from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from typing import Optional


def create_user(db: Session, email: str, password: Optional[str] = None, full_name: Optional[str] = None) -> Optional[User]:
    """Create a new user."""
    try:
        # Handle OAuth users (no password) vs regular users (with password)
        if password:
            hashed_password = get_password_hash(password)
        else:
            # For OAuth users, use a placeholder hash
            hashed_password = "oauth_user_no_password"
        
        db_user = User(email=email, hashed_password=hashed_password, full_name=full_name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()
