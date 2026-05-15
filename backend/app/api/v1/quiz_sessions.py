from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.crud.quiz_session import (
    create_quiz_session,
    get_quiz_session_by_id,
    get_quiz_sessions_by_user,
    submit_answer,
    complete_quiz_session,
    get_session_with_attempts,
    update_session_stats
)
from app.crud.quiz import get_quiz_by_id
from app.crud.question import get_questions_by_quiz
from app.schemas.quiz import QuizRead
from app.models.quiz_session import QuizSessionCreate, QuizSessionRead, QuizSessionUpdate
from app.models.user_attempt import UserAttempt, UserAttemptRead
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


# ── Static routes FIRST to avoid being shadowed by /{session_id} ──────────────

@router.get("/sessions", response_model=List[QuizSessionRead])
def get_user_quiz_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all quiz sessions for the current user."""
    sessions = get_quiz_sessions_by_user(db, current_user.id)
    return sessions


@router.get("/sessions/{session_id}", response_model=dict)
def get_quiz_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get quiz session details including per-question attempt breakdown."""
    try:
        quiz_session = get_quiz_session_by_id(db, session_id, current_user.id)

        if not quiz_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz session not found"
            )

        # Fetch attempts with question details for breakdown
        from app.models.user_attempt import UserAttempt
        from app.models.question import Question as QuestionModel

        attempts_with_questions = (
            db.query(UserAttempt, QuestionModel)
            .join(QuestionModel, UserAttempt.question_id == QuestionModel.id)
            .filter(
                UserAttempt.quiz_session_id == session_id,
                UserAttempt.user_id == current_user.id,
                UserAttempt.deleted_at.is_(None),
                QuestionModel.deleted_at.is_(None),
            )
            .all()
        )

        breakdown = [
            {
                "question_id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "user_answer": a.user_answer,
                "is_correct": a.is_correct,
                "score_earned": a.score_earned,
                "feedback_text": a.feedback_text,
            }
            for a, q in attempts_with_questions
        ]

        return {
            "session_id": quiz_session.id,
            "quiz_id": quiz_session.quiz_id,
            "user_id": quiz_session.user_id,
            "status": quiz_session.status,
            "total_questions": quiz_session.total_questions,
            "correct_answers": quiz_session.correct_answers,
            "score": quiz_session.score,
            "started_at": str(quiz_session.started_at) if quiz_session.started_at else None,
            "completed_at": str(quiz_session.completed_at) if quiz_session.completed_at else None,
            "breakdown": breakdown,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_quiz_session_details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session details"
        )


# ── Parameterised routes ───────────────────────────────────────────────────────

@router.post("/{session_id}/submit_answer", response_model=dict)
def submit_quiz_answer(
    session_id: str,
    answer_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submit an answer for a question in the quiz session."""
    question_id = answer_data.get("question_id")
    user_answer = answer_data.get("user_answer")

    if not question_id or not user_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="question_id and user_answer are required"
        )

    user_attempt = submit_answer(
        db, session_id, current_user.id, question_id, user_answer
    )

    if not user_attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to submit answer. Check if session is active and question exists."
        )

    updated_session = get_quiz_session_by_id(db, session_id, current_user.id)

    return {
        "success": True,
        "attempt": {
            "question_id": user_attempt.question_id,
            "user_answer": user_attempt.user_answer,
            "is_correct": user_attempt.is_correct,
            "score_earned": user_attempt.score_earned,
            "feedback_text": user_attempt.feedback_text
        },
        "session_stats": {
            "session_id": session_id,
            "total_questions": updated_session.total_questions,
            "correct_answers": updated_session.correct_answers,
            "score": updated_session.score,
            "status": updated_session.status
        }
    }


@router.post("/{session_id}/complete", response_model=QuizSessionRead)
def complete_quiz_session_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Complete a quiz session and calculate final score."""
    quiz_session = complete_quiz_session(db, session_id, current_user.id)

    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found"
        )

    return quiz_session


@router.get("/{session_id}/questions", response_model=dict)
def get_quiz_session_questions(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get questions for a quiz session (for taking the quiz)."""
    quiz_session = get_quiz_session_by_id(db, session_id, current_user.id)

    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found"
        )

    if quiz_session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz session is not active"
        )

    try:
        questions = get_questions_by_quiz(db, quiz_session.quiz_id, current_user.id)
    except Exception as e:
        print(f"Error getting questions: {e}")
        questions = []

    questions_data = []
    for question in questions:
        questions_data.append({
            "id": question.id,
            "question_text": question.question_text,
            "options": question.options,
            "question_metadata": question.question_metadata
        })

    latest_question_idx = db.query(UserAttempt).filter(UserAttempt.quiz_session_id == session_id).count()
    
    latest_time = 0
    latest_attempt = db.query(UserAttempt).filter(UserAttempt.quiz_session_id == session_id).order_by(UserAttempt.created_at.desc()).first()
    if latest_attempt and quiz_session.started_at and latest_attempt.created_at:
        try:
            started = quiz_session.started_at.replace(tzinfo=None)
            ended = latest_attempt.created_at.replace(tzinfo=None)
            delta = int((ended - started).total_seconds())
            latest_time = delta if delta > 0 else 0
        except Exception as e:
            print(f"Time calculation error: {e}")

    return {
        "session_id": session_id,
        "quiz_id": quiz_session.quiz_id,
        "total_questions": len(questions_data),
        "latest_question": latest_question_idx,
        "latest_time": latest_time,
        "questions": questions_data
    }
