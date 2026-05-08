from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.crud.project import (
    create_project, 
    get_projects_by_user, 
    get_project_by_id,
    update_project,
    delete_project
)
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ProjectRead)
def create_new_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project."""
    project = create_project(
        db=db,
        title=project_data.title,
        description=project_data.description,
        user_id=current_user.id,
        vector_collection_name=project_data.vector_collection_name,
        status=project_data.status
    )
    return project


@router.get("/", response_model=List[ProjectRead])
def get_user_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects for the current user."""
    projects = get_projects_by_user(db, current_user.id)
    return projects


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project by ID."""
    project = get_project_by_id(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project_endpoint(
    project_id: str,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update project."""
    project = update_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        title=project_data.title,
        description=project_data.description,
        vector_collection_name=project_data.vector_collection_name,
        status=project_data.status
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.delete("/{project_id}")
def delete_project_endpoint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete project."""
    project = delete_project(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return {"message": "Project deleted successfully"}
