from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.project import Project
from typing import List, Optional
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_project(
    db: Session,
    title: str,
    description: str,
    user_id: str,
    vector_collection_name: Optional[str] = None,
    status: str = "active",
) -> Optional[Project]:
    project = Project(
        title=title,
        description=description,
        user_id=user_id,
        vector_collection_name=vector_collection_name or f"project_{uuid.uuid4().hex[:8]}",
        status=status,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_projects_by_user(db: Session, user_id: str) -> List[Project]:
    return (
        db.query(Project)
        .filter(Project.user_id == user_id, Project.deleted_at.is_(None))
        .all()
    )


def get_project_by_id(db: Session, project_id: str, user_id: str) -> Optional[Project]:
    return (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == user_id,
            Project.deleted_at.is_(None),
        )
        .first()
    )


def update_project(
    db: Session,
    project_id: str,
    user_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    vector_collection_name: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Project]:
    project = get_project_by_id(db, project_id, user_id)
    if not project:
        return None
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


def delete_project(db: Session, project_id: str, user_id: str) -> Optional[Project]:
    project = get_project_by_id(db, project_id, user_id)
    if not project:
        return None
    project.deleted_at = _now()
    db.commit()
    db.refresh(project)
    return project
