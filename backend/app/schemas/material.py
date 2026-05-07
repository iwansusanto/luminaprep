from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class MaterialCreate(SQLModel):
    file_name: str = Field(max_length=255)
    file_type: str = Field(max_length=50)


class MaterialResponse(SQLModel):
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


class MaterialListResponse(SQLModel):
    materials: list[MaterialResponse]


class MaterialStatusUpdate(SQLModel):
    status: str = Field(max_length=50)
    summary: Optional[str] = None
    citations: Optional[str] = None
