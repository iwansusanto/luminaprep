"""
Agent / Chatbot API

POST   /api/v1/agent/chat              — send message (new or existing session) — streaming SSE
GET    /api/v1/agent/sessions          — list user's sessions
GET    /api/v1/agent/sessions/{id}     — session + full message history
DELETE /api/v1/agent/sessions/{id}     — soft-delete session
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatRequest,
    ChatSessionRead,
    ChatSessionWithMessages,
    ChatMessageRead,
)
from app.agents.chatbot import ChatbotAgent
from app.utils import langfuse_client as observability

router = APIRouter()


def _preview(text: str, limit: int = 500) -> str:
    return " ".join(text.split())[:limit]


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Send a message to the AI agent. Returns a streaming SSE response.

    Context scoping (all optional):
    - project_id  -> scope to a project
    - material_id -> enables tutor mode (agent can search material content)
    - quiz_id     -> enables quiz assistant mode (agent can access quiz questions)

    Pass session_id to continue an existing conversation.
    Omit session_id to start a new one.
    """
    trace = observability.safe_trace(
        "chatbot-agent",
        metadata=observability.standard_metadata(
            "chatbot-agent",
            user_id=current_user.id,
            project_id=body.project_id,
            material_id=body.material_id,
            quiz_id=body.quiz_id,
            session_id=body.session_id,
            attached_material_count=len(body.attached_material_ids or []),
            history_count=0,
            mode="stream",
        ),
        input={
            "session_id": body.session_id,
            "message_preview": _preview(body.message),
            "project_id": body.project_id,
            "material_id": body.material_id,
            "quiz_id": body.quiz_id,
            "attached_material_ids": body.attached_material_ids or [],
            "history_count": 0,
            "mode": "stream",
        },
    )
    if body.session_id:
        load_session_span = observability.span(
            trace,
            "load-chat-session",
            input={"session_id": body.session_id},
        )
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.deleted_at.is_(None),
            )
            .first()
        )
        observability.end_observation(
            load_session_span,
            output={"found": bool(session), "session_id": body.session_id},
        )
        if not session:
            observability.update_observation(
                trace,
                output={
                    "status": "failed",
                    "error": "Session not found",
                    "session_id": body.session_id,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
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

    load_history_span = observability.span(
        trace,
        "load-chat-history",
        input={"session_id": session.id},
    )
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
    observability.end_observation(
        load_history_span,
        output={"message_count": len(prior), "history_count": len(history)},
    )

    user_message = body.message
    if body.attached_material_ids:
        material_ids_str = ", ".join(body.attached_material_ids)
        user_message = (
            f"[Materi yang dilampirkan: {material_ids_str}]\n\n{body.message}"
        )
        if len(body.attached_material_ids) == 1 and not session.material_id:
            session.material_id = body.attached_material_ids[0]

    db.add(ChatMessage(session_id=session.id, role="user", content=body.message))
    db.commit()

    persist_user_span = observability.span(
        trace,
        "persist-user-message",
        input={"session_id": session.id},
    )
    observability.end_observation(
        persist_user_span,
        output={"status": "success", "message_length": len(body.message)},
    )

    observability.update_observation(
        trace,
        metadata=observability.standard_metadata(
            "chatbot-agent",
            user_id=current_user.id,
            project_id=session.project_id,
            material_id=session.material_id,
            quiz_id=session.quiz_id,
            session_id=session.id,
            attached_material_count=len(body.attached_material_ids or []),
            history_count=len(history),
            mode="stream",
        ),
        input={
            "session_id": session.id,
            "message_preview": _preview(body.message),
            "project_id": session.project_id,
            "material_id": session.material_id,
            "quiz_id": session.quiz_id,
            "attached_material_ids": body.attached_material_ids or [],
            "history_count": len(history),
            "mode": "stream",
        },
    )

    agent = ChatbotAgent(
        db=db,
        user_id=current_user.id,
        project_id=session.project_id,
        material_id=session.material_id,
        quiz_id=session.quiz_id,
        trace=trace,
    )

    async def event_generator():
        try:
            observability.update_observation(
                trace,
                output={
                    "status": "streaming",
                    "session_id": session.id,
                    "message_preview": _preview(body.message),
                },
            )
            async for chunk in agent.chat_stream(
                history=history, user_message=user_message
            ):
                yield chunk
        except Exception as e:
            observability.update_observation(
                trace,
                output={
                    "status": "failed",
                    "session_id": session.id,
                    "error": str(e),
                },
            )
            observability.flush()
            yield f"data: {__import__('json').dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        reply = agent.get_final_response()
        tool_calls = agent.get_tool_calls()

        for tc in tool_calls:
            persist_tool_span = observability.span(
                trace,
                "persist-tool-message",
                input={
                    "session_id": session.id,
                    "tool_name": tc.get("tool"),
                },
            )
            db.add(
                ChatMessage(
                    session_id=session.id,
                    role="tool",
                    content="",
                    tool_name=tc.get("tool"),
                    tool_result=tc.get("args"),
                )
            )
            observability.end_observation(
                persist_tool_span,
                output={"status": "success", "tool_name": tc.get("tool")},
            )

        persist_assistant_span = observability.span(
            trace,
            "persist-assistant-message",
            input={"session_id": session.id},
        )
        db.add(ChatMessage(session_id=session.id, role="assistant", content=reply))
        session.updated_at = _now()
        db.commit()
        observability.end_observation(
            persist_assistant_span,
            output={"status": "success", "reply_length": len(reply)},
        )

        observability.update_observation(
            trace,
            output={
                "status": "completed",
                "session_id": session.id,
                "reply_length": len(reply),
                "tool_calls": len(tool_calls),
            },
        )
        observability.flush()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessages)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.deleted_at.is_(None),
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

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


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.deleted_at.is_(None),
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    session.deleted_at = _now()
    db.commit()
    return {"message": "Session deleted"}
