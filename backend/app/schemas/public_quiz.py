from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from app.models.user import UserRead


class PublicQuizCreate(SQLModel):
    quiz_id: str


class PublicQuizRead(SQLModel):
    quiz_id: str
    material_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PublicQuizListItem(SQLModel):
    """Response for listing public quizzes."""

    quiz_id: str
    topic: Optional[str] = None
    material_file_name: Optional[str] = None
    difficulty_level: str
    question_count: int
    created_at: datetime
    user_owner: Optional[UserRead] = None
    is_attempt: bool = False


class PublicQuizDetail(SQLModel):
    """Response for getting a single public quiz detail."""

    quiz_id: str
    topic: Optional[str] = None
    difficulty_level: str
    question_count: int
    custom_request: Optional[str] = None
    created_at: datetime
