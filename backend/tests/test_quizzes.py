"""Tests for /api/v1/quizzes endpoints."""
from app.crud.quiz import create_quiz, update_quiz_status
from app.crud.question import create_question
from tests.conftest import _get_user_id


def _make_quiz(client, auth_headers, db, project):
    """Helper: create a quiz with one question via CRUD."""
    user_id = _get_user_id(client, auth_headers)
    quiz_obj = create_quiz(
        db=db,
        project_id=project["id"],
        difficulty_level="easy",
        question_count=1,
        user_id=user_id,
    )
    update_quiz_status(db, quiz_obj.id, "completed")
    create_question(
        db=db,
        quiz_id=quiz_obj.id,
        question_text="What is 1 + 1?",
        options={"A": "1", "B": "2", "C": "3", "D": "4"},
        correct_answer="2",
        explanation="Basic math.",
    )
    return quiz_obj


def test_get_quiz(client, auth_headers, db, project):
    quiz_obj = _make_quiz(client, auth_headers, db, project)
    resp = client.get(f"/api/v1/quizzes/{quiz_obj.id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == quiz_obj.id
    assert data["status"] == "completed"


def test_get_quiz_not_found(client, auth_headers):
    resp = client.get("/api/v1/quizzes/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_get_quiz_status(client, auth_headers, db, project):
    quiz_obj = _make_quiz(client, auth_headers, db, project)
    resp = client.get(f"/api/v1/quizzes/{quiz_obj.id}/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["quiz_id"] == quiz_obj.id
    assert data["questions_count"] == 1


def test_get_project_quizzes(client, auth_headers, db, project):
    _make_quiz(client, auth_headers, db, project)
    resp = client.get(
        f"/api/v1/quizzes/projects/{project['id']}/quizzes", headers=auth_headers
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_project_quizzes_project_not_found(client, auth_headers):
    resp = client.get(
        "/api/v1/quizzes/projects/nonexistent/quizzes", headers=auth_headers
    )
    assert resp.status_code == 404


def test_start_quiz_session(client, auth_headers, db, project):
    quiz_obj = _make_quiz(client, auth_headers, db, project)
    resp = client.post(
        f"/api/v1/quizzes/{quiz_obj.id}/sessions", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["quiz_id"] == quiz_obj.id
    assert data["status"] == "active"


def test_start_quiz_session_quiz_not_found(client, auth_headers):
    resp = client.post("/api/v1/quizzes/nonexistent/sessions", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_quiz(client, auth_headers, db, project):
    quiz_obj = _make_quiz(client, auth_headers, db, project)
    resp = client.delete(f"/api/v1/quizzes/{quiz_obj.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "deleted" in resp.json()["message"].lower()


def test_delete_quiz_not_found(client, auth_headers):
    resp = client.delete("/api/v1/quizzes/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_create_quiz_from_material_via_quizzes_router(
    client, auth_headers, material
):
    """POST /api/v1/quizzes/materials/{material_id}/quizzes triggers celery task."""
    resp = client.post(
        f"/api/v1/quizzes/materials/{material['id']}/quizzes",
        json={"difficulty_level": "hard", "question_count": 3},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert "task_id" in data
