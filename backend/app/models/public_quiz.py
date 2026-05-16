from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class PublicQuiz(SQLModel, table=True):
    __tablename__ = "public_quizzes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    material_id: Optional[str] = Field(default=None)
    quiz_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
