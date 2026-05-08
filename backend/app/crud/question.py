from sqlalchemy.orm import Session
from app.models.question import Question
from app.models.quiz import Quiz
from typing import List, Optional

def get_questions_by_quiz(db: Session, quiz_id: str, user_id: str) -> List[Question]:
    """Get all questions for a quiz with user verification."""
    questions = db.query(Question).join(Quiz).join(Project).filter(
        Question.quiz_id == quiz_id,
        Project.user_id == user_id
    ).all()
    return questions

def get_question_by_id(db: Session, question_id: str, user_id: str) -> Optional[Question]:
    """Get question by ID with user verification."""
    question = db.query(Question).join(Quiz).join(Project).filter(
        Question.id == question_id,
        Project.user_id == user_id
    ).first()
    return question

def create_question(db: Session, quiz_id: str, question_text: str, options: dict, correct_answer: str, explanation: Optional[str] = None, metadata: Optional[dict] = None) -> Optional[Question]:
    """Create a new question."""
    question = Question(
        quiz_id=quiz_id,
        question_text=question_text,
        options=options,
        correct_answer=correct_answer,
        explanation=explanation,
        metadata=metadata
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

def update_question(db: Session, question_id: str, user_id: str, question_text: Optional[str] = None, options: Optional[dict] = None, correct_answer: Optional[str] = None, explanation: Optional[str] = None, metadata: Optional[dict] = None) -> Optional[Question]:
    """Update a question."""
    question = get_question_by_id(db, question_id, user_id)
    if not question:
        return None
    
    if question_text is not None:
        question.question_text = question_text
    if options is not None:
        question.options = options
    if correct_answer is not None:
        question.correct_answer = correct_answer
    if explanation is not None:
        question.explanation = explanation
    if metadata is not None:
        question.metadata = metadata
    
    db.commit()
    db.refresh(question)
    return question

def delete_question(db: Session, question_id: str, user_id: str) -> Optional[Question]:
    """Delete a question."""
    question = get_question_by_id(db, question_id, user_id)
    if not question:
        return None
    
    db.delete(question)
    db.commit()
    return question
