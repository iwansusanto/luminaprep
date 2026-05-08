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
    user_id: str = Field(foreign_key="users.id")
    quiz_id: str = Field(foreign_key="quizzes.id")
    question_id: str = Field(foreign_key="questions.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="user_attempts")
    quiz: "Quiz" = Relationship(back_populates="user_attempts")
    question: "Question" = Relationship(back_populates="user_attempts")


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
