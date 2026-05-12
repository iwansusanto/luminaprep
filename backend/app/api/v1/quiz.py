from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.crud.quiz import create_quiz, get_quiz_by_id, get_quizzes_by_project, delete_quiz
from app.crud.question import get_questions_by_quiz
from app.crud.project import get_project_by_id
from app.crud.quiz_session import create_quiz_session
from app.schemas.quiz import QuizCreate, QuizRead, QuizWithQuestions, QuizGenerationRequest, QuizGenerationResponse
from app.models.quiz_session import QuizSessionRead
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/materials/{material_id}/quizzes", response_model=QuizGenerationResponse)
def create_quiz_from_material(
    material_id: str,
    quiz_request: QuizGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a quiz from material and generate AI questions."""
    # Verify material exists and belongs to user
    from app.crud.material import get_material_by_id
    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Create quiz
    quiz = create_quiz(
        db=db,
        project_id=material.project_id,
        difficulty_level=quiz_request.difficulty_level,
        question_count=quiz_request.question_count,
        user_id=current_user.id
    )
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create quiz"
        )
    
    # Generate AI questions
    try:
        from app.agents.mcq_quiz import generate_mcq_quiz
        from app.crud.question import create_question
        from app.agents.summarization import generate_summary
        
        # Generate summary from material content if available
        summary = material.summary or ""
        if not summary:
            # If no summary, generate from material content
            summary = "Material content for quiz generation"
        
        # Generate questions using AI
        ai_questions = generate_mcq_quiz(
            num_questions=quiz_request.question_count,
            summary=summary,
            difficulty=quiz_request.difficulty_level
        )
        
        # Save questions to database
        created_questions = []
        for ai_q in ai_questions:
            question = create_question(
                db=db,
                quiz_id=quiz.id,
                question_text=ai_q.question,
                correct_answer=ai_q.correct_answer,
                options=ai_q.options,
                explanation=ai_q.explanation,
                question_metadata={"difficulty": quiz_request.difficulty_level}
            )
            if question:
                created_questions.append(question)
        
        # Update quiz status
        from app.crud.quiz import update_quiz_status
        update_quiz_status(db, quiz.id, "completed")
        
        return {
            "task_id": quiz.id,
            "status": "completed",
            "message": f"Quiz created successfully with {len(created_questions)} questions generated",
            "questions_count": len(created_questions)
        }
        
    except Exception as e:
        # Update quiz status to failed
        from app.crud.quiz import update_quiz_status
        update_quiz_status(db, quiz.id, "failed")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )


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


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quiz details."""
    try:
        # Use the existing get_quiz_by_id function
        quiz = get_quiz_by_id(db, quiz_id, current_user.id)
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        return {
            "id": quiz.id,
            "project_id": quiz.project_id,
            "difficulty_level": quiz.difficulty_level,
            "question_count": quiz.question_count,
            "status": quiz.status
        }
    except Exception as e:
        print(f"Error in get_quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quiz details"
        )


@router.get("/projects/{project_id}/quizzes", response_model=List[QuizRead])
def get_project_quizzes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all quizzes for a project."""
    # Verify project exists and belongs to user
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    quizzes = get_quizzes_by_project(db, project_id, current_user.id)
    return quizzes


@router.delete("/quizzes/{quiz_id}")
def delete_quiz_endpoint(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a quiz."""
    quiz = delete_quiz(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    return {"message": "Quiz deleted successfully"}
