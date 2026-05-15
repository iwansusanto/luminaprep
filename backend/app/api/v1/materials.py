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
from app.database import get_db, SessionLocal
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
from app.agents import IngestionAgent

import logging
import time

logger = logging.getLogger(__name__)

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
    start_time = time.time()
    file_path = await save_uploaded_file(file, file.filename or "unknown")
    duration = time.time() - start_time
    logger.info(f"File saved to {file_path} in {duration:.2f}s")

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
        file_size=file.size,
    )

    async def run_ingestion(m_id: str, f_path: str, f_type: str):
        logger.info(f"Background task started: Ingesting material {m_id}")
        db_session = SessionLocal()
        try:
            agent = IngestionAgent(db_session)
            result = await agent.ingest_with_retry(
                material_id=m_id,
                file_path=f_path,
                file_type=f_type,
            )
            logger.info(f"Background ingestion completed for {m_id}: {result}")
        except Exception as e:
            logger.error(f"Background ingestion failed for {m_id}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
        finally:
            db_session.close()

    background_tasks.add_task(run_ingestion, str(material.id), file_path, file_type)

    return material


@router.post("", response_model=MaterialResponse)
def create_test_material(
    material_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a test material for AI quiz generation (testing only)."""
    # Validate required fields
    required_fields = ["project_id", "file_name", "file_type", "storage_path", "status"]
    for field in required_fields:
        if field not in material_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}",
            )

    # Check if project exists and belongs to user
    project = get_project_by_id(db, material_data["project_id"], current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Create material record
    material = create_material(
        db=db,
        project_id=material_data["project_id"],
        user_id=current_user.id,
        file_name=material_data["file_name"],
        storage_path=material_data["storage_path"],
        file_type=material_data["file_type"],
        summary=material_data.get("summary"),
        citations=material_data.get("citations"),
        status=material_data["status"],
    )

    return material


@router.get("/project/{project_id}", response_model=MaterialListResponse)
def get_project_materials(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all materials for a project with summary and quiz status."""
    # Check if project exists and belongs to user
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    materials = get_materials_by_project(db, project_id, current_user.id)

    # Enhance materials with quiz status
    enhanced_materials = []
    try:
        # Get all quizzes for the project once
        from app.crud.quiz import get_quizzes_by_project

        quizzes = get_quizzes_by_project(db, project_id, current_user.id)
        quiz_count = len(quizzes) if quizzes else 0
        latest_quiz_status = quizzes[-1].status if quizzes else None

        for material in materials:
            material_dict = {
                "id": material.id,
                "project_id": material.project_id,
                "user_id": material.user_id,
                "file_name": material.file_name,
                "file_type": material.file_type,
                "storage_path": material.storage_path,
                "status": material.status,
                "summary": material.summary,
                "citations": material.citations,
                "created_at": material.created_at,
                "updated_at": material.updated_at,
                "quiz_status": latest_quiz_status,
                "quiz_count": quiz_count,
            }

            enhanced_materials.append(material_dict)
    except Exception as e:
        # Fallback to basic material data if quiz enhancement fails
        for material in materials:
            material_dict = {
                "id": material.id,
                "project_id": material.project_id,
                "user_id": material.user_id,
                "file_name": material.file_name,
                "file_type": material.file_type,
                "storage_path": material.storage_path,
                "status": material.status,
                "summary": material.summary,
                "citations": material.citations,
                "created_at": material.created_at,
                "updated_at": material.updated_at,
                "quiz_status": None,
                "quiz_count": 0,
            }

            enhanced_materials.append(material_dict)

    return {"materials": enhanced_materials}


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
