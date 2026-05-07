from sqlalchemy.orm import Session
from app.models.material import Material
from typing import List, Optional
import os
import uuid
from datetime import datetime


def create_material(
    db: Session,
    project_id: str,
    user_id: str,
    file_name: str,
    storage_path: str,
    file_type: str,
    citations: Optional[str] = None
) -> Material:
    """Create a new material record."""
    db_material = Material(
        project_id=project_id,
        user_id=user_id,
        file_name=file_name,
        storage_path=storage_path,
        file_type=file_type,
        status="uploaded",
        citations=citations
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


def get_materials_by_project(db: Session, project_id: str, user_id: str) -> List[Material]:
    """Get all materials for a project."""
    return db.query(Material).filter(
        Material.project_id == project_id,
        Material.user_id == user_id
    ).all()


def get_material_by_id(db: Session, material_id: str, user_id: str) -> Optional[Material]:
    """Get material by ID and user."""
    return db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == user_id
    ).first()


def update_material_status(db: Session, material_id: str, status: str, summary: Optional[str] = None) -> Optional[Material]:
    """Update material status and optionally summary."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.status = status
        if summary:
            material.summary = summary
        material.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(material)
    return material


def delete_material(db: Session, material_id: str, user_id: str) -> bool:
    """Delete material by ID and user."""
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.user_id == user_id
    ).first()
    if material:
        # Delete file from filesystem
        if os.path.exists(material.storage_path):
            os.remove(material.storage_path)
        
        # Delete from database
        db.delete(material)
        db.commit()
        return True
    return False


def save_uploaded_file(file_content: bytes, filename: str, upload_dir: str) -> str:
    """Save uploaded file to filesystem and return file path."""
    # Create upload directory if it doesn't exist
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    return file_path
