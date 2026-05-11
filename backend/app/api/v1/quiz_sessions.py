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
from app.models.user_attempt import UserAttemptRead
from app.api.deps import get_current_active_user
from app.models.user import User
router = APIRouter()


@router.post("/{quiz_id}/sessions", response_model=QuizSessionRead)
def start_quiz_session(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new quiz session."""
    # Verify quiz exists and belongs to user's project
    quiz = get_quiz_by_id(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Create quiz session
    quiz_session = create_quiz_session(db, current_user.id, quiz_id)
    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create quiz session"
        )
    
    return quiz_session


@router.post("/sessions/{session_id}/submit_answer", response_model=dict)
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
    
    # Submit answer
    user_attempt = submit_answer(
        db, session_id, current_user.id, question_id, user_answer
    )
    
    if not user_attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to submit answer. Check if session is active and question exists."
        )
    
    # Get updated session stats
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


@router.post("/sessions/{session_id}/complete", response_model=QuizSessionRead)
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


@router.get("/sessions/{session_id}", response_model=dict)
def get_quiz_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get complete quiz session details with all attempts and analytics."""
    result = get_session_with_attempts(db, session_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found"
        )
    
    quiz_session, attempts = result
    
    # Get quiz details
    from app.crud.quiz import get_quiz_by_id
    quiz = get_quiz_by_id(db, quiz_session.quiz_id, current_user.id)
    
    # Format attempts with enhanced analytics
    attempts_data = []
    total_time_spent = 0
    correct_count = 0
    
    for attempt, question in attempts:
        attempt_data = {
            "question_id": attempt.question_id,
            "question_text": question.question_text,
            "options": question.options,
            "user_answer": attempt.user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": attempt.is_correct,
            "score_earned": attempt.score_earned,
            "feedback_text": attempt.feedback_text,
            "created_at": attempt.created_at,
            "time_spent": None  # Could be calculated if we track start/end times
        }
        attempts_data.append(attempt_data)
        
        if attempt.is_correct:
            correct_count += 1
    
    # Calculate analytics
    analytics = {
        "total_questions": quiz_session.total_questions,
        "answered_questions": len(attempts),
        "correct_answers": correct_count,
        "incorrect_answers": len(attempts) - correct_count,
        "accuracy_percentage": (correct_count / len(attempts) * 100) if attempts else 0,
        "total_score": quiz_session.score,
        "average_time_per_question": total_time_spent / len(attempts) if attempts else 0,
        "completion_percentage": (len(attempts) / quiz_session.total_questions * 100) if quiz_session.total_questions else 0
    }
    
    # Performance insights
    insights = []
    if analytics["accuracy_percentage"] >= 80:
        insights.append("Excellent performance! You're mastering this material.")
    elif analytics["accuracy_percentage"] >= 60:
        insights.append("Good performance! Review incorrect answers to improve.")
    else:
        insights.append("Keep practicing! Focus on understanding key concepts.")
    
    if analytics["completion_percentage"] == 100:
        insights.append("Quiz completed! Great job finishing all questions.")
    
    return {
        "session": {
            "id": quiz_session.id,
            "quiz_id": quiz_session.quiz_id,
            "quiz_title": quiz.question_count if quiz else "Unknown Quiz",
            "status": quiz_session.status,
            "score": quiz_session.score,
            "total_questions": quiz_session.total_questions,
            "correct_answers": quiz_session.correct_answers,
            "started_at": quiz_session.started_at,
            "completed_at": quiz_session.completed_at,
            "duration_minutes": None  # Could be calculated from timestamps
        },
        "attempts": attempts_data,
        "analytics": analytics,
        "insights": insights,
        "recommendations": [
            "Review materials for questions you got wrong",
            "Practice similar question types",
            "Focus on understanding core concepts"
        ]
    }


@router.get("/sessions", response_model=List[QuizSessionRead])
def get_user_quiz_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all quiz sessions for the current user."""
    sessions = get_quiz_sessions_by_user(db, current_user.id)
    return sessions


@router.get("/sessions/{session_id}/questions", response_model=dict)
def get_session_questions(
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
    
    # Get quiz questions
    questions = get_questions_by_quiz(db, quiz_session.quiz_id)
    
    # Format questions without correct answers for quiz taking
    questions_data = []
    for question in questions:
        questions_data.append({
            "id": question.id,
            "question_text": question.question_text,
            "options": question.options,
            "question_metadata": question.question_metadata
        })
    
    return {
        "session_id": session_id,
        "quiz_id": quiz_session.quiz_id,
        "total_questions": len(questions_data),
        "questions": questions_data
    }
