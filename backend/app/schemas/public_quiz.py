from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


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
    difficulty_level: str
    question_count: int
    created_at: datetime


class PublicQuizDetail(SQLModel):
    """Response for getting a single public quiz detail."""

    quiz_id: str
    topic: Optional[str] = None
    difficulty_level: str
    question_count: int
    custom_request: Optional[str] = None
    created_at: datetime
