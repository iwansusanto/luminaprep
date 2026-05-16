"""
Stream endpoints — Server-Sent Events (SSE)

GET /api/v1/stream/feedback/{session_id}/{question_id}
  → Stream real AI feedback for a submitted answer

GET /api/v1/stream/summary/{material_id}
  → Stream the stored material summary word-by-word (real data, no mock)

Note: EventSource (SSE) does not support custom headers in browsers.
      Auth token is accepted via ?token= query param for these endpoints.
"""
import json
import asyncio
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.crud.quiz_session import get_quiz_session_by_id
from app.crud.material import get_material_by_id
from app.crud.question import get_question_by_id
from app.utils.oa_client import oa_client
from app.utils import langfuse_client as observability
from app.core.config import settings

security_optional = HTTPBearer(auto_error=False)

router = APIRouter()

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

MODEL_NAME = "gpt-4o-mini"
PROMPT_VERSION = "v1"


def _preview(text: str, limit: int = 500) -> str:
    return " ".join(text.split())[:limit]


# ── Auth helper for SSE (token via query param) ───────────────────────────────

def _get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Validate JWT token and return user. Used for SSE endpoints."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("user_id")
        email: str = payload.get("sub")
        if not user_id and not email:
            return None
        if user_id:
            return db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
        return db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    except JWTError:
        return None


# ── helpers ───────────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _real_feedback_stream(
    question_text: str,
    correct_answer: str,
    user_answer: str,
    explanation: str | None,
    is_correct: bool,
    trace=None,
    question_id: str | None = None,
    quiz_id: str | None = None,
    session_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream AI feedback token-by-token via OpenAI chat completions."""

    correctness = "BENAR ✓" if is_correct else "SALAH ✗"
    system = (
        "Kamu adalah tutor AI yang memberikan umpan balik konstruktif dan edukatif "
        "untuk jawaban kuis. Gunakan bahasa yang sama dengan pertanyaan (Indonesia/Inggris). "
        "Berikan penjelasan yang jelas, singkat, dan membantu."
    )
    user_prompt = (
        f"Pertanyaan: {question_text}\n"
        f"Jawaban Siswa: {user_answer}\n"
        f"Jawaban Benar: {correct_answer}\n"
        f"Status: {correctness}\n"
        f"Penjelasan dari materi: {explanation or 'Tidak ada'}\n\n"
        "Berikan umpan balik singkat (2-3 paragraf) yang:\n"
        "1. Konfirmasi apakah jawaban benar/salah\n"
        "2. Jelaskan mengapa jawaban benar itu benar\n"
        "3. Berikan tips belajar terkait topik ini"
    )

    # Send start event
    yield _sse({"type": "start", "is_correct": is_correct})

    generation = observability.generation(
        trace,
        name="feedback-generation-stream",
        model=MODEL_NAME,
        input_data={
            "operation": "feedback-generation-stream",
            "prompt_version": PROMPT_VERSION,
            "question_id": question_id,
            "quiz_id": quiz_id,
            "session_id": session_id,
            "is_correct": is_correct,
            "prompt_preview": _preview(user_prompt),
        },
    )
    token_count = 0
    try:
        stream = oa_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            stream=True,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                token_count += 1
                yield _sse({"type": "token", "content": delta.content})
                await asyncio.sleep(0)  # yield control to event loop

        observability.end_observation(
            generation,
            output={"status": "success", "stream_chunks": token_count},
        )
        observability.update_observation(
            trace,
            output={"status": "success", "stream_chunks": token_count},
        )
        yield _sse({"type": "done", "completed": True})

    except Exception as e:
        observability.end_observation(
            generation,
            output={"status": "failed", "error": str(e)},
        )
        observability.update_observation(
            trace,
            output={"status": "failed", "error": str(e)},
        )
        yield _sse({"type": "error", "message": str(e)})

    yield "data: [DONE]\n\n"


async def _summary_stream(summary: str, material_name: str) -> AsyncGenerator[str, None]:
    """Stream the stored material summary word-by-word for a typewriter effect."""

    yield _sse({"type": "start", "material_name": material_name})

    words = summary.split(" ")
    chunk_size = 3  # send 3 words at a time for smooth streaming

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size])
        # Add space back except at end
        if i + chunk_size < len(words):
            chunk += " "
        yield _sse({"type": "token", "content": chunk})
        await asyncio.sleep(0.04)  # ~25 chunks/sec → smooth typewriter

    yield _sse({"type": "done", "completed": True})
    yield "data: [DONE]\n\n"


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/feedback/{session_id}/{question_id}")
async def stream_feedback(
    session_id: str,
    question_id: str,
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    bearer: Optional[str] = Depends(security_optional),
):
    """
    Stream AI feedback for a specific question in a quiz session.
    Accepts auth via Bearer header OR ?token= query param (for EventSource).
    """
    # Manually resolve user: Bearer header first, then ?token= fallback
    user = None
    if bearer is not None:
        try:
            payload = jwt.decode(bearer.credentials, settings.secret_key, algorithms=[settings.algorithm])
            user_id: str = payload.get("user_id")
            email: str = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
            elif email:
                user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
        except JWTError:
            pass
    if user is None and token:
        user = _get_user_from_token(token, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    quiz_session = get_quiz_session_by_id(db, session_id, user.id)
    if not quiz_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")

    question = get_question_by_id(db, question_id, user.id)
    if not question or question.quiz_id != quiz_session.quiz_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Find the user's submitted answer for this question
    from app.models.user_attempt import UserAttempt
    attempt = (
        db.query(UserAttempt)
        .filter(
            UserAttempt.quiz_session_id == session_id,
            UserAttempt.question_id == question_id,
            UserAttempt.user_id == user.id,
            UserAttempt.deleted_at.is_(None),
        )
        .first()
    )

    user_answer = attempt.user_answer if attempt else "Tidak dijawab"
    is_correct = attempt.is_correct if attempt else False
    trace = observability.safe_trace(
        "feedback-generation",
        metadata=observability.standard_metadata(
            "feedback-generation",
            user_id=user.id,
            project_id=question.quiz.project_id if question.quiz else None,
            quiz_id=quiz_session.quiz_id,
            session_id=session_id,
            question_id=question_id,
            is_correct=is_correct,
            mode="stream",
        ),
        input={
            "quiz_id": quiz_session.quiz_id,
            "session_id": session_id,
            "question_id": question_id,
            "is_correct": is_correct,
            "mode": "stream",
        },
    )

    return StreamingResponse(
        _real_feedback_stream(
            question_text=question.question_text,
            correct_answer=question.correct_answer,
            user_answer=user_answer,
            explanation=question.explanation,
            is_correct=is_correct,
            trace=trace,
            question_id=question_id,
            quiz_id=quiz_session.quiz_id,
            session_id=session_id,
        ),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/summary/{material_id}")
async def stream_summary(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Stream the material summary with a typewriter effect.
    Uses the summary already stored in the DB (generated during ingestion).
    Returns SSE stream: start → token* → done
    """
    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    if not material.summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not available yet. Material may still be processing.",
        )

    return StreamingResponse(
        _summary_stream(material.summary, material.file_name),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
