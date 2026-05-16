import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.public_quiz import (
    create_public_quiz,
    delete_public_quiz,
    get_public_quizzes,
    get_public_quiz,
)
from app.crud.quiz_session import create_quiz_session
from app.schemas.public_quiz import (
    PublicQuizCreate,
    PublicQuizRead,
    PublicQuizListItem,
    PublicQuizDetail,
)
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.quiz_session import QuizSessionRead

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=PublicQuizRead, status_code=status.HTTP_201_CREATED)
def make_quiz_public(
    quiz_data: PublicQuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Make a quiz public. User must own the quiz."""
    public_quiz = create_public_quiz(
        db=db,
        quiz_id=quiz_data.quiz_id,
        user_id=current_user.id,
    )
    if not public_quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to make quiz public. Quiz not found or already public.",
        )
    return public_quiz


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def make_quiz_private(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Make a quiz private. User must own the quiz."""
    success = delete_public_quiz(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to make quiz private. Quiz not found or not public.",
        )
    return None


@router.get("", response_model=list[PublicQuizListItem])
def list_public_quizzes(
    db: Session = Depends(get_db),
):
    """List all public quizzes."""
    try:
        results = get_public_quizzes(db)
        quizzes = []
        for public_quiz, quiz in results:
            # Get material file name for display if topic is null
            material_file_name = None
            if quiz.material_id:
                from app.models.material import Material
                material = db.query(Material).filter(
                    Material.id == quiz.material_id,
                    Material.deleted_at.is_(None),
                ).first()
                if material:
                    # Strip extension for cleaner display
                    import os
                    material_file_name = os.path.splitext(material.file_name)[0]

            quizzes.append(
                PublicQuizListItem(
                    quiz_id=quiz.id,
                    topic=quiz.topic,
                    material_file_name=material_file_name,
                    difficulty_level=quiz.difficulty_level,
                    question_count=quiz.question_count,
                    created_at=public_quiz.created_at,
                )
            )
        return quizzes
    except Exception as e:
        logger.exception("Error listing public quizzes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list public quizzes",
        )


@router.get("/{quiz_id}", response_model=PublicQuizDetail)
def get_public_quiz_detail(
    quiz_id: str,
    db: Session = Depends(get_db),
):
    """Get a single public quiz detail."""
    try:
        result = get_public_quiz(db, quiz_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public quiz not found",
            )
        public_quiz, quiz = result
        return PublicQuizDetail(
            quiz_id=quiz.id,
            topic=quiz.topic,
            difficulty_level=quiz.difficulty_level,
            question_count=quiz.question_count,
            custom_request=quiz.custom_request,
            created_at=public_quiz.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error getting public quiz: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get public quiz",
        )


@router.post("/{quiz_id}/sessions", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
def start_public_quiz_session(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Start a quiz session for a public quiz. User must be logged in."""
    try:
        # Verify the quiz is public
        result = get_public_quiz(db, quiz_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public quiz not found",
            )

        # Create session (no ownership check, just existence check)
        quiz_session = create_quiz_session(db, current_user.id, quiz_id)
        if not quiz_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create quiz session",
            )

        # Add user_quiz association for the taker (so quiz appears in their My Quiz)
        from app.crud.user_quiz import add_user_quiz
        add_user_quiz(db=db, user_id=current_user.id, quiz_id=quiz_id, is_owner=False)

        return quiz_session
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error starting public quiz session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start quiz session",
        )
