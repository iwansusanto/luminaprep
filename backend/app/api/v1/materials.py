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
