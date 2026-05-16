import os
import sys
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel

ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT_DIR)

# Default test environment variables
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("OPENAI_BASE_URL", "https://example.invalid/v1")
os.environ.setdefault("LANGFUSE_ENABLED", "false")
os.environ.setdefault("UPLOAD_DIR", "/tmp/luminaprep-test-uploads")

from unittest.mock import MagicMock, patch

# Patch external dependencies before importing app modules
patch("app.utils.oa_client.OpenAI", MagicMock()).start()
patch("app.vector_db.client.chromadb_client", MagicMock()).start()
patch("app.vector_db.collections.chromadb_collections", MagicMock()).start()
patch("app.celery_app.Celery", MagicMock(return_value=MagicMock())).start()

_mock_celery_task = MagicMock()
_mock_celery_task.delay = MagicMock(return_value=MagicMock(id="mock-task-id"))
patch("app.tasks.quiz_tasks.generate_quiz_task", _mock_celery_task).start()

# Configure test database engine
SQLITE_URL = "sqlite://"
test_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Import app modules after patching
from app.api.deps import get_current_active_user  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import *  # noqa: F403,E402
from app.models.user import User  # noqa: E402

# Redirect app database engine references to the test engine
import app.db.database as _db1  # noqa: E402
import app.database as _db2  # noqa: E402

_db1.engine = test_engine
_db1.SessionLocal = TestingSessionLocal
_db2.engine = test_engine
_db2.SessionLocal = TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db():
    SQLModel.metadata.create_all(bind=test_engine)
    yield
    SQLModel.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db(reset_db) -> Generator[Session, None, None]:
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(db: Session) -> User:
    user = User(email="qa@example.com", full_name="QA User", hashed_password="unused")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(test_user: User) -> dict[str, str]:
    token = create_access_token({"sub": test_user.email, "user_id": test_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="client_as_user")
def client_as_user_fixture(client: TestClient, test_user: User) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_current_active_user] = lambda: test_user
    yield client
    app.dependency_overrides.pop(get_current_active_user, None)
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
    from app.crud.question import create_question
    from app.crud.quiz import create_quiz, update_quiz_status

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
