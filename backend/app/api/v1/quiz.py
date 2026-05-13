from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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


def _run_quiz_generation(quiz_id: str, material_summary: str, question_count: int, difficulty_level: str, db: Session):
    """Background task: generate AI questions and save them to the database."""
    from app.agents import MCQQuizAgent
    from app.crud.question import create_question
    from app.crud.quiz import update_quiz_status

    try:
        summary = material_summary or "Material content for quiz generation"

        mcq_agent = MCQQuizAgent()
        ai_questions = mcq_agent.generate_quiz(
            num_questions=question_count,
            summary=summary,
            difficulty=difficulty_level,
        )

        created_count = 0
        for ai_q in ai_questions:
            question = create_question(
                db=db,
                quiz_id=quiz_id,
                question_text=ai_q.question,
                correct_answer=ai_q.correct_answer,
                options=ai_q.options,
                explanation=ai_q.explanation,
                question_metadata={"difficulty": difficulty_level},
            )
            if question:
                created_count += 1

        update_quiz_status(db, quiz_id, "completed")

    except Exception as e:
        from app.crud.quiz import update_quiz_status
        update_quiz_status(db, quiz_id, "failed")
        print(f"[QuizGeneration] Failed for quiz {quiz_id}: {e}")
    finally:
        db.close()


@router.post("/materials/{material_id}/quizzes", response_model=QuizGenerationResponse, status_code=202)
def create_quiz_from_material(
    material_id: str,
    quiz_request: QuizGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a quiz from material. Returns immediately; AI generation runs in the background.
    Poll GET /{quiz_id} to check status ('processing' → 'completed' or 'failed')."""
    from app.crud.material import get_material_by_id

    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Material not found"
        )

    # Create the quiz record immediately with status "processing"
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

    # Kick off AI generation in the background (non-blocking)
    # We pass a fresh db session factory so the background task has its own session
    from app.database import SessionLocal
    bg_db = SessionLocal()

    background_tasks.add_task(
        _run_quiz_generation,
        quiz_id=quiz.id,
        material_summary=material.summary or "",
        question_count=quiz_request.question_count,
        difficulty_level=quiz_request.difficulty_level,
        db=bg_db,
    )

    return {
        "task_id": quiz.id,
        "status": "processing",
        "message": "Quiz generation started. Poll GET /quizzes/{quiz_id} to check status.",
        "questions_count": 0,
    }


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
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    # Create quiz session
    quiz_session = create_quiz_session(db, current_user.id, quiz_id)
    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create quiz session",
        )

    return quiz_session


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get quiz details."""
    try:
        # Use the existing get_quiz_by_id function
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
    except Exception as e:
        print(f"Error in get_quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quiz details",
        )


@router.get("/projects/{project_id}/quizzes", response_model=List[QuizRead])
def get_project_quizzes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all quizzes for a project."""
    # Verify project exists and belongs to user
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    quizzes = get_quizzes_by_project(db, project_id, current_user.id)
    return quizzes


@router.delete("/quizzes/{quiz_id}")
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
