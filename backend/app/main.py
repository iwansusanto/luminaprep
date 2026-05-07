from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import engine, Base
from app.models import User, Project
from scalar_fastapi import get_scalar_api_reference
from app.api.v1.api import api_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered learning platform backend API",
    docs_url=None,
    redoc_url=None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint to check API health."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected" if engine else "disconnected"
    }


# Import API router
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

# Scalar API Documentation
scalar_docs = get_scalar_api_reference(
    openapi_url=app.openapi_url,
    title=app.title + " - API Documentation"
)

app.add_route("/scalar", scalar_docs, include_in_schema=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
