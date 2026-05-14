"""
Agent / Chatbot API

POST   /api/v1/agent/chat              — send message (new or existing session)
GET    /api/v1/agent/sessions          — list user's sessions
GET    /api/v1/agent/sessions/{id}     — session + full message history
DELETE /api/v1/agent/sessions/{id}     — soft-delete session
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSessionRead,
    ChatSessionWithMessages,
    ChatMessageRead,
)
from app.agents.chatbot import ChatbotAgent

router = APIRouter()


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── POST /agent/chat ──────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Send a message to the AI agent.

    Context scoping (all optional):
    - project_id  → scope to a project
    - material_id → enables tutor mode (agent can search material content)
    - quiz_id     → enables quiz assistant mode (agent can access quiz questions)

    Pass session_id to continue an existing conversation.
    Omit session_id to start a new one.
    """
    # Resolve or create session
    if body.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == body.session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.deleted_at.is_(None),
        ).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    else:
        session = ChatSession(
            user_id=current_user.id,
            project_id=body.project_id,
            material_id=body.material_id,
            quiz_id=body.quiz_id,
            title=body.message[:60],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Load prior history
    prior = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    history = []
    for m in prior:
        if m.role == "tool":
            history.append({"role": "tool", "tool_call_id": m.id, "content": m.content})
        else:
            history.append({"role": m.role, "content": m.content})

    # Run agent with full context
    # If user attached specific materials, prepend them to the message
    user_message = body.message
    if body.attached_material_ids:
        material_ids_str = ", ".join(body.attached_material_ids)
        user_message = (
            f"[Materi yang dilampirkan: {material_ids_str}]\n\n{body.message}"
        )
        # Also set material_id on session if only one attached
        if len(body.attached_material_ids) == 1 and not session.material_id:
            session.material_id = body.attached_material_ids[0]

    agent = ChatbotAgent(
        db=db,
        user_id=current_user.id,
        project_id=session.project_id,
        material_id=session.material_id,
        quiz_id=session.quiz_id,
    )

    try:
        reply, tool_calls = agent.chat(history=history, user_message=user_message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent error: {str(e)}",
        )

    # Persist messages
    db.add(ChatMessage(session_id=session.id, role="user", content=body.message))

    for tc in tool_calls:
        db.add(ChatMessage(
            session_id=session.id,
            role="tool",
            content="",
            tool_name=tc["tool"],
            tool_result=tc.get("args"),
        ))

    db.add(ChatMessage(session_id=session.id, role="assistant", content=reply))

    session.updated_at = _now()
    db.commit()

    return ChatResponse(session_id=session.id, reply=reply, tool_calls=tool_calls)


# ── GET /agent/sessions ───────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[ChatSessionRead])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == current_user.id,
            ChatSession.deleted_at.is_(None),
        )
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


# ── GET /agent/sessions/{session_id} ─────────────────────────────────────────

@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessages)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
        ChatSession.deleted_at.is_(None),
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    return ChatSessionWithMessages(
        **session.model_dump(),
        messages=[ChatMessageRead(**m.model_dump()) for m in messages],
    )


# ── DELETE /agent/sessions/{session_id} ──────────────────────────────────────

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
        ChatSession.deleted_at.is_(None),
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.deleted_at = _now()
    db.commit()
    return {"message": "Session deleted"}
