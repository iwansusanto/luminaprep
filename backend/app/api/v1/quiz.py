from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
from app.schemas.quiz import (
    QuizCreate,
    QuizRead,
    QuizWithQuestions,
    QuizGenerationRequest,
    QuizGenerationResponse,
)
from app.models.quiz_session import QuizSessionRead
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


# ── Static-prefix routes FIRST (avoid shadowing by /{quiz_id}) ────────────────

@router.post("/materials/{material_id}/quizzes", response_model=QuizGenerationResponse)
def create_quiz_from_material(
    material_id: str,
    quiz_request: QuizGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a quiz from material and generate AI questions in background."""
    from app.crud.material import get_material_by_id
    from app.tasks.quiz_tasks import generate_quiz_task

    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Material not found"
        )

    quiz = create_quiz(
        db=db,
        project_id=material.project_id,
        difficulty_level=quiz_request.difficulty_level,
        question_count=quiz_request.question_count,
        user_id=current_user.id,
    )

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create quiz"
        )

    summary = material.summary or "Material content for quiz generation"

    generate_quiz_task.delay(
        quiz_id=quiz.id,
        summary=summary,
        num_questions=quiz_request.question_count,
        difficulty=quiz_request.difficulty_level,
    )

    return {
        "task_id": quiz.id,
        "status": "pending",
        "message": "Quiz generation started. Poll the status endpoint for updates.",
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    quizzes = get_quizzes_by_project(db, project_id, current_user.id)
    return quizzes


# ── Parameterised routes ───────────────────────────────────────────────────────

@router.get("/{quiz_id}/status")
def get_quiz_status(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get quiz generation status."""
    quiz = get_quiz_by_id(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
            )

        return {
            "id": quiz.id,
            "project_id": quiz.project_id,
            "difficulty_level": quiz.difficulty_level,
            "question_count": quiz.question_count,
            "status": quiz.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quiz details",
        )


@router.post("/{quiz_id}/sessions", response_model=QuizSessionRead)
def start_quiz_session(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new quiz session."""
    quiz = get_quiz_by_id(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    quiz_session = create_quiz_session(db, current_user.id, quiz_id)
    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create quiz session",
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    return {"message": "Quiz deleted successfully"}
