from fastapi import APIRouter
from app.api.v1 import auth, projects, materials

api_router = APIRouter()

# Include only Hari 1-3 routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
