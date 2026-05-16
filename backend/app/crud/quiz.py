from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload
from app.models.quiz import Quiz
from app.models.project import Project
from app.models.user_quiz import UserQuiz
from typing import List, Optional


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_quiz(
    db: Session,
    project_id: str,
    difficulty_level: str,
    question_count: int,
    user_id: str,
    topic: Optional[str] = None,
    custom_request: Optional[str] = None,
    material_id: Optional[str] = None,
) -> Optional[Quiz]:
    """Create a new quiz."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user_id,
        Project.deleted_at.is_(None),
    ).first()
    if not project:
        return None

    quiz = Quiz(
        project_id=project_id,
        difficulty_level=difficulty_level,
        question_count=question_count,
        status="draft",
        topic=topic,
        custom_request=custom_request,
        material_id=material_id,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Add owner to user_quizzes
    user_quiz = UserQuiz(
        user_id=user_id,
        quiz_id=quiz.id,
        is_owner=True,
    )
    db.add(user_quiz)
    db.commit()

    return quiz


def get_quiz_by_id(db: Session, quiz_id: str, user_id: str) -> Optional[Quiz]:
    """Get quiz by ID with user verification (project ownership OR user_quiz association)."""
    try:
        # Check both project ownership and user_quiz association
        quiz = (
            db.query(Quiz)
            .join(Project)
            .options(selectinload(Quiz.material))
            .filter(
                Quiz.id == quiz_id,
                Quiz.deleted_at.is_(None),
                Project.deleted_at.is_(None),
            )
            .filter(
                (Project.user_id == user_id)
                | (
                    Quiz.id.in_(
                        db.query(UserQuiz.quiz_id).filter(
                            UserQuiz.user_id == user_id,
                            UserQuiz.deleted_at.is_(None),
                        )
                    )
                )
            )
            .first()
        )
        return quiz
    except Exception as e:
        print(f"Error in get_quiz_by_id: {e}")
        return None


def get_quizzes_by_project(db: Session, project_id: str, user_id: str) -> List[Quiz]:
    """Get all quizzes for a project."""
    return (
        db.query(Quiz)
        .join(Project)
        .options(selectinload(Quiz.material))
        .filter(
            Quiz.project_id == project_id,
            Project.user_id == user_id,
            Quiz.deleted_at.is_(None),
            Project.deleted_at.is_(None),
        )
        .order_by(Quiz.created_at.desc())
        .all()
    )


def update_quiz(
    db: Session,
    quiz_id: str,
    status: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    question_count: Optional[int] = None,
) -> Optional[Quiz]:
    """Update quiz fields."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        return None
    if status is not None:
        quiz.status = status
    if difficulty_level is not None:
        quiz.difficulty_level = difficulty_level
    if question_count is not None:
        quiz.question_count = question_count
    db.commit()
    db.refresh(quiz)
    return quiz


def get_my_quizzes(db: Session, user_id: str) -> List[Quiz]:
    """Get all quizzes for a user via user_quiz associations."""
    quiz_ids = (
        db.query(UserQuiz.quiz_id)
        .filter(
            UserQuiz.user_id == user_id,
            UserQuiz.deleted_at.is_(None),
        )
        .subquery()
    )
    return (
        db.query(Quiz)
        .options(selectinload(Quiz.material))
        .filter(
            Quiz.id.in_(quiz_ids),
            Quiz.deleted_at.is_(None),
        )
        .order_by(Quiz.created_at.desc())
        .all()
    )


def delete_quiz(db: Session, quiz_id: str, user_id: str) -> Optional[Quiz]:
    """Remove quiz from user's view (soft-delete user_quiz association).
    The actual quiz record is kept for other users who have access."""
    from app.crud.user_quiz import remove_user_quiz

    removed = remove_user_quiz(db, user_id, quiz_id)
    if not removed:
        return None
    # Return the quiz object for the endpoint response
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    return quiz


def update_quiz_status(db: Session, quiz_id: str, status: str) -> Optional[Quiz]:
    """Update quiz status."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.deleted_at.is_(None)).first()
    if not quiz:
        return None
    quiz.status = status
    db.commit()
    db.refresh(quiz)
    return quiz
