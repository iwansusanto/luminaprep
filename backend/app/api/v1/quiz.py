import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from app.database import get_db
from app.crud.quiz import (
    create_quiz,
    get_quiz_by_id,
    get_quizzes_by_project,
    delete_quiz,
)
from app.crud.question import get_questions_by_quiz
from app.crud.project import get_project_by_id
from app.crud.quiz_session import create_quiz_session
from app.models.user_attempt import UserAttempt
from app.schemas.quiz import (
    QuizCreate,
    QuizRead,
    QuizWithQuestions,
    QuizGenerationRequest,
    QuizGenerationResponse,
)
from app.models.quiz_session import QuizSession, QuizSessionRead
from app.api.deps import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


def _run_quiz_generation(
    quiz_id: str,
    material_id: str,
    material_summary: str,
    question_count: int,
    difficulty_level: str,
    topic: str,
    custom_request: str,
    db: Session,
):
    """Background task: generate AI questions and save to DB."""
    from app.tasks.quiz_tasks import _run_task_body

    logger.info("[QuizGen] START quiz_id=%s | questions=%d | difficulty=%s | topic=%s",
                quiz_id, question_count, difficulty_level, topic)
    try:
        _run_task_body(
            quiz_id=quiz_id,
            summary=material_summary or "Material content for quiz generation",
            num_questions=question_count,
            difficulty=difficulty_level,
            topic=topic,
            custom_request=custom_request,
            db=db,
        )
    except Exception as e:
        logger.exception("[QuizGen] FAILED quiz_id=%s | error: %s", quiz_id, e)
    finally:
        logger.info("[QuizGen] DONE quiz_id=%s", quiz_id)


# ── Static-prefix routes FIRST ────────────────────────────────────────────────

@router.post("/materials/{material_id}/quizzes", response_model=QuizGenerationResponse, status_code=202)
def create_quiz_from_material(
    material_id: str,
    quiz_request: QuizGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a quiz from material. Returns immediately; AI generation runs in background.
    Poll GET /quizzes/{quiz_id}/status to check progress."""
    from app.crud.material import get_material_by_id
    from app.utils.sanitize import sanitize_prompt_field
    from app.database import SessionLocal

    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    # Sanitize user-provided prompt fields
    topic = sanitize_prompt_field(quiz_request.topic or "", max_length=255)
    custom_request = sanitize_prompt_field(quiz_request.custom_request or "", max_length=500)

    quiz = create_quiz(
        db=db,
        project_id=material.project_id,
        difficulty_level=quiz_request.difficulty_level,
        question_count=quiz_request.question_count,
        user_id=current_user.id,
        topic=topic or None,
        custom_request=custom_request or None,
    )

    if not quiz:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create quiz")

    # Fresh DB session for background task (request session will close after response)
    bg_db = SessionLocal()
    background_tasks.add_task(
        _run_quiz_generation,
        quiz_id=quiz.id,
        material_id=material_id,
        material_summary=material.summary or "",
        question_count=quiz_request.question_count,
        difficulty_level=quiz_request.difficulty_level,
        topic=topic,
        custom_request=custom_request,
        db=bg_db,
    )

    return {
        "task_id": quiz.id,
        "status": "processing",
        "message": "Quiz generation started. Poll GET /quizzes/{quiz_id}/status to check progress.",
        "questions_count": 0,
    }


@router.get("/projects/{project_id}/quizzes", response_model=List[QuizRead])
def get_project_quizzes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all quizzes for a project."""
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    quizzes = get_quizzes_by_project(db, project_id, current_user.id)
    
    if not quizzes:
        return []
        
    quiz_ids = [q.id for q in quizzes]
    
    # Group user_attempts by quiz_session_id and quiz_id
    attempts_agg = db.query(
        UserAttempt.quiz_id,
        UserAttempt.quiz_session_id,
        QuizSession.status.label("status_session"),
        func.count(UserAttempt.id).label("total_questions"),
        func.sum(case((UserAttempt.is_correct == True, 1), else_=0)).label("score_correct"),
        func.sum(UserAttempt.score_earned).label("score_earned")
    ).outerjoin(
        QuizSession, UserAttempt.quiz_session_id == QuizSession.id
    ).filter(
        UserAttempt.quiz_id.in_(quiz_ids),
        UserAttempt.quiz_session_id.isnot(None)
    ).group_by(
        UserAttempt.quiz_id,
        UserAttempt.quiz_session_id,
        QuizSession.status
    ).all()
    
    attempts_by_quiz = {qid: [] for qid in quiz_ids}
    for row in attempts_agg:
        attempts_by_quiz[row.quiz_id].append({
            "quiz_id": row.quiz_id,
            "quiz_session_id": row.quiz_session_id,
            "score_correct": int(row.score_correct or 0),
            "score_earned": float(row.score_earned or 0.0),
            "total_questions": int(row.total_questions or 0),
            "status_session": row.status_session
        })
    
    result = []
    for quiz in quizzes:
        quiz_dict = quiz.model_dump()
        attempts = attempts_by_quiz.get(quiz.id, [])
        first_attempt = attempts[0] if attempts else None
        quiz_dict["user_attempts"] = first_attempt
        
        # Dynamically set quiz status to finish in response if the session was completed
        if first_attempt and first_attempt.get("status_session") == "completed" and quiz_dict["status"] != "finish":
            quiz_dict["status"] = "finish"
            
        result.append(quiz_dict)
        
    return result


# ── Parameterised routes ───────────────────────────────────────────────────────

@router.get("/{quiz_id}/status")
def get_quiz_status(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get quiz generation status and question count."""
    quiz = get_quiz_by_id(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions = get_questions_by_quiz(db, quiz_id)
    return {
        "quiz_id": quiz.id,
        "status": quiz.status,
        "questions_count": len(questions),
    }


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get quiz details."""
    try:
        quiz = get_quiz_by_id(db, quiz_id, current_user.id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        return {
            "id": quiz.id,
            "project_id": quiz.project_id,
            "difficulty_level": quiz.difficulty_level,
            "question_count": quiz.question_count,
            "status": quiz.status,
            "topic": quiz.topic,
            "custom_request": quiz.custom_request,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in get_quiz: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get quiz details")


@router.post("/{quiz_id}/sessions", response_model=QuizSessionRead)
def start_quiz_session(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new quiz session."""
    quiz = get_quiz_by_id(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    quiz_session = create_quiz_session(db, current_user.id, quiz_id)
    if not quiz_session:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create quiz session")
    return quiz_session


@router.delete("/{quiz_id}")
def delete_quiz_endpoint(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a quiz."""
    quiz = delete_quiz(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return {"message": "Quiz deleted successfully"}
