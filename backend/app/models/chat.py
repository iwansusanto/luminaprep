from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import JSON, TEXT
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    project_id: Optional[str] = Field(default=None, foreign_key="projects.id")
    material_id: Optional[str] = Field(default=None)  # context hint, no FK needed
    quiz_id: Optional[str] = Field(default=None)       # context hint, no FK needed
    title: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relationships
    messages: List["ChatMessage"] = Relationship(back_populates="session")


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="chat_sessions.id")
    role: str = Field(max_length=20)  # "user" | "assistant" | "tool"
    content: str = Field(sa_type=TEXT)
    tool_name: Optional[str] = Field(default=None, max_length=100)
    tool_result: Optional[Dict[str, Any]] = Field(sa_type=JSON, default=None)
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    session: "ChatSession" = Relationship(back_populates="messages")
