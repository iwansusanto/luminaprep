from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid


class QuizSessionBase(SQLModel):
    score: Optional[float] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    status: Optional[str] = None  # "active", "completed", "abandoned"


class QuizSession(QuizSessionBase, table=True):
    __tablename__ = "quiz_sessions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    quiz_id: str = Field(foreign_key="quizzes.id")
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    user: "User" = Relationship(back_populates="quiz_sessions")
    quiz: "Quiz" = Relationship(back_populates="quiz_sessions")
    user_attempts: list["UserAttempt"] = Relationship(back_populates="quiz_session")


class QuizSessionCreate(QuizSessionBase):
    user_id: str
    quiz_id: str


class QuizSessionRead(QuizSessionBase):
    id: str
    user_id: str
    quiz_id: str
    started_at: datetime
    completed_at: Optional[datetime]


class QuizSessionUpdate(SQLModel):
    score: Optional[float] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class QuizSessionWithQuestions(QuizSessionRead):
    quiz: Optional["QuizRead"] = None
    user_attempts: Optional[list["UserAttemptRead"]] = None
