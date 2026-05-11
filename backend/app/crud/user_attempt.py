from sqlalchemy.orm import Session
from app.models.user_attempt import UserAttempt
from typing import List, Optional

def get_user_attempts_by_session(db: Session, session_id: str, user_id: str) -> List[UserAttempt]:
    """Get all user attempts for a quiz session."""
    return (
        db.query(UserAttempt)
        .filter(
            UserAttempt.quiz_session_id == session_id,
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None)
        )
        .all()
    )

def get_user_attempts_by_user(db: Session, user_id: str) -> List[UserAttempt]:
    """Get all user attempts for a user."""
    return (
        db.query(UserAttempt)
        .filter(
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None)
        )
        .order_by(UserAttempt.created_at.desc())
        .all()
    )

def get_user_attempt_by_id(db: Session, attempt_id: str, user_id: str) -> Optional[UserAttempt]:
    """Get user attempt by ID."""
    return (
        db.query(UserAttempt)
        .filter(
            UserAttempt.id == attempt_id,
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None)
        )
        .first()
    )
