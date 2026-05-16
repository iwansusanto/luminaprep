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
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("OPENAI_BASE_URL", "https://example.invalid/v1")
os.environ.setdefault("LANGFUSE_ENABLED", "false")
os.environ.setdefault("UPLOAD_DIR", "/tmp/luminaprep-test-uploads")

from unittest.mock import MagicMock, patch

patch("app.utils.oa_client.OpenAI", MagicMock()).start()
patch("app.vector_db.client.chromadb_client", MagicMock()).start()
patch("app.vector_db.collections.chromadb_collections", MagicMock()).start()
patch("app.celery_app.Celery", MagicMock(return_value=MagicMock())).start()

_mock_celery_task = MagicMock()
_mock_celery_task.delay = MagicMock(return_value=MagicMock(id="mock-task-id"))
patch("app.tasks.quiz_tasks.generate_quiz_task", _mock_celery_task).start()

SQLITE_URL = "sqlite://"
test_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)

from app.api.deps import get_current_active_user  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import *  # noqa: F403,E402
from app.models.user import User  # noqa: E402

import app.database as database_module  # noqa: E402
import app.db.database as db_module  # noqa: E402

database_module.engine = test_engine
database_module.SessionLocal = TestingSessionLocal
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal


@pytest.fixture(autouse=True)
def reset_db() -> Generator[None, None, None]:
    SQLModel.metadata.create_all(bind=test_engine)
    yield
    SQLModel.metadata.drop_all(bind=test_engine)


@pytest.fixture(name="db")
def db_fixture(reset_db) -> Generator[Session, None, None]:
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[db_module.get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(db: Session) -> User:
    user = User(
        email="qa@example.com",
        full_name="QA User",
        hashed_password="unused",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="client_as_user")
def client_as_user_fixture(
    client: TestClient,
    test_user: User,
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_current_active_user] = lambda: test_user
    yield client
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.clear()


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(client: TestClient) -> dict[str, str]:
    resp = client.post(
        "/api/v1/auth/signin",
        json={"email": "test@example.com", "name": "Test User"},
    )
    assert resp.status_code == 200, f"Signin failed: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture(name="project")
def project_fixture(client: TestClient, auth_headers: dict[str, str]) -> dict:
    resp = client.post(
        "/api/v1/projects/",
        json={"title": "Test Project", "description": "A test project"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Create project failed: {resp.text}"
    return resp.json()


@pytest.fixture(name="material")
def material_fixture(
    client: TestClient,
    auth_headers: dict[str, str],
    project: dict,
) -> dict:
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


@pytest.fixture(name="quiz")
def quiz_fixture(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
    project: dict,
) -> dict:
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


def _get_user_id(client: TestClient, auth_headers: dict[str, str]) -> str:
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200, f"Get me failed: {resp.text}"
    return resp.json()["id"]
