from sqlmodel import SQLModel, Field, Relationship
import sqlalchemy as sa
from sqlalchemy import JSON
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class QuestionBase(SQLModel):
    question_text: str = Field(sa_type=sa.TEXT)
    correct_answer: str
    explanation: Optional[str] = Field(default=None, sa_type=sa.TEXT)


class Question(QuestionBase, table=True):
    __tablename__ = "questions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quiz_id: str = Field(foreign_key="quizzes.id")
    options: Dict[str, Any] = Field(sa_type=JSON)
    question_metadata: Optional[Dict[str, Any]] = Field(sa_type=JSON, default=None)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    quiz: "Quiz" = Relationship(back_populates="questions")
    user_attempts: List["UserAttempt"] = Relationship(back_populates="question")


class QuestionCreate(QuestionBase):
    quiz_id: str
    options: Dict[str, Any]
    question_metadata: Optional[Dict[str, Any]] = None


class QuestionRead(QuestionBase):
    id: str
    quiz_id: str
    options: Dict[str, Any]
    question_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class QuestionUpdate(SQLModel):
    question_text: Optional[str] = Field(default=None, sa_type=sa.TEXT)
    options: Optional[Dict[str, Any]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = Field(default=None, sa_type=sa.TEXT)
    question_metadata: Optional[Dict[str, Any]] = None
