from sqlmodel import SQLModel, Field, Relationship
import sqlalchemy as sa
from typing import Optional
from datetime import datetime
import uuid


class MaterialBase(SQLModel):
    file_name: str = Field(max_length=255)
    file_type: str = Field(max_length=50)
    storage_path: str = Field(max_length=512)
    file_size: Optional[int] = Field(default=None)
    status: str = Field(default="uploaded", max_length=50)
    file_size: Optional[int] = Field(default=None)
    summary: Optional[str] = Field(default=None, sa_type=sa.TEXT)
    citations: Optional[str] = Field(default=None, sa_type=sa.TEXT)


class MaterialCreate(MaterialBase):
    project_id: str


class MaterialRead(MaterialBase):
    id: str
    project_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class MaterialUpdate(SQLModel):
    file_name: Optional[str] = Field(default=None, max_length=255)
    file_type: Optional[str] = Field(default=None, max_length=50)
    storage_path: Optional[str] = Field(default=None, max_length=512)
    status: Optional[str] = Field(default=None, max_length=50)
    file_size: Optional[int] = None
    summary: Optional[str] = None
    citations: Optional[str] = None


class Material(MaterialBase, table=True):
    __tablename__ = "materials"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id")
    user_id: str = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relationships
    project: "Project" = Relationship(back_populates="materials")
    user: "User" = Relationship(back_populates="materials")
