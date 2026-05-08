from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime


class QuizBase(SQLModel):
    difficulty_level: str = Field(max_length=50)
    question_count: int
    status: str = Field(default="draft", max_length=50)


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


class QuestionBase(SQLModel):
    question_text: str
    options: dict
    correct_answer: str
    explanation: Optional[str] = None
    metadata: Optional[dict] = None


class QuestionRead(QuestionBase):
    id: str
    quiz_id: str
    created_at: datetime
    updated_at: datetime


class QuizWithQuestions(QuizRead):
    questions: List[QuestionRead] = []


class QuizGenerationRequest(SQLModel):
    difficulty_level: str = Field(max_length=50)
    question_count: int


class QuizGenerationResponse(SQLModel):
    task_id: str
    status: str
    message: str
