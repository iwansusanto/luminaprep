from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user_quiz import UserQuiz
from typing import Optional, List


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def add_user_quiz(
    db: Session,
    user_id: str,
    quiz_id: str,
    is_owner: bool = False,
) -> Optional[UserQuiz]:
    """Create a user-quiz association. Skip if already exists (not soft-deleted)."""
    existing = (
        db.query(UserQuiz)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.quiz_id == quiz_id,
            UserQuiz.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        return existing

    # If soft-deleted, restore it
    deleted = (
        db.query(UserQuiz)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.quiz_id == quiz_id,
            UserQuiz.deleted_at.isnot(None),
        )
        .first()
    )
    if deleted:
        deleted.deleted_at = None
        deleted.updated_at = _now()
        db.commit()
        db.refresh(deleted)
        return deleted

    user_quiz = UserQuiz(
        user_id=user_id,
        quiz_id=quiz_id,
        is_owner=is_owner,
    )
    db.add(user_quiz)
    db.commit()
    db.refresh(user_quiz)
    return user_quiz


def remove_user_quiz(db: Session, user_id: str, quiz_id: str) -> bool:
    """Soft-delete a user-quiz association."""
    user_quiz = (
        db.query(UserQuiz)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.quiz_id == quiz_id,
            UserQuiz.deleted_at.is_(None),
        )
        .first()
    )
    if not user_quiz:
        return False
    user_quiz.deleted_at = _now()
    db.commit()
    return True


def get_user_quizzes(db: Session, user_id: str) -> List[UserQuiz]:
    """Get all active user-quiz associations for a user."""
    return (
        db.query(UserQuiz)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.deleted_at.is_(None),
        )
        .all()
    )


def get_user_quiz(db: Session, user_id: str, quiz_id: str) -> Optional[UserQuiz]:
    """Get a single active user-quiz association."""
    return (
        db.query(UserQuiz)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.quiz_id == quiz_id,
            UserQuiz.deleted_at.is_(None),
        )
        .first()
    )
