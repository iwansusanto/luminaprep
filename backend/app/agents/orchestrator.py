from typing import Literal
from sqlalchemy.orm import Session

from app.agents.ingestions import IngestionAgent
from app.agents.summarization import SummarizationAgent
from app.agents.adaptive_quiz import AdaptiveQuizAgent
from app.agents.feedback_agent import FeedbackAgent
from app.agents.exceptions import (
    AgentError,
    QuizGenerationError,
    FeedbackGenerationError,
)

from app.crud.quiz import create_quiz
from app.crud.question import create_question
from app.crud.material import get_material_by_id
from app.models.quiz import Quiz


class AgentOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.ingestion_agent = IngestionAgent(db)
        self.summarization_agent = SummarizationAgent()
        self.adaptive_quiz_agent = AdaptiveQuizAgent()
        self.feedback_agent = FeedbackAgent()

    async def process_material(
        self,
        material_id: str,
        file_path: str,
        file_type: Literal["pdf", "txt"],
    ) -> dict:
        try:
            result = await self.ingestion_agent.ingest(
                material_id, file_path, file_type
            )
            return {
                "status": "success",
                "operation": "process_material",
                "result": result,
            }
        except Exception as e:
            raise AgentError(f"Failed to process material: {str(e)}")

    async def generate_material_summary(self, material_id: str, user_id: str) -> str:
        try:
            material = get_material_by_id(self.db, material_id, user_id)
            if not material:
                raise AgentError(f"Material {material_id} not found")

            text_query = f"summarize content for {material_id}"
            collection = self.adaptive_quiz_agent.collection
            results = collection.query(
                query_texts=[text_query],
                n_results=5,
                where={"material_id": material_id},
            )

            if (
                not results
                or not results.get("documents")
                or not results["documents"][0]
            ):
                raise AgentError(f"No content found for material {material_id}")

            combined_text = "\n\n".join(results["documents"][0])
            summary = await self.summarization_agent.generate(combined_text)

            return summary or ""

        except AgentError:
            raise
        except Exception as e:
            raise AgentError(f"Failed to generate summary: {str(e)}")

    async def generate_material_quiz(
        self,
        material_id: str,
        project_id: str,
        difficulty: Literal["easy", "medium", "hard"],
        num_questions: int,
        user_id: str,
    ) -> Quiz:
        try:
            material = get_material_by_id(self.db, material_id, user_id)
            if not material:
                raise AgentError(f"Material {material_id} not found")

            questions = await self.adaptive_quiz_agent.generate_adaptive_quiz(
                material_id=material_id,
                difficulty=difficulty,
                num_questions=num_questions,
            )

            if not questions:
                raise QuizGenerationError("No questions generated")

            quiz = create_quiz(
                self.db,
                project_id=project_id,
                difficulty_level=difficulty,
                question_count=len(questions),
                user_id=user_id,
            )

            if not quiz:
                raise QuizGenerationError("Failed to create quiz")

            for mcq_question in questions:
                create_question(
                    self.db,
                    quiz_id=quiz.id,
                    question_text=mcq_question.question,
                    options=mcq_question.options,
                    correct_answer=mcq_question.correct_answer,
                    explanation=mcq_question.explanation,
                    question_metadata={"difficulty": difficulty},
                )

            self.db.commit()
            return quiz

        except QuizGenerationError:
            raise
        except Exception as e:
            self.db.rollback()
            raise QuizGenerationError(f"Failed to generate quiz: {str(e)}")

    async def generate_feedback(
        self,
        question_id: str,
        quiz_id: str,
        selected_answer: str,
        is_correct: bool,
        user_id: str,
    ) -> str:
        try:
            from app.crud.question import get_question_by_id
            from app.crud.quiz import get_quiz_by_id

            quiz = get_quiz_by_id(self.db, quiz_id, user_id)
            if not quiz:
                raise FeedbackGenerationError(f"Quiz {quiz_id} not found")

            question = get_question_by_id(self.db, question_id, user_id)

            if not question:
                raise FeedbackGenerationError(f"Question {question_id} not found")

            feedback = self.feedback_agent.generate_feedback(
                question=question,
                quiz_id=quiz_id,
                selected_answer=selected_answer,
                is_correct=is_correct,
            )

            return feedback

        except FeedbackGenerationError:
            raise
        except Exception as e:
            raise FeedbackGenerationError(f"Failed to generate feedback: {str(e)}")
