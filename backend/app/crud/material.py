from sqlalchemy.orm import Session
from app.models.material import Material
from typing import List, Optional
import os
from app.core.config import settings
import uuid


def create_material(
    db: Session,
    project_id: str,
    user_id: str,
    file_name: str,
    storage_path: str,
    file_type: str,
    file_size: Optional[int] = None,
    citations: Optional[str] = None,
    summary: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Material]:
    """Create a new material."""
    material = Material(
        project_id=project_id,
        user_id=user_id,
        file_name=file_name,
        storage_path=storage_path,
        file_type=file_type,
        file_size=file_size,
        citations=citations,
        summary=summary,
        status=status,
    )

    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def get_materials_by_project(
    db: Session, project_id: str, user_id: str
) -> List[Material]:
    """Get all materials for a project."""
    return (
        db.query(Material)
        .filter(
            Material.project_id == project_id,
            Material.user_id == user_id,
            Material.deleted_at.is_(None),
        )
        .all()
    )


def get_material_by_id(
    db: Session, material_id: str, user_id: str
) -> Optional[Material]:
    """Get material by ID for a specific user."""
    return (
        db.query(Material)
        .filter(
            Material.id == material_id,
            Material.user_id == user_id,
            Material.deleted_at.is_(None),
        )
        .first()
    )


def update_material(
    db: Session,
    material_id: str,
    user_id: str,
    file_name: Optional[str] = None,
    storage_path: Optional[str] = None,
    file_type: Optional[str] = None,
    file_size: Optional[int] = None,
    citations: Optional[str] = None,
    status: Optional[str] = None,
    summary: Optional[str] = None,
) -> Optional[Material]:
    """Update a material."""
    material = get_material_by_id(db, material_id, user_id)
    if not material:
        return None

    if file_name is not None:
        material.file_name = file_name
    if storage_path is not None:
        material.storage_path = storage_path
    if file_type is not None:
        material.file_type = file_type
    if file_size is not None:
        material.file_size = file_size
    if citations is not None:
        material.citations = citations
    if status is not None:
        material.status = status
    if summary is not None:
        material.summary = summary

    db.commit()
    db.refresh(material)
    return material


def delete_material(db: Session, material_id: str, user_id: str) -> Optional[Material]:
    """Delete a material (soft delete)."""
    material = get_material_by_id(db, material_id, user_id)
    if not material:
        return None

    # Delete file from storage if it exists
    if material.storage_path and os.path.exists(material.storage_path):
        try:
            os.remove(material.storage_path)
        except Exception:
            pass  # Ignore file deletion errors

    # Soft delete - set deleted_at timestamp
    from datetime import datetime

    material.deleted_at = datetime.utcnow()

    db.commit()
    db.refresh(material)
    return material


async def save_uploaded_file(file, filename: str) -> str:
    """Save uploaded file to storage."""
    # Create upload directory if it doesn't exist
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    # We read the file content asynchronously
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return file_path
