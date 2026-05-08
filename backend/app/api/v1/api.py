from fastapi import APIRouter
from app.api.v1 import auth, projects, materials, quiz

api_router = APIRouter()

# Include Hari 1-5 routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(quiz.router, prefix="/quizzes", tags=["quizzes"])
