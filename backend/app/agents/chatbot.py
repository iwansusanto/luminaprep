"""
ChatbotAgent — conversational AI tutor for LuminaPrep.
Uses OpenAI Agents SDK for tool calling and streaming.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Optional, AsyncGenerator, Any

from agents import Agent, Runner, RunContextWrapper, function_tool, ModelSettings
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.quiz import Quiz
from app.models.project import Project
from app.models.material import Material
from app.models.question import Question
from app.utils.sanitize import sanitize_prompt_field

logger = logging.getLogger(__name__)

os.environ.setdefault("OPENAI_BASE_URL", settings.OPENAI_BASE_URL)
os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)


@dataclass
class ChatbotContext:
    user_id: str
    project_id: Optional[str] = None
    material_id: Optional[str] = None
    quiz_id: Optional[str] = None
    _db: Any = field(default=None, repr=False, compare=False)

    @property
    def db(self):
        return self._db


@function_tool
def get_context(
    ctx: RunContextWrapper[ChatbotContext],
    project_id: Optional[str] = None,
) -> dict:
    """Ambil data pengguna: project, quiz terbaru, dan material terbaru.
    Gunakan ini untuk menjawab pertanyaan tentang data pengguna."""
    db = ctx.context.db
    user_id = ctx.context.user_id
    pid = project_id or ctx.context.project_id

    # Log the query parameters
    logger.info(f"get_context called: user_id={user_id}, project_id={pid}")

    projects_q = db.query(Project).filter(
        Project.user_id == user_id,
        Project.deleted_at.is_(None),
    )
    if pid:
        projects_q = projects_q.filter(Project.id == pid)
    projects = projects_q.all()

    quizzes_q = (
        db.query(Quiz)
        .join(Project)
        .filter(Project.user_id == user_id, Quiz.deleted_at.is_(None))
        .order_by(Quiz.created_at.desc())
        .limit(10)
    )
    if pid:
        quizzes_q = quizzes_q.filter(Quiz.project_id == pid)
    quizzes = quizzes_q.all()

    materials_q = (
        db.query(Material)
        .filter(Material.user_id == user_id, Material.deleted_at.is_(None))
        .order_by(Material.created_at.desc())
        .limit(10)
    )
    if pid:
        materials_q = materials_q.filter(Material.project_id == pid)
    materials = materials_q.all()

    # Log results
    logger.info(
        f"get_context results: {len(projects)} projects, "
        f"{len(quizzes)} quizzes, {len(materials)} materials"
    )

    # Warn if no materials found for specific project
    if pid and len(materials) == 0:
        logger.warning(
            f"No materials found for project_id={pid}, user_id={user_id}. "
            f"Check if materials exist or were soft-deleted."
        )

    result = {
        "projects": [
            {"id": p.id, "title": p.title, "status": p.status} for p in projects
        ],
        "quizzes": [
            {
                "id": q.id,
                "project_id": q.project_id,
                "difficulty_level": q.difficulty_level,
                "question_count": q.question_count,
                "status": q.status,
                "topic": q.topic,
                "custom_request": q.custom_request,
            }
            for q in quizzes
        ],
        "materials": [
            {
                "id": m.id,
                "file_name": m.file_name,
                "status": m.status,
                "project_id": m.project_id,
            }
            for m in materials
        ],
    }

    # Log the result summary
    logger.debug(f"get_context returning: {json.dumps(result, indent=2)}")

    return result


@function_tool
def update_quiz(
    ctx: RunContextWrapper[ChatbotContext],
    quiz_id: str,
    status: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    topic: Optional[str] = None,
    custom_request: Optional[str] = None,
) -> dict:
    """Update properti quiz: status, difficulty_level, topic, atau custom_request.
    Gunakan ketika pengguna meminta perubahan pada quiz."""
    db = ctx.context.db
    user_id = ctx.context.user_id

    quiz = (
        db.query(Quiz)
        .join(Project)
        .filter(
            Quiz.id == quiz_id,
            Project.user_id == user_id,
            Quiz.deleted_at.is_(None),
        )
        .first()
    )
    if not quiz:
        return {"success": False, "error": f"Quiz {quiz_id} tidak ditemukan"}

    changed = []
    if status is not None:
        quiz.status = status
        changed.append(f"status -> {status}")
    if difficulty_level is not None:
        quiz.difficulty_level = difficulty_level
        changed.append(f"difficulty_level -> {difficulty_level}")
    if topic is not None:
        safe_topic = sanitize_prompt_field(topic, 255)
        quiz.topic = safe_topic
        changed.append(f"topic -> {safe_topic}")
    if custom_request is not None:
        safe_cr = sanitize_prompt_field(custom_request, 500)
        quiz.custom_request = safe_cr
        changed.append(f"custom_request -> {safe_cr}")

    if not changed:
        return {"success": False, "error": "Tidak ada field yang diupdate"}

    db.commit()
    db.refresh(quiz)
    return {
        "success": True,
        "quiz_id": quiz.id,
        "changes": changed,
        "current_state": {
            "status": quiz.status,
            "difficulty_level": quiz.difficulty_level,
            "topic": quiz.topic,
            "custom_request": quiz.custom_request,
        },
    }


@function_tool
def search_material(
    ctx: RunContextWrapper[ChatbotContext],
    query: str,
    material_id: Optional[str] = None,
    n_results: int = 5,
) -> dict:
    """Cari informasi dari konten materi menggunakan semantic search.
    Gunakan ini ketika pengguna bertanya tentang isi materi,
    minta penjelasan konsep, atau butuh konteks dari dokumen."""
    try:
        from app.vector_db.collections import chromadb_collections

        collection = chromadb_collections()
        n_results = min(max(1, n_results), 10)

        where = None
        mid = material_id or ctx.context.material_id
        if mid:
            where = {"material_id": mid}

        if where:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
            )
        else:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
            )

        docs = results.get("documents", [[]])[0]
        if not docs:
            return {
                "found": False,
                "results": [],
                "message": "Tidak ada konten yang relevan ditemukan.",
            }

        return {
            "found": True,
            "query": query,
            "results": docs,
            "count": len(docs),
        }
    except Exception as e:
        return {"found": False, "error": str(e)}


@function_tool
def get_quiz_questions(
    ctx: RunContextWrapper[ChatbotContext],
    quiz_id: str,
) -> dict:
    """Ambil daftar soal dari sebuah quiz beserta jawaban dan penjelasannya.
    Gunakan ketika pengguna bertanya tentang soal tertentu atau minta penjelasan jawaban."""
    db = ctx.context.db
    user_id = ctx.context.user_id

    quiz = (
        db.query(Quiz)
        .join(Project)
        .filter(
            Quiz.id == quiz_id,
            Project.user_id == user_id,
            Quiz.deleted_at.is_(None),
        )
        .first()
    )
    if not quiz:
        return {"success": False, "error": f"Quiz {quiz_id} tidak ditemukan"}

    questions = (
        db.query(Question)
        .filter(
            Question.quiz_id == quiz_id,
            Question.deleted_at.is_(None),
        )
        .all()
    )

    return {
        "success": True,
        "quiz_id": quiz_id,
        "difficulty_level": quiz.difficulty_level,
        "topic": quiz.topic,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
            }
            for q in questions
        ],
        "total": len(questions),
    }


@function_tool
def get_quiz_results(
    ctx: RunContextWrapper[ChatbotContext],
    quiz_id: Optional[str] = None,
    limit: int = 5,
) -> dict:
    """Ambil hasil dan skor quiz sessions pengguna.
    Gunakan ketika pengguna bertanya tentang performa, skor, atau riwayat quiz mereka."""
    from app.models.quiz_session import QuizSession

    db = ctx.context.db
    user_id = ctx.context.user_id
    limit = min(max(1, limit), 20)

    q = (
        db.query(QuizSession)
        .filter(
            QuizSession.user_id == user_id,
            QuizSession.deleted_at.is_(None),
        )
        .order_by(QuizSession.started_at.desc())
    )
    if quiz_id:
        q = q.filter(QuizSession.quiz_id == quiz_id)
    sessions = q.limit(limit).all()

    results = []
    for s in sessions:
        score_pct = (
            round((s.correct_answers / s.total_questions) * 100, 1)
            if s.total_questions and s.total_questions > 0
            else 0
        )
        results.append(
            {
                "session_id": s.id,
                "quiz_id": s.quiz_id,
                "status": s.status,
                "total_questions": s.total_questions,
                "correct_answers": s.correct_answers,
                "score": s.score,
                "score_percentage": score_pct,
                "started_at": str(s.started_at) if s.started_at else None,
                "completed_at": str(s.completed_at) if s.completed_at else None,
            }
        )

    return {
        "total_sessions": len(results),
        "sessions": results,
        "average_score": (
            round(sum(r["score_percentage"] for r in results) / len(results), 1)
            if results
            else 0
        ),
    }


@function_tool
def web_search(ctx: RunContextWrapper[ChatbotContext], query: str) -> dict:
    """Cari informasi dari internet. Gunakan HANYA jika pertanyaan tidak bisa dijawab
    dari materi yang diupload atau data pengguna.
    Selalu cantumkan sumber URL dalam jawaban."""
    import urllib.request
    import urllib.parse

    try:
        encoded = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"

        req = urllib.request.Request(url, headers={"User-Agent": "LuminaPrep/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())

        results = []

        if data.get("AbstractText"):
            results.append(
                {
                    "title": data.get("Heading", ""),
                    "snippet": data["AbstractText"][:500],
                    "url": data.get("AbstractURL", ""),
                    "source": data.get("AbstractSource", ""),
                }
            )

        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(
                    {
                        "title": topic.get("Text", "")[:100],
                        "snippet": topic.get("Text", "")[:300],
                        "url": topic.get("FirstURL", ""),
                        "source": "DuckDuckGo",
                    }
                )

        if not results:
            return {
                "found": False,
                "message": "Tidak ada hasil ditemukan. Coba reformulasi pertanyaan.",
                "query": query,
            }

        return {
            "found": True,
            "query": query,
            "results": results,
            "note": "Selalu cantumkan URL sumber dalam jawaban.",
        }

    except Exception as e:
        return {"found": False, "error": str(e), "query": query}


def _build_system_prompt(
    project_id: Optional[str],
    material_id: Optional[str],
    quiz_id: Optional[str],
) -> str:
    base = (
        "Kamu adalah asisten AI tutor untuk platform LuminaPrep, platform belajar berbasis AI. "
        "Kamu membantu pengguna belajar, memahami materi, dan mengelola quiz mereka. "
        "Jawab dalam bahasa yang sama dengan pertanyaan pengguna (Indonesia atau Inggris). "
        "Berikan jawaban yang jelas, akurat, dan membantu.\n\n"
    )

    context_lines = []
    if project_id:
        context_lines.append(f"- Pengguna sedang bekerja di project ID: {project_id}")
    if material_id:
        context_lines.append(
            f"- Pengguna sedang melihat material ID: {material_id}. "
            "Gunakan tool search_material untuk menjawab pertanyaan tentang isi materi ini."
        )
    if quiz_id:
        context_lines.append(
            f"- Pengguna sedang mengerjakan quiz ID: {quiz_id}. "
            "Gunakan tool get_quiz_questions untuk mengakses soal-soal quiz ini."
        )

    if context_lines:
        base += "Konteks sesi ini:\n" + "\n".join(context_lines) + "\n\n"

    base += (
        "Panduan penggunaan tools:\n"
        "- Jika pengguna bertanya tentang data mereka -> gunakan get_context\n"
        "- Jika pengguna bertanya tentang isi materi/konsep -> gunakan search_material\n"
        "- Jika pengguna bertanya tentang soal quiz -> gunakan get_quiz_questions\n"
        "- Jika pengguna bertanya tentang skor/hasil quiz -> gunakan get_quiz_results\n"
        "- Jika pengguna minta update quiz -> gunakan update_quiz\n"
        "- Jika pertanyaan tidak bisa dijawab dari materi/data -> gunakan web_search, cantumkan sumber\n"
        "- Jangan gunakan tool jika tidak diperlukan"
    )
    return base


TOOLS = [
    get_context,
    update_quiz,
    search_material,
    get_quiz_questions,
    get_quiz_results,
    web_search,
]


class ChatbotAgent:
    def __init__(
        self,
        db: Session,
        user_id: str,
        project_id: Optional[str] = None,
        material_id: Optional[str] = None,
        quiz_id: Optional[str] = None,
    ):
        self.db = db
        self.user_id = user_id
        self.project_id = project_id
        self.material_id = material_id
        self.quiz_id = quiz_id
        self._final_response: str = ""
        self._tool_calls: list[dict] = []
        self._tool_results: list[dict] = []

    def _build_context(self) -> ChatbotContext:
        return ChatbotContext(
            user_id=self.user_id,
            project_id=self.project_id,
            material_id=self.material_id,
            quiz_id=self.quiz_id,
            _db=self.db,
        )

    async def chat_stream(
        self,
        history: list[dict],
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        system_prompt = _build_system_prompt(
            self.project_id, self.material_id, self.quiz_id
        )

        # Create explicit model settings with empty metadata dict
        # This prevents langfuse validation error "metadata must be a dictionary"
        model_settings = ModelSettings(
            metadata={}  # Explicitly set empty dict instead of None
        )

        agent = Agent(
            name="LuminaPrep Tutor",
            instructions=system_prompt,
            model="gpt-4o-mini",
            tools=TOOLS,
            model_settings=model_settings,
        )

        history_text = ""
        for msg in history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                history_text += f"User: {content}\n"
            elif role == "assistant":
                history_text += f"Assistant: {content}\n"
            elif role == "tool":
                history_text += f"Tool result: {content}\n"

        full_input = (
            f"{history_text}\nUser: {user_message}" if history_text else user_message
        )

        runner = Runner.run_streamed(
            agent,
            input=full_input,
            context=self._build_context(),
        )

        async for event in runner.stream_events():
            if event.type == "raw_response_event":
                if hasattr(event.data, "delta") and event.data.delta:
                    self._final_response += event.data.delta
                    yield f"data: {json.dumps({'type': 'text_delta', 'delta': event.data.delta})}\n\n"

            elif event.type == "run_item_stream_event":
                if event.name == "tool_called":
                    if hasattr(event.item, "raw_item") and hasattr(
                        event.item.raw_item, "name"
                    ):
                        tool_name = event.item.raw_item.name
                        arguments = getattr(event.item.raw_item, "arguments", "{}")
                        tool_call_id = getattr(event.item.raw_item, "id", None)

                        self._tool_calls.append(
                            {"tool": tool_name, "args": arguments, "id": tool_call_id}
                        )

                        yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': tool_name, 'tool_call_id': tool_call_id, 'argument': arguments})}\n\n"

                        logger.info(f"Tool called: {tool_name} with args: {arguments}")

                # Capture tool results
                elif event.name == "tool_result":
                    if hasattr(event.item, "raw_item"):
                        tool_call_id = getattr(
                            event.item.raw_item, "tool_call_id", None
                        )
                        result = getattr(event.item.raw_item, "content", None)

                        # Parse result if it's a string
                        try:
                            if isinstance(result, str):
                                result_data = json.loads(result)
                            else:
                                result_data = result
                        except (json.JSONDecodeError, TypeError):
                            result_data = {"raw": str(result)}

                        self._tool_results.append(
                            {"tool_call_id": tool_call_id, "result": result_data}
                        )

                        yield f"data: {json.dumps({'type': 'tool_result', 'tool_call_id': tool_call_id, 'result': result_data})}\n\n"

                        logger.info(f"Tool result for {tool_call_id}: {result_data}")

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    def get_final_response(self) -> str:
        return self._final_response

    def get_tool_calls(self) -> list[dict]:
        return self._tool_calls

    def get_tool_results(self) -> list[dict]:
        return self._tool_results
