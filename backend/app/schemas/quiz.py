from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime


class QuizBase(SQLModel):
    difficulty_level: str = Field(max_length=50)
    question_count: int
    status: str = Field(default="draft", max_length=50)
    topic: Optional[str] = Field(default=None, max_length=255)
    custom_request: Optional[str] = Field(default=None, max_length=1000)


class QuizCreate(QuizBase):
    project_id: str


class QuizAttemptRead(SQLModel):
    quiz_id: str
    quiz_session_id: str
    score_correct: Optional[int] = None
    score_earned: Optional[float] = None
    total_questions: Optional[int] = None


class QuizRead(QuizBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    user_attempts: List[QuizAttemptRead] = []


class QuizUpdate(SQLModel):
    difficulty_level: Optional[str] = Field(default=None, max_length=50)
    question_count: Optional[int] = None
    status: Optional[str] = Field(default=None, max_length=50)
    topic: Optional[str] = Field(default=None, max_length=255)
    custom_request: Optional[str] = Field(default=None, max_length=1000)


class QuestionBase(SQLModel):
    question_text: str
    options: dict
    correct_answer: str
    explanation: Optional[str] = None
    question_metadata: Optional[dict] = None


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
    topic: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Topik spesifik, contoh: 'pecahan', 'fotosintesis'",
    )
    custom_request: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Instruksi tambahan, contoh: 'gunakan bahasa Inggris untuk kelas 5 SD'",
    )


class QuizGenerationResponse(SQLModel):
    task_id: str
    status: str
    message: str
    questions_count: int = 0
