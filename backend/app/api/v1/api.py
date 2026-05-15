from fastapi import APIRouter
from app.api.v1 import (
    auth,
    projects,
    materials,
    quiz,
    quiz_sessions,
    stream,
    agent,
    public_quiz,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(quiz.router, prefix="/quizzes", tags=["quizzes"])
api_router.include_router(
    quiz_sessions.router, prefix="/quiz_sessions", tags=["quiz_sessions"]
)
api_router.include_router(
    public_quiz.router, prefix="/public_quizzes", tags=["public_quizzes"]
)
api_router.include_router(stream.router, prefix="/stream", tags=["stream"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
