from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class ProjectBase(SQLModel):
    title: str = Field(max_length=255)
    description: str = Field(max_length=1000)
    vector_collection_name: Optional[str] = Field(default=None, max_length=255)
    status: str = Field(default="active", max_length=50)


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(SQLModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    vector_collection_name: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50)
