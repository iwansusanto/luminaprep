from typing import Literal
from app.agents.mcq_quiz import MCQQuestion, MCQQuizAgent
from app.vector_db.collections import chromadb_collections
from app.agents.exceptions import QuizGenerationError, VectorDBError
from app.utils import langfuse_client as observability


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
        trace = observability.safe_trace(
            "generate_adaptive_quiz",
            metadata=observability.standard_metadata(
                "generate_adaptive_quiz",
                material_id=material_id,
                difficulty=difficulty,
                num_questions=num_questions,
            ),
            input={
                "material_id": material_id,
                "difficulty": difficulty,
                "num_questions": num_questions,
            },
        )
        try:
            retrieve_span = observability.span(
                trace,
                "retrieve-difficulty-context",
                input={
                    "material_id": material_id,
                    "difficulty": difficulty,
                    "n_results": 10,
                },
            )
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
                observability.end_observation(
                    retrieve_span,
                    output={"status": "empty", "material_id": material_id},
                )
                observability.update_observation(
                    trace,
                    output={
                        "status": "failed",
                        "error": f"No content found for material {material_id}",
                    },
                )
                raise QuizGenerationError(
                    f"No content found for material {material_id}"
                )

            observability.end_observation(
                retrieve_span,
                output={"status": "success", "chunk_count": len(results["documents"][0])},
            )

            summary_span = observability.span(
                trace,
                "build-adaptive-summary",
                input={
                    "difficulty": difficulty,
                    "material_id": material_id,
                    "chunk_count": len(results["documents"][0]),
                },
            )
            summary_for_quiz = "\n\n".join(results["documents"][0])
            observability.end_observation(
                summary_span,
                output={"summary_length": len(summary_for_quiz)},
            )

            generation_span = observability.span(
                trace,
                "generate-adaptive-questions",
                input={
                    "difficulty": difficulty,
                    "num_questions": num_questions,
                    "summary_preview": summary_for_quiz[:500],
                },
            )
            questions = self.mcq_quiz_agent.generate_quiz(
                num_questions=num_questions,
                summary=summary_for_quiz,
                difficulty=difficulty,
            )

            observability.end_observation(
                generation_span,
                output={"question_count": len(questions)},
            )
            observability.update_observation(
                trace,
                output={
                    "status": "success",
                    "question_count": len(questions),
                    "difficulty": difficulty,
                },
            )
            return questions

        except QuizGenerationError:
            raise
        except Exception as e:
            observability.update_observation(
                trace,
                output={"status": "error", "error": str(e)},
            )
            raise QuizGenerationError(f"Failed to generate adaptive quiz: {str(e)}")
