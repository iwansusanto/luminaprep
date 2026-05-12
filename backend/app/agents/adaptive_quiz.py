from typing import Literal
from app.agents.mcq_quiz import MCQQuestion, MCQQuizAgent
from app.vector_db.collections import chromadb_collections
from app.agents.exceptions import QuizGenerationError, VectorDBError


DIFFICULTY_QUERIES = {
    "easy": "basic concepts fundamentals introduction",
    "medium": "core concepts key points important details",
    "hard": "advanced concepts complex analysis detailed explanation",
}


class AdaptiveQuizAgent:
    def __init__(self):
        self.collection = chromadb_collections()
        self.mcq_quiz_agent = MCQQuizAgent()

    def _get_difficulty_query(
        self, difficulty: Literal["easy", "medium", "hard"], material_id: str
    ) -> str:
        base_terms = DIFFICULTY_QUERIES.get(difficulty, DIFFICULTY_QUERIES["medium"])
        return f"{base_terms} {material_id}"

    def get_difficulty_context(
        self,
        material_id: str,
        difficulty: Literal["easy", "medium", "hard"],
        n_results: int = 10,
    ) -> str:
        try:
            query_text = self._get_difficulty_query(difficulty, material_id)
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where={"material_id": material_id},
            )
            if results and results.get("documents") and results["documents"][0]:
                return "\n\n".join(results["documents"][0])
            return ""
        except Exception as e:
            raise VectorDBError(f"Failed to retrieve context: {str(e)}")

    async def generate_adaptive_quiz(
        self,
        material_id: str,
        difficulty: Literal["easy", "medium", "hard"],
        num_questions: int,
    ) -> list[MCQQuestion]:
        try:
            context_query = self._get_difficulty_query(difficulty, material_id)
            results = self.collection.query(
                query_texts=[context_query],
                n_results=10,
                where={"material_id": material_id},
            )

            if (
                not results
                or not results.get("documents")
                or not results["documents"][0]
            ):
                raise QuizGenerationError(
                    f"No content found for material {material_id}"
                )

            summary_for_quiz = "\n\n".join(results["documents"][0])

            questions = self.mcq_quiz_agent.generate_quiz(
                num_questions=num_questions,
                summary=summary_for_quiz,
                difficulty=difficulty,
            )

            return questions

        except QuizGenerationError:
            raise
        except Exception as e:
            raise QuizGenerationError(f"Failed to generate adaptive quiz: {str(e)}")
