from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class QuizBase(SQLModel):
    difficulty_level: str = Field(max_length=50)  # 'beginner', 'intermediate', 'expert'
    question_count: int
    status: str = Field(default="draft", max_length=50)  # 'draft', 'generated', 'completed'


class Quiz(QuizBase, table=True):
    __tablename__ = "quizzes"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="project.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    project: "Project" = Relationship(back_populates="quizzes")
    questions: List["Question"] = Relationship(back_populates="quiz")
    user_attempts: List["UserAttempt"] = Relationship(back_populates="quiz")
    quiz_sessions: List["QuizSession"] = Relationship(back_populates="quiz")


class QuizCreate(QuizBase):
    project_id: str


class QuizRead(QuizBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime


class QuizUpdate(SQLModel):
    difficulty_level: Optional[str] = Field(default=None, max_length=50)
    question_count: Optional[int] = None
    status: Optional[str] = Field(default=None, max_length=50)


class QuizWithQuestions(QuizRead):
    questions: List["Question"] = []
