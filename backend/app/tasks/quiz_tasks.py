from celery import current_task
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.quiz import Quiz
from app.models.question import Question
from app.crud.quiz import update_quiz
import time
import logging
import uuid

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def generate_quiz(self, quiz_id: str):
    """
    Generate quiz questions asynchronously using AI agent.
    This task simulates the AI quiz generation workflow.
    """
    db = SessionLocal()
    try:
        # Update task status
        self.update_state(state='PROGRESS', meta={'status': 'generating'})
        
        # Get quiz from database
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise ValueError(f"Quiz {quiz_id} not found")
        
        # Update quiz status to generated
        update_quiz(db, quiz_id, status="generated")
        
        logger.info(f"Generating quiz {quiz_id} with {quiz.question_count} questions")
        
        # Simulate AI quiz generation (replace with actual AI logic)
        questions_data = []
        
        for i in range(quiz.question_count):
            # Update progress
            progress = ((i + 1) / quiz.question_count) * 100
            self.update_state(
                state='PROGRESS', 
                meta={'status': 'generating', 'progress': progress}
            )
            
            # Simulate question generation time
            time.sleep(0.5)
            
            # Generate sample question
            question_text = f"Sample question {i+1} for difficulty level {quiz.difficulty_level}"
            options = {
                "options": [
                    f"Option A for question {i+1}",
                    f"Option B for question {i+1}",
                    f"Option C for question {i+1}",
                    f"Option D for question {i+1}"
                ]
            }
            correct_answer = f"Option A for question {i+1}"
            explanation = f"This is the explanation for question {i+1}. The correct answer is {correct_answer}."
            metadata = {
                "difficulty": quiz.difficulty_level,
                "topic": f"Topic {i+1}",
                "generated_by": "AI Quiz Agent"
            }
            
            # Create question in database
            question = Question(
                quiz_id=quiz_id,
                question_text=question_text,
                options=options,
                correct_answer=correct_answer,
                explanation=explanation,
                question_metadata=metadata
            )
            
            db.add(question)
            questions_data.append({
                "id": question.id,
                "question_text": question_text,
                "options": options,
                "correct_answer": correct_answer,
                "explanation": explanation
            })
        
        # Update quiz status to completed
        update_quiz(db, quiz_id, status="completed")
        
        db.commit()
        logger.info(f"Successfully generated quiz {quiz_id} with {len(questions_data)} questions")
        
        return {
            'status': 'completed',
            'quiz_id': quiz_id,
            'questions_generated': len(questions_data),
            'questions': questions_data
        }
        
    except Exception as e:
        logger.error(f"Error generating quiz {quiz_id}: {str(e)}")
        
        # Update quiz status to failed
        try:
            update_quiz(db, quiz_id, status="failed")
        except:
            pass
        
        # Raise exception to mark task as failed
        raise self.retry(exc=e, countdown=60, max_retries=3)
        
    finally:
        db.close()
