from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
