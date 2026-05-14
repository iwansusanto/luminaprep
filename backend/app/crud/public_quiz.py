from datetime import datetime, timezone
from sqlmodel import Session, select
from app.models.public_quiz import PublicQuiz
from app.models.quiz import Quiz
from app.models.project import Project
from typing import Optional, List


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_public_quiz(
    db: Session,
    quiz_id: str,
    material_id: str,
    user_id: str,
) -> Optional[PublicQuiz]:
    """Make a quiz public. Verify user owns the quiz."""
    statement = (
        select(Quiz)
        .join(Project)
        .where(Quiz.id == quiz_id)
        .where(Project.user_id == user_id)
        .where(Quiz.deleted_at == None)
        .where(Project.deleted_at == None)
    )
    quiz = db.exec(statement).first()
    if not quiz:
        return None

    existing_statement = select(PublicQuiz).where(PublicQuiz.quiz_id == quiz_id)
    existing = db.exec(existing_statement).first()
    if existing:
        return None

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
    statement = (
        select(Quiz)
        .join(Project)
        .where(Quiz.id == quiz_id)
        .where(Project.user_id == user_id)
        .where(Quiz.deleted_at == None)
        .where(Project.deleted_at == None)
    )
    quiz = db.exec(statement).first()
    if not quiz:
        return False

    public_quiz_statement = select(PublicQuiz).where(PublicQuiz.quiz_id == quiz_id)
    public_quiz = db.exec(public_quiz_statement).first()
    if not public_quiz:
        return False

    db.delete(public_quiz)
    db.commit()
    return True


def get_public_quizzes(db: Session) -> List[tuple]:
    """Get all public quizzes with quiz metadata."""
    statement = (
        select(PublicQuiz, Quiz)
        .join(Quiz, PublicQuiz.quiz_id == Quiz.id)
        .where(Quiz.deleted_at == None)
        .order_by(PublicQuiz.created_at.desc())
    )
    results = db.exec(statement).all()
    return results


def get_public_quiz(db: Session, quiz_id: str) -> Optional[tuple]:
    """Get a single public quiz with quiz metadata. Verify it's published."""
    statement = (
        select(PublicQuiz, Quiz)
        .join(Quiz, PublicQuiz.quiz_id == Quiz.id)
        .where(PublicQuiz.quiz_id == quiz_id)
        .where(Quiz.deleted_at == None)
    )
    result = db.exec(statement).first()
    return result
