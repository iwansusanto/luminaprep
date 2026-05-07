from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid


class MaterialBase(SQLModel):
    file_name: str = Field(max_length=255)
    storage_path: str = Field(max_length=512)
    file_type: str = Field(max_length=50)
    status: str = Field(default="uploaded", max_length=50)  # uploaded, processing, processed, failed
    summary: Optional[str] = Field(default=None)
    citations: Optional[str] = Field(default=None)  # JSON string


class Material(MaterialBase, table=True):
    __tablename__ = "materials"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id")
    user_id: str = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    project: Optional["Project"] = Relationship(back_populates="materials")
    user: Optional["User"] = Relationship(back_populates="materials")


class MaterialCreate(SQLModel):
    file_name: str = Field(max_length=255)
    storage_path: str = Field(max_length=512)
    file_type: str = Field(max_length=50)


class MaterialRead(SQLModel):
    id: str
    project_id: str
    user_id: str
    file_name: str
    file_type: str
    storage_path: str
    status: str
    summary: Optional[str]
    citations: Optional[str]
    created_at: datetime
    updated_at: datetime


class MaterialUpdate(SQLModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    citations: Optional[str] = None
