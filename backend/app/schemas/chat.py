from sqlmodel import SQLModel, Field
from typing import Optional, List, Any
from datetime import datetime


class ChatMessageRead(SQLModel):
    id: str
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_result: Optional[Any] = None
    created_at: datetime


class ChatSessionRead(SQLModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    material_id: Optional[str] = None
    quiz_id: Optional[str] = None
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatSessionWithMessages(ChatSessionRead):
    messages: List[ChatMessageRead] = []


class ChatRequest(SQLModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = Field(
        default=None,
        description="Continue an existing session. Omit to start a new one.",
    )
    # Context scoping — FE passes these to give the agent relevant context
    project_id: Optional[str] = Field(default=None)
    material_id: Optional[str] = Field(
        default=None,
        description="Scope to a specific material — enables tutor mode",
    )
    quiz_id: Optional[str] = Field(
        default=None,
        description="Scope to a specific quiz — enables quiz assistant mode",
    )
    # Attach multiple materials for this message
    attached_material_ids: Optional[list[str]] = Field(
        default=None,
        description="List of material IDs to attach as context for this message",
    )


class ChatResponse(SQLModel):
    session_id: str
    reply: str
    tool_calls: List[dict] = []
