from app.utils.oa_client import oa_client
from app.utils import langfuse_client as observability
from app.vector_db.collections import chromadb_collections
from app.models.question import Question
from app.agents.exceptions import FeedbackGenerationError, VectorDBError


MODEL_NAME = "gpt-4o-mini"
PROMPT_VERSION = "v1"


def _usage_to_dict(response) -> dict | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None
    if hasattr(usage, "model_dump"):
        return usage.model_dump()
    if isinstance(usage, dict):
        return usage
    return {
        key: getattr(usage, key)
        for key in ("prompt_tokens", "completion_tokens", "total_tokens")
        if hasattr(usage, key)
    }


def _preview(text: str, limit: int = 500) -> str:
    return " ".join(text.split())[:limit]


class FeedbackAgent:
    def __init__(self):
        self.client = oa_client
        self.collection = chromadb_collections()

    def _get_material_context(
        self, quiz_id: str, question_text: str, n_results: int = 3
    ) -> str:
        try:
            results = self.collection.query(
                query_texts=[question_text],
                n_results=n_results,
                where={"quiz_id": quiz_id},
            )
            if results and results.get("documents") and results["documents"][0]:
                return "\n\n".join(results["documents"][0])

            results = self.collection.query(
                query_texts=[question_text],
                n_results=n_results,
            )
            if results and results.get("documents") and results["documents"][0]:
                return "\n\n".join(results["documents"][0])

            return ""
        except Exception as e:
            raise VectorDBError(f"Failed to retrieve context: {str(e)}")

    def _build_feedback_prompt(
        self,
        question: Question,
        selected_answer: str,
        is_correct: bool,
        material_context: str,
    ) -> tuple[str, str]:
        correctness = "BENAR" if is_correct else "SALAH"

        system_prompt = """Anda adalah tutor AI yang ahli. Berikan umpan balik yang konstruktif dan mendetail untuk jawaban kuis."""

        user_prompt = f"""Berikut adalah pertanyaan dan jawaban siswa:

Pertanyaan: {question.question_text}
Jawaban Siswa: {selected_answer}
Jawaban Benar: {question.correct_answer}
Status: {correctness}

Penjelasan dari materi: {question.explanation or "Tidak ada"}

Konteks Materi:
{material_context if material_context else "Tidak ada konteks tambahan"}

Berikan umpan balik yang mencakup:
1. Konfirmasi kebenaran jawaban
2. Penjelasan mendetail mengapa jawaban benar/salah
3. Insights tambahan dari materi
4. Konsep-konsep terkait yang perlu dipelajari

Format respons dalam paragraf yang terstruktur dan mudah dipahami.
"""

        return system_prompt, user_prompt

    def generate_feedback(
        self,
        question: Question,
        quiz_id: str,
        selected_answer: str,
        is_correct: bool,
        user_id: str | None = None,
        session_id: str | None = None,
    ) -> str:
        trace = observability.safe_trace(
            "feedback-generation",
            metadata=observability.standard_metadata(
                "feedback-generation",
                user_id=user_id,
                quiz_id=quiz_id,
                session_id=session_id,
                question_id=question.id,
                is_correct=is_correct,
            ),
            input={
                "quiz_id": quiz_id,
                "session_id": session_id,
                "question_id": question.id,
                "is_correct": is_correct,
            },
        )
        try:
            retrieval_span = observability.span(
                trace,
                "retrieve-feedback-context",
                metadata={"question_id": question.id, "quiz_id": quiz_id},
            )
            material_context = self._get_material_context(
                quiz_id, question.question_text
            )
            observability.end_observation(
                retrieval_span,
                output={
                    "context_length": len(material_context),
                    "has_context": bool(material_context),
                },
            )

            system_prompt, user_prompt = self._build_feedback_prompt(
                question, selected_answer, is_correct, material_context
            )

            generation = observability.generation(
                trace,
                name="feedback-generation",
                model=MODEL_NAME,
                input_data={
                    "operation": "feedback-generation",
                    "prompt_version": PROMPT_VERSION,
                    "question_id": question.id,
                    "quiz_id": quiz_id,
                    "is_correct": is_correct,
                    "prompt_preview": _preview(user_prompt),
                },
            )
            response = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
            )

            feedback = response.choices[0].message.content
            if feedback is None:
                observability.end_observation(
                    generation,
                    output={"status": "failed", "reason": "empty response"},
                )
                raise FeedbackGenerationError("Empty response from LLM")

            observability.end_observation(
                generation,
                output={
                    "status": "success",
                    "feedback_length": len(feedback),
                    "usage": _usage_to_dict(response),
                },
            )
            observability.update_observation(
                trace,
                output={"status": "success", "feedback_length": len(feedback)},
            )
            return feedback

        except FeedbackGenerationError as exc:
            observability.update_observation(
                trace,
                output={"status": "failed", "error": str(exc)},
            )
            raise
        except VectorDBError as exc:
            observability.update_observation(
                trace,
                output={"status": "failed", "error": str(exc)},
            )
            raise
        except Exception as e:
            observability.update_observation(
                trace,
                output={"status": "failed", "error": str(e)},
            )
            raise FeedbackGenerationError(f"Failed to generate feedback: {str(e)}")
