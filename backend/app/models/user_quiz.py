from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class UserQuiz(SQLModel, table=True):
    __tablename__ = "user_quizzes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    quiz_id: str = Field(foreign_key="quizzes.id", index=True)
    is_owner: bool = Field(default=False)
    deleted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
