"""
Pytest configuration and shared fixtures.
Uses SQLite in-memory — no real MySQL/Redis/OpenAI needed.

Critical order:
1. Patch config.settings.database_url BEFORE any db module is imported
   (so create_engine never tries to connect to MySQL)
2. Patch all external deps (OpenAI, ChromaDB, Celery)
3. Import app modules
4. Redirect engine references to test_engine
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLITE_URL = "sqlite://"

# ── Build test engine FIRST ───────────────────────────────────────────────────
test_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ── Patch config BEFORE any app import so create_engine uses SQLite ───────────
# Set env var so pydantic-settings picks up SQLite URL when Settings is instantiated
import os
os.environ.setdefault("DATABASE_URL", SQLITE_URL)
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-not-production")

# ── Patch all external deps ───────────────────────────────────────────────────
patch("app.utils.oa_client.OpenAI", MagicMock()).start()
patch("app.vector_db.client.chromadb_client", MagicMock()).start()
patch("app.vector_db.collections.chromadb_collections", MagicMock()).start()
patch("app.celery_app.Celery", MagicMock(return_value=MagicMock())).start()

_mock_celery_task = MagicMock()
_mock_celery_task.delay = MagicMock(return_value=MagicMock(id="mock-task-id"))
patch("app.tasks.quiz_tasks.generate_quiz_task", _mock_celery_task).start()

# ── Now safe to import app modules ────────────────────────────────────────────
import app.db.database as _db1  # noqa: E402
import app.database as _db2     # noqa: E402

# Redirect engine references to our test engine
_db1.engine = test_engine
_db1.SessionLocal = TestingSessionLocal
_db2.engine = test_engine
_db2.SessionLocal = TestingSessionLocal

from sqlmodel import SQLModel   # noqa: E402
import app.models               # noqa: F401, E402


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    SQLModel.metadata.create_all(bind=test_engine)
    yield
    SQLModel.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db(reset_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    from app.main import app
    from app.database import get_db
    from app.db.database import get_db as get_db2
    from fastapi.testclient import TestClient

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db2] = override_get_db

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    resp = client.post(
        "/api/v1/auth/signin",
        json={"email": "test@example.com", "name": "Test User"},
    )
    assert resp.status_code == 200, f"Signin failed: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def project(client, auth_headers):
    resp = client.post(
        "/api/v1/projects/",
        json={"title": "Test Project", "description": "A test project"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Create project failed: {resp.text}"
    return resp.json()


@pytest.fixture
def material(client, auth_headers, project):
    resp = client.post(
        "/api/v1/materials",
        json={
            "project_id": project["id"],
            "file_name": "test.pdf",
            "file_type": "pdf",
            "storage_path": "uploads/test.pdf",
            "status": "completed",
            "summary": "This is a test summary about machine learning.",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Create material failed: {resp.text}"
    return resp.json()


@pytest.fixture
def quiz(client, auth_headers, db, material, project):
    from app.crud.quiz import create_quiz, update_quiz_status
    from app.crud.question import create_question

    user_id = _get_user_id(client, auth_headers)
    quiz_obj = create_quiz(
        db=db,
        project_id=project["id"],
        difficulty_level="medium",
        question_count=1,
        user_id=user_id,
    )
    update_quiz_status(db, quiz_obj.id, "completed")
    create_question(
        db=db,
        quiz_id=quiz_obj.id,
        question_text="What is 2 + 2?",
        options={"A": "3", "B": "4", "C": "5", "D": "6"},
        correct_answer="4",
        explanation="Basic arithmetic.",
    )
    return {"id": quiz_obj.id, "project_id": project["id"]}


def _get_user_id(client, auth_headers) -> str:
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200, f"Get me failed: {resp.text}"
    return resp.json()["id"]
