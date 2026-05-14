import logging
from contextlib import asynccontextmanager
import sys
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from app.core.config import settings
import app.db.database as _db
from app.models import (  # noqa: F401 – register all SQLModel tables
    User, Project, Material, Quiz, Question,
    QuizSession, UserAttempt, AgentMetric,
    ChatSession, ChatMessage,
)
from scalar_fastapi import get_scalar_api_reference


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    SQLModel.metadata.create_all(bind=_db.engine)
    yield
    # Shutdown: nothing needed

# Configure root logger to output to stdout (same stream uvicorn uses)
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s [%(name)s] %(message)s",
    stream=sys.stdout,
)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered learning platform backend API",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/scalar", include_in_schema=False)
def get_scalar():
    return get_scalar_api_reference(openapi_url="/api/openapi.json", title=app.title)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check — actually pings the DB."""
    try:
        with _db.engine.connect() as conn:
            conn.execute(_db.text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "healthy", "database": db_status}


# Import routers
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
