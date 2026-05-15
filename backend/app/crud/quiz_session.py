from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.quiz_session import QuizSession, QuizSessionCreate, QuizSessionUpdate
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.user_attempt import UserAttempt, UserAttemptCreate
from typing import List, Optional


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_quiz_session(
    db: Session,
    user_id: str,
    quiz_id: str,
) -> Optional[QuizSession]:
    """Create a new quiz session."""
    # Verify quiz exists
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.deleted_at.is_(None)).first()
    if not quiz:
        return None
    
    # Create quiz session
    quiz_session = QuizSession(
        user_id=user_id,
        quiz_id=quiz_id,
        status="active",
        total_questions=quiz.question_count if quiz.question_count else 0,
        score=0.0,
        correct_answers=0
    )
    
    db.add(quiz_session)
    db.commit()
    db.refresh(quiz_session)
    return quiz_session


def get_quiz_session_by_id(
    db: Session,
    session_id: str,
    user_id: str,
) -> Optional[QuizSession]:
    """Get quiz session by ID for a specific user."""
    return (
        db.query(QuizSession)
        .filter(
            QuizSession.id == session_id,
            QuizSession.user_id == user_id,
            QuizSession.deleted_at.is_(None)
        )
        .first()
    )


def get_quiz_sessions_by_user(
    db: Session,
    user_id: str,
) -> List[QuizSession]:
    """Get all quiz sessions for a user."""
    return (
        db.query(QuizSession)
        .filter(
            QuizSession.user_id == user_id,
            QuizSession.deleted_at.is_(None)
        )
        .order_by(QuizSession.started_at.desc())
        .all()
    )


def update_quiz_session(
    db: Session,
    session_id: str,
    user_id: str,
    update_data: QuizSessionUpdate,
) -> Optional[QuizSession]:
    """Update quiz session."""
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if not quiz_session:
        return None
    
    # Update fields
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if hasattr(quiz_session, field):
            setattr(quiz_session, field, value)
    
    # Set completed_at if status is completed
    if update_data.status == "completed" and not quiz_session.completed_at:
        quiz_session.completed_at = _now()
    
    db.commit()
    db.refresh(quiz_session)
    return quiz_session


def submit_answer(
    db: Session,
    session_id: str,
    user_id: str,
    question_id: str,
    user_answer: str,
) -> Optional[UserAttempt]:
    """Submit an answer for a question in a quiz session."""
    # Verify quiz session exists and is active
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if not quiz_session or quiz_session.status != "active":
        return None
    
    # Get the question
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id,
            Question.quiz_id == quiz_session.quiz_id,
            Question.deleted_at.is_(None)
        )
        .first()
    )
    if not question:
        return None
    
    # Check if answer already submitted
    existing_attempt = (
        db.query(UserAttempt)
        .filter(
            UserAttempt.quiz_session_id == session_id,
            UserAttempt.question_id == question_id,
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None)
        )
        .first()
    )
    
    if existing_attempt:
        return existing_attempt
    
    # Check if answer is correct
    is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
    score_earned = 1.0 if is_correct else 0.0
    
    # Create user attempt
    user_attempt = UserAttempt(
        user_id=user_id,
        quiz_id=quiz_session.quiz_id,
        question_id=question_id,
        quiz_session_id=session_id,
        user_answer=user_answer,
        is_correct=is_correct,
        score_earned=score_earned,
        feedback_text=f"Correct! {question.explanation}" if is_correct else f"Incorrect. {question.explanation}"
    )
    
    db.add(user_attempt)
    db.commit()
    db.refresh(user_attempt)
    
    # Update quiz session stats
    update_session_stats(db, session_id, user_id)
    
    return user_attempt


def update_session_stats(
    db: Session,
    session_id: str,
    user_id: str,
) -> Optional[QuizSession]:
    """Update quiz session statistics after answer submission."""
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if not quiz_session:
        return None
    
    # Get all attempts for this session
    attempts = (
        db.query(UserAttempt)
        .filter(
            UserAttempt.quiz_session_id == session_id,
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None)
        )
        .all()
    )
    
    # Calculate stats
    total_attempts = len(attempts)
    correct_attempts = sum(1 for attempt in attempts if attempt.is_correct)
    total_score = sum(attempt.score_earned for attempt in attempts if attempt.score_earned)
    
    # Update session
    quiz_session.correct_answers = correct_attempts
    quiz_session.score = total_score
    
    # Check if all questions answered
    if total_attempts >= quiz_session.total_questions:
        quiz_session.status = "completed"
        quiz_session.completed_at = _now()
    
    db.commit()
    db.refresh(quiz_session)
    return quiz_session


def complete_quiz_session(
    db: Session,
    session_id: str,
    user_id: str,
) -> Optional[QuizSession]:
    """Complete a quiz session and calculate final score."""
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if not quiz_session:
        return None

    # Final stats update first
    update_session_stats(db, session_id, user_id)

    # Re-fetch after stats update and force completed status
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if quiz_session and quiz_session.status != "completed":
        quiz_session.status = "completed"
        quiz_session.completed_at = _now()
        db.commit()
        db.refresh(quiz_session)

    return quiz_session


def get_session_with_attempts(
    db: Session,
    session_id: str,
    user_id: str,
) -> Optional[tuple]:
    """Get quiz session with all attempts."""
    quiz_session = get_quiz_session_by_id(db, session_id, user_id)
    if not quiz_session:
        return None
    
    # Get all attempts with question details
    attempts = (
        db.query(UserAttempt, Question)
        .join(Question, UserAttempt.question_id == Question.id)
        .filter(
            UserAttempt.quiz_session_id == session_id,
            UserAttempt.user_id == user_id,
            UserAttempt.deleted_at.is_(None),
            Question.deleted_at.is_(None)
        )
        .all()
    )
    
    return quiz_session, attempts
