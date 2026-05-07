from sqlalchemy.orm import Session
from app.models.project import Project
from typing import List, Optional


def create_project(db: Session, title: str, description: Optional[str], user_id: str, vector_collection_name: Optional[str] = None, status: str = "active") -> Project:
    """Create a new project."""
    db_project = Project(
        title=title, 
        description=description, 
        user_id=user_id,
        vector_collection_name=vector_collection_name,
        status=status
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_projects_by_user(db: Session, user_id: str) -> List[Project]:
    """Get all projects for a user."""
    return db.query(Project).filter(Project.user_id == user_id).all()


def get_project_by_id(db: Session, project_id: str, user_id: str) -> Optional[Project]:
    """Get project by ID and user."""
    return db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user_id
    ).first()


def update_project(
    db: Session, 
    project_id: str, 
    user_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    vector_collection_name: Optional[str] = None,
    status: Optional[str] = None
) -> Optional[Project]:
    """Update project."""
    project = get_project_by_id(db, project_id, user_id)
    if project:
        if title is not None:
            project.title = title
        if description is not None:
            project.description = description
        if vector_collection_name is not None:
            project.vector_collection_name = vector_collection_name
        if status is not None:
            project.status = status
        db.commit()
        db.refresh(project)
    return project


def delete_project(db: Session, project_id: str, user_id: str) -> bool:
    """Delete project by ID and user."""
    project = get_project_by_id(db, project_id, user_id)
    if project:
        db.delete(project)
        db.commit()
        return True
    return False
