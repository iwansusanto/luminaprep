from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    BackgroundTasks,
)
from sqlalchemy.orm import Session
from typing import List
import os
from app.database import get_db
from app.core.config import settings
from app.crud.material import (
    create_material,
    get_materials_by_project,
    get_material_by_id,
    save_uploaded_file,
)
from app.crud.project import get_project_by_id
from app.schemas.material import MaterialResponse, MaterialListResponse
from app.api.deps import get_current_active_user
from app.models.user import User
from app.agents.ingestions import ingest_material_with_retry

router = APIRouter()


@router.post("/upload", response_model=MaterialResponse)
async def upload_material(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a file to a project."""
    # Validate file size
    if file.size and file.size > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size} bytes",
        )

    # Check if project exists and belongs to user
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Save file to storage
    file_path = save_uploaded_file(file, file.filename or "unknown")

    # Determine file type
    file_type = (
        "pdf" if file.filename and file.filename.lower().endswith(".pdf") else "txt"
    )

    # Create material record
    material = create_material(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        file_name=file.filename or "unknown",
        storage_path=file_path,
        file_type=file_type,
    )

    # Run ingestion in background
    background_tasks.add_task(
        ingest_material_with_retry,
        material_id=str(material.id),
        file_path=file_path,
        file_type=file_type,
    )

    return material


@router.post("", response_model=MaterialResponse)
def create_test_material(
    material_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a test material for AI quiz generation (testing only)."""
    # Validate required fields
    required_fields = ['project_id', 'file_name', 'file_type', 'storage_path', 'status']
    for field in required_fields:
        if field not in material_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    # Check if project exists and belongs to user
    project = get_project_by_id(db, material_data['project_id'], current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Create material record
    material = create_material(
        db=db,
        project_id=material_data['project_id'],
        user_id=current_user.id,
        file_name=material_data['file_name'],
        storage_path=material_data['storage_path'],
        file_type=material_data['file_type'],
        summary=material_data.get('summary'),
        citations=material_data.get('citations'),
        status=material_data['status']
    )

    return material


@router.get("/project/{project_id}", response_model=MaterialListResponse)
def get_project_materials(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all materials for a project."""
    # Check if project exists and belongs to user
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    materials = get_materials_by_project(db, project_id, current_user.id)
    return {"materials": materials}


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get material by ID."""
    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Material not found"
        )

    return material


@router.post("/{material_id}/quizzes", response_model=dict)
def create_quiz_from_material(
    material_id: str,
    quiz_request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a quiz from material and generate AI questions."""
    # Import quiz functions
    from app.crud.quiz import create_quiz, update_quiz_status
    from app.crud.question import create_question
    from app.agents.mcq_quiz import generate_mcq_quiz, MCQQuestion
    
    # Verify material exists and belongs to user
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
        difficulty_level=quiz_request.get('difficulty_level', 'medium'),
        question_count=quiz_request.get('question_count', 5),
        user_id=current_user.id
    )
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create quiz"
        )
    
    # Generate mock questions for testing (AI disabled temporarily)
    try:
        summary = material.summary or "Material content for quiz generation"
        question_count = quiz_request.get('question_count', 5)
        
        # Create simple mock questions for testing Hari 6
        ai_questions = []
        for i in range(min(question_count, 5)):
            ai_questions.append(MCQQuestion(
                question=f"Question {i+1}: What is the main topic of this material about?",
                correct_answer="A",
                options=["A", "B", "C", "D"],
                explanation=f"This is a mock question {i+1} for testing quiz session management."
            ))
        
        # Save questions to database
        created_questions = []
        for ai_q in ai_questions:
            question = create_question(
                db=db,
                quiz_id=quiz.id,
                question_text=ai_q.question,
                correct_answer=ai_q.correct_answer,
                options=ai_q.options,
                explanation=ai_q.explanation
            )
            if question:
                created_questions.append(question)
        
        # Update quiz status
        update_quiz_status(db, quiz.id, "completed")
        
        return {
            "task_id": quiz.id,
            "status": "completed",
            "message": f"Quiz created successfully with {len(created_questions)} questions generated",
            "questions_count": len(created_questions)
        }
        
    except Exception as e:
        # Update quiz status to failed
        update_quiz_status(db, quiz.id, "failed")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )


@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a material."""
    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Material not found"
        )

    # Delete material from database and storage
    from app.crud.material import delete_material as delete_material_crud

    delete_material_crud(db, material_id, current_user.id)

    return {"message": "Material deleted successfully"}
