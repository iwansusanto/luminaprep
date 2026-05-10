from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from typing import Optional

def create_user(db: Session, email: str, password: Optional[str] = None, full_name: Optional[str] = None, avatar_url: Optional[str] = None) -> Optional[User]:
    """Create a new user."""
    # Check if user already exists
    existing_user = get_user_by_email(db, email)
    if existing_user:
        return None
    
    # Create user (password can be None for OAuth users)
    if password:
        hashed_password = get_password_hash(password)
    else:
        # Generate a random password for OAuth/signin users (max 72 bytes)
        import secrets
        dummy_password = secrets.token_hex(8)  # 16 chars, well under 72 bytes
        hashed_password = get_password_hash(dummy_password)
    
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        avatar_url=avatar_url
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()

def signin_user(db: Session, email: str, name: str, avatar_url: Optional[str] = None) -> Optional[User]:
    """Signin user - get or create user with provided data."""
    # Check if user already exists
    user = get_user_by_email(db, email)
    if not user:
        # Create new user
        user = create_user(
            db=db,
            email=email,
            password=None,  # No password for signin users
            full_name=name,
            avatar_url=avatar_url
        )
    
    return user
