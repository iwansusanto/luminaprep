from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime


class MaterialBase(SQLModel):
    file_name: str = Field(max_length=255)
    storage_path: str = Field(max_length=500)
    file_type: str = Field(max_length=100)
    file_size: Optional[int] = None
    status: str = Field(default="uploaded", max_length=50)
    summary: Optional[str] = None
    citations: Optional[str] = None


class MaterialCreate(MaterialBase):
    project_id: str
    pass


class MaterialRead(MaterialBase):
    id: str
    project_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class MaterialUpdate(SQLModel):
    file_name: Optional[str] = Field(default=None, max_length=255)
    storage_path: Optional[str] = Field(default=None, max_length=500)
    file_type: Optional[str] = Field(default=None, max_length=100)
    file_size: Optional[int] = None
    status: Optional[str] = Field(default=None, max_length=50)
    summary: Optional[str] = None
    citations: Optional[str] = None


class MaterialListResponse(SQLModel):
    materials: List[MaterialRead]


class MaterialResponse(MaterialRead):
    pass
