from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid


class UserAttemptBase(SQLModel):
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    score_earned: Optional[float] = None
    feedback_text: Optional[str] = None


class UserAttempt(UserAttemptBase, table=True):
    __tablename__ = "user_attempts"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    quiz_id: str = Field(foreign_key="quizzes.id")
    question_id: str = Field(foreign_key="questions.id")
    quiz_session_id: Optional[str] = Field(foreign_key="quiz_sessions.id", default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    user: "User" = Relationship(back_populates="user_attempts")
    quiz: "Quiz" = Relationship(back_populates="user_attempts")
    question: "Question" = Relationship(back_populates="user_attempts")
    quiz_session: "QuizSession" = Relationship(back_populates="user_attempts")


class UserAttemptCreate(UserAttemptBase):
    user_id: str
    quiz_id: str
    question_id: str


class UserAttemptRead(UserAttemptBase):
    id: str
    user_id: str
    quiz_id: str
    question_id: str
    created_at: datetime
    updated_at: datetime


class UserAttemptUpdate(SQLModel):
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    score_earned: Optional[float] = None
    feedback_text: Optional[str] = None
