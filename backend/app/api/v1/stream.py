from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator
import asyncio
import json
from app.database import get_db
from app.crud.quiz_session import get_quiz_session_by_id
from app.crud.material import get_material_by_id
from app.crud.question import get_question_by_id
from app.crud.user_attempt import get_user_attempts_by_session
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


async def mock_feedback_generator(session_id: str, question_id: str) -> AsyncGenerator[str, None]:
    """Mock feedback generator for testing without AI tokens."""
    feedback_messages = [
        "Analyzing your answer...",
        "Checking against the correct solution...",
        "Generating personalized feedback...",
        "Creating detailed explanation...",
    ]
    
    for i, message in enumerate(feedback_messages):
        yield f"data: {json.dumps({'type': 'progress', 'message': message, 'step': i+1, 'total': len(feedback_messages)})}\n\n"
        await asyncio.sleep(0.5)  # Simulate processing time
    
    # Mock final feedback
    final_feedback = {
        'type': 'feedback',
        'feedback': f"Your answer for question {question_id} in session {session_id} has been analyzed. This is mock feedback for testing purposes.",
        'suggestions': [
            "Review the material again",
            "Focus on key concepts",
            "Practice similar questions"
        ],
        'score': 85,
        'completed': True
    }
    
    yield f"data: {json.dumps(final_feedback)}\n\n"
    yield "data: [DONE]\n\n"


async def mock_summary_generator(material_id: str) -> AsyncGenerator[str, None]:
    """Mock summary generator for testing without AI tokens."""
    summary_steps = [
        "Extracting key concepts from material...",
        "Analyzing content structure...",
        "Generating comprehensive summary...",
        "Creating learning objectives...",
    ]
    
    for i, message in enumerate(summary_steps):
        yield f"data: {json.dumps({'type': 'progress', 'message': message, 'step': i+1, 'total': len(summary_steps)})}\n\n"
        await asyncio.sleep(0.6)  # Simulate processing time
    
    # Mock final summary
    final_summary = {
        'type': 'summary',
        'summary': f"This is a comprehensive summary of material {material_id}. Key concepts include machine learning fundamentals, data preprocessing, model training, and evaluation metrics.",
        'key_points': [
            "Machine learning basics",
            "Data preprocessing techniques",
            "Model training process",
            "Evaluation and validation"
        ],
        'difficulty': 'intermediate',
        'estimated_time': '45 minutes',
        'completed': True
    }
    
    yield f"data: {json.dumps(final_summary)}\n\n"
    yield "data: [DONE]\n\n"


@router.get("/feedback/{session_id}/{question_id}")
async def stream_feedback(
    session_id: str,
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Stream feedback for a specific question in a quiz session."""
    # Verify session exists and belongs to user
    quiz_session = get_quiz_session_by_id(db, session_id, current_user.id)
    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found"
        )
    
    # Verify question exists and belongs to the quiz
    # Allow mock question IDs for testing
    if question_id != "mock_question_id":
        question = get_question_by_id(db, question_id, current_user.id)
        if not question or question.quiz_id != quiz_session.quiz_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
    
    # Return SSE stream
    return StreamingResponse(
        mock_feedback_generator(session_id, question_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


@router.get("/summary/{material_id}")
async def stream_summary(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Stream summary for a specific material."""
    # Verify material exists and belongs to user
    material = get_material_by_id(db, material_id, current_user.id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Return SSE stream
    return StreamingResponse(
        mock_summary_generator(material_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
