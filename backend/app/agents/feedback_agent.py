from app.utils.oa_client import oa_client
from app.vector_db.collections import chromadb_collections
from app.models.question import Question
from app.agents.exceptions import FeedbackGenerationError, VectorDBError


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
    ) -> str:
        try:
            material_context = self._get_material_context(
                quiz_id, question.question_text
            )

            system_prompt, user_prompt = self._build_feedback_prompt(
                question, selected_answer, is_correct, material_context
            )

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
            )

            feedback = response.choices[0].message.content
            if feedback is None:
                raise FeedbackGenerationError("Empty response from LLM")

            return feedback

        except FeedbackGenerationError:
            raise
        except VectorDBError:
            raise
        except Exception as e:
            raise FeedbackGenerationError(f"Failed to generate feedback: {str(e)}")
