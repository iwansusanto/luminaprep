"""
ChatbotAgent — conversational AI tutor for LuminaPrep.

Tools:
  1. get_context        — projects, quizzes, materials milik user
  2. update_quiz        — update field quiz
  3. search_material    — semantic search ke ChromaDB dari materi yang diupload
  4. get_quiz_questions — ambil soal-soal dari quiz tertentu
  5. get_quiz_results   — ambil hasil/skor quiz sessions user
  6. web_search         — cari informasi dari internet (jika tidak ada di materi)
"""

import json
from typing import Optional
from sqlalchemy.orm import Session

from app.utils.oa_client import oa_client
from app.utils.sanitize import sanitize_prompt_field
from app.utils.langfuse_client import langfuse
from app.core.config import settings
from app.models.quiz import Quiz
from app.models.project import Project
from app.models.material import Material
from app.models.question import Question

# ── Tool definitions ──────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_context",
            "description": (
                "Ambil data pengguna: project, quiz terbaru, dan material terbaru. "
                "Gunakan ini untuk menjawab pertanyaan tentang data pengguna."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Filter ke project tertentu (opsional).",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_quiz",
            "description": (
                "Update properti quiz: status, difficulty_level, topic, atau custom_request. "
                "Gunakan ketika pengguna meminta perubahan pada quiz."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "quiz_id": {
                        "type": "string",
                        "description": "ID quiz yang diupdate.",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["draft", "processing", "completed", "failed"],
                    },
                    "difficulty_level": {"type": "string"},
                    "topic": {"type": "string"},
                    "custom_request": {"type": "string"},
                },
                "required": ["quiz_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_material",
            "description": (
                "Cari informasi dari konten materi menggunakan semantic search. "
                "Gunakan ini ketika pengguna bertanya tentang isi materi, "
                "minta penjelasan konsep, atau butuh konteks dari dokumen."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Pertanyaan atau topik yang dicari.",
                    },
                    "material_id": {
                        "type": "string",
                        "description": "ID material untuk filter pencarian (opsional).",
                    },
                    "n_results": {
                        "type": "integer",
                        "description": "Jumlah hasil (default 5, max 10).",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_quiz_questions",
            "description": (
                "Ambil daftar soal dari sebuah quiz beserta jawaban dan penjelasannya. "
                "Gunakan ketika pengguna bertanya tentang soal tertentu atau minta penjelasan jawaban."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "quiz_id": {
                        "type": "string",
                        "description": "ID quiz yang soalnya ingin diambil.",
                    }
                },
                "required": ["quiz_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_quiz_results",
            "description": (
                "Ambil hasil dan skor quiz sessions pengguna. "
                "Gunakan ketika pengguna bertanya tentang performa, skor, atau riwayat quiz mereka."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "quiz_id": {
                        "type": "string",
                        "description": "Filter ke quiz tertentu (opsional).",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Jumlah hasil terbaru (default 5).",
                        "default": 5,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Cari informasi dari internet. Gunakan HANYA jika pertanyaan tidak bisa dijawab "
                "dari materi yang diupload atau data pengguna. "
                "Selalu cantumkan sumber URL dalam jawaban."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query pencarian dalam bahasa Inggris untuk hasil terbaik.",
                    }
                },
                "required": ["query"],
            },
        },
    },
]


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
        "- Jika pengguna bertanya tentang data mereka → gunakan get_context\n"
        "- Jika pengguna bertanya tentang isi materi/konsep → gunakan search_material\n"
        "- Jika pengguna bertanya tentang soal quiz → gunakan get_quiz_questions\n"
        "- Jika pengguna bertanya tentang skor/hasil quiz → gunakan get_quiz_results\n"
        "- Jika pengguna minta update quiz → gunakan update_quiz\n"
        "- Jika pertanyaan tidak bisa dijawab dari materi/data → gunakan web_search, cantumkan sumber\n"
        "- Jangan gunakan tool jika tidak diperlukan"
    )
    return base


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

    # ── Tool: get_context ─────────────────────────────────────────────────────

    def _tool_get_context(self, project_id: Optional[str] = None) -> dict:
        pid = project_id or self.project_id

        projects_q = self.db.query(Project).filter(
            Project.user_id == self.user_id,
            Project.deleted_at.is_(None),
        )
        if pid:
            projects_q = projects_q.filter(Project.id == pid)
        projects = projects_q.all()

        quizzes_q = (
            self.db.query(Quiz)
            .join(Project)
            .filter(Project.user_id == self.user_id, Quiz.deleted_at.is_(None))
            .order_by(Quiz.created_at.desc())
            .limit(10)
        )
        if pid:
            quizzes_q = quizzes_q.filter(Quiz.project_id == pid)
        quizzes = quizzes_q.all()

        materials_q = (
            self.db.query(Material)
            .filter(Material.user_id == self.user_id, Material.deleted_at.is_(None))
            .order_by(Material.created_at.desc())
            .limit(10)
        )
        if pid:
            materials_q = materials_q.filter(Material.project_id == pid)
        materials = materials_q.all()

        return {
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

    # ── Tool: update_quiz ─────────────────────────────────────────────────────

    def _tool_update_quiz(
        self,
        quiz_id: str,
        status: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        topic: Optional[str] = None,
        custom_request: Optional[str] = None,
    ) -> dict:
        quiz = (
            self.db.query(Quiz)
            .join(Project)
            .filter(
                Quiz.id == quiz_id,
                Project.user_id == self.user_id,
                Quiz.deleted_at.is_(None),
            )
            .first()
        )
        if not quiz:
            return {"success": False, "error": f"Quiz {quiz_id} tidak ditemukan"}

        changed = []
        if status is not None:
            quiz.status = status
            changed.append(f"status → {status}")
        if difficulty_level is not None:
            quiz.difficulty_level = difficulty_level
            changed.append(f"difficulty_level → {difficulty_level}")
        if topic is not None:
            safe_topic = sanitize_prompt_field(topic, 255)
            quiz.topic = safe_topic
            changed.append(f"topic → {safe_topic}")
        if custom_request is not None:
            safe_cr = sanitize_prompt_field(custom_request, 500)
            quiz.custom_request = safe_cr
            changed.append(f"custom_request → {safe_cr}")

        if not changed:
            return {"success": False, "error": "Tidak ada field yang diupdate"}

        self.db.commit()
        self.db.refresh(quiz)
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

    # ── Tool: search_material ─────────────────────────────────────────────────

    def _tool_search_material(
        self,
        query: str,
        material_id: Optional[str] = None,
        n_results: int = 5,
    ) -> dict:
        try:
            from app.vector_db.collections import chromadb_collections

            collection = chromadb_collections()
            n_results = min(max(1, n_results), 10)

            # Build ChromaDB where filter
            where = None
            mid = material_id or self.material_id
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

    # ── Tool: get_quiz_questions ──────────────────────────────────────────────

    def _tool_get_quiz_questions(self, quiz_id: str) -> dict:
        # Verify quiz belongs to user
        quiz = (
            self.db.query(Quiz)
            .join(Project)
            .filter(
                Quiz.id == quiz_id,
                Project.user_id == self.user_id,
                Quiz.deleted_at.is_(None),
            )
            .first()
        )
        if not quiz:
            return {"success": False, "error": f"Quiz {quiz_id} tidak ditemukan"}

        questions = (
            self.db.query(Question)
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

    # ── Tool: get_quiz_results ────────────────────────────────────────────────

    def _tool_get_quiz_results(self, quiz_id: Optional[str] = None, limit: int = 5) -> dict:
        from app.models.quiz_session import QuizSession
        limit = min(max(1, limit), 20)
        q = (
            self.db.query(QuizSession)
            .filter(
                QuizSession.user_id == self.user_id,
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
            results.append({
                "session_id": s.id,
                "quiz_id": s.quiz_id,
                "status": s.status,
                "total_questions": s.total_questions,
                "correct_answers": s.correct_answers,
                "score": s.score,
                "score_percentage": score_pct,
                "started_at": str(s.started_at) if s.started_at else None,
                "completed_at": str(s.completed_at) if s.completed_at else None,
            })

        return {
            "total_sessions": len(results),
            "sessions": results,
            "average_score": (
                round(sum(r["score_percentage"] for r in results) / len(results), 1)
                if results else 0
            ),
        }

    # ── Tool: web_search ──────────────────────────────────────────────────────

    def _tool_web_search(self, query: str) -> dict:
        """Search the web using DuckDuckGo (no API key needed)."""
        try:
            import urllib.request
            import urllib.parse

            # Use DuckDuckGo Instant Answer API (free, no key)
            encoded = urllib.parse.quote(query)
            url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"

            req = urllib.request.Request(url, headers={"User-Agent": "LuminaPrep/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())

            results = []

            # Abstract (main answer)
            if data.get("AbstractText"):
                results.append({
                    "title": data.get("Heading", ""),
                    "snippet": data["AbstractText"][:500],
                    "url": data.get("AbstractURL", ""),
                    "source": data.get("AbstractSource", ""),
                })

            # Related topics
            for topic in data.get("RelatedTopics", [])[:3]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text", "")[:100],
                        "snippet": topic.get("Text", "")[:300],
                        "url": topic.get("FirstURL", ""),
                        "source": "DuckDuckGo",
                    })

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

    # ── Tool dispatcher ───────────────────────────────────────────────────────

    def _execute_tool(self, name: str, arguments: dict) -> str:
        try:
            if name == "get_context":
                result = self._tool_get_context(project_id=arguments.get("project_id"))
            elif name == "update_quiz":
                result = self._tool_update_quiz(**arguments)
            elif name == "search_material":
                result = self._tool_search_material(
                    query=arguments.get("query", ""),
                    material_id=arguments.get("material_id"),
                    n_results=arguments.get("n_results", 5),
                )
            elif name == "get_quiz_questions":
                result = self._tool_get_quiz_questions(
                    quiz_id=arguments.get("quiz_id", "")
                )
            elif name == "get_quiz_results":
                result = self._tool_get_quiz_results(
                    quiz_id=arguments.get("quiz_id"),
                    limit=arguments.get("limit", 5),
                )
            elif name == "web_search":
                result = self._tool_web_search(query=arguments.get("query", ""))
            else:
                result = {"error": f"Unknown tool: {name}"}
        except Exception as e:
            result = {"error": str(e)}
        return json.dumps(result, ensure_ascii=False, default=str)

    # ── Main chat method ──────────────────────────────────────────────────────

    def chat(
        self,
        history: list[dict],
        user_message: str,
    ) -> tuple[str, list[dict]]:
        """
        Run one turn of the conversation.

        Args:
            history: prior messages [{"role": ..., "content": ...}]
            user_message: new user input

        Returns:
            (reply_text, tool_calls_made)
        """
        trace = None
        if settings.langfuse_enabled:
            trace = langfuse.trace(
                name="chatbot_chat",
                metadata={
                    "user_id": self.user_id,
                    "project_id": self.project_id,
                    "material_id": self.material_id,
                    "quiz_id": self.quiz_id,
                },
            )

        system_prompt = _build_system_prompt(
            self.project_id, self.material_id, self.quiz_id
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        tool_calls_made = []
        max_iterations = 5  # prevent infinite loops

        for _ in range(max_iterations):
            response = oa_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.5,
            )

            msg = response.choices[0].message
            finish_reason = response.choices[0].finish_reason

            messages.append(msg.model_dump(exclude_none=True))

            if finish_reason == "tool_calls" and msg.tool_calls:
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    try:
                        fn_args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        fn_args = {}

                    tool_result = self._execute_tool(fn_name, fn_args)
                    tool_calls_made.append({"tool": fn_name, "args": fn_args})

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": tool_result,
                        }
                    )
                continue  # let model respond after seeing tool results

            # Done — return final reply
            return msg.content or "", tool_calls_made

        # Fallback if max iterations hit
        return "Maaf, terjadi kesalahan dalam memproses permintaan.", tool_calls_made
