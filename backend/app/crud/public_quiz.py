from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.public_quiz import PublicQuiz
from app.models.quiz import Quiz
from app.models.project import Project
from typing import Optional, List


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_public_quiz(
    db: Session,
    quiz_id: str,
    user_id: str,
) -> Optional[PublicQuiz]:
    """Make a quiz public. Verify user owns the quiz."""
    quiz = (
        db.query(Quiz)
        .join(Project)
        .filter(
            Quiz.id == quiz_id,
            Project.user_id == user_id,
            Quiz.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        )
        .first()
    )
    if not quiz:
        return None

    # Already public?
    existing = db.query(PublicQuiz).filter(PublicQuiz.quiz_id == quiz_id).first()
    if existing:
        return None

    # Get material_id from the quiz's direct relation
    material_id = quiz.material_id or ""

    public_quiz = PublicQuiz(
        material_id=material_id,
        quiz_id=quiz_id,
    )
    db.add(public_quiz)
    db.commit()
    db.refresh(public_quiz)
    return public_quiz


def delete_public_quiz(db: Session, quiz_id: str, user_id: str) -> bool:
    """Make a quiz private. Verify user owns the quiz."""
    quiz = (
        db.query(Quiz)
        .join(Project)
        .filter(
            Quiz.id == quiz_id,
            Project.user_id == user_id,
            Quiz.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        )
        .first()
    )
    if not quiz:
        return False

    public_quiz = db.query(PublicQuiz).filter(PublicQuiz.quiz_id == quiz_id).first()
    if not public_quiz:
        return False

    db.delete(public_quiz)
    db.commit()
    return True


def get_public_quizzes(db: Session) -> List[tuple]:
    """Get all public quizzes with quiz metadata."""
    results = (
        db.query(PublicQuiz, Quiz)
        .join(Quiz, PublicQuiz.quiz_id == Quiz.id)
        .filter(Quiz.deleted_at.is_(None))
        .order_by(PublicQuiz.created_at.desc())
        .all()
    )
    return results


def get_public_quiz(db: Session, quiz_id: str) -> Optional[tuple]:
    """Get a single public quiz with quiz metadata. Verify it's published."""
    result = (
        db.query(PublicQuiz, Quiz)
        .join(Quiz, PublicQuiz.quiz_id == Quiz.id)
        .filter(
            PublicQuiz.quiz_id == quiz_id,
            Quiz.deleted_at.is_(None),
        )
        .first()
    )
    return result
