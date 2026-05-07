from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class ProjectBase(SQLModel):
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)
    vector_collection_name: Optional[str] = Field(max_length=255, default=None)
    status: str = Field(default="active", max_length=50)


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    vector_collection_name: Optional[str] = None
    status: Optional[str] = None
