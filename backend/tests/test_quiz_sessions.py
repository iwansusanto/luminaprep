"""Tests for /api/v1/quiz_sessions endpoints."""
from tests.conftest import _get_user_id


def _start_session(client, auth_headers, quiz):
    resp = client.post(
        f"/api/v1/quiz_sessions/{quiz['id']}/sessions", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_start_quiz_session(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    assert session["quiz_id"] == quiz["id"]
    assert session["status"] == "active"


def test_start_quiz_session_quiz_not_found(client, auth_headers):
    resp = client.post(
        "/api/v1/quiz_sessions/nonexistent/sessions", headers=auth_headers
    )
    assert resp.status_code == 404


def test_get_all_sessions(client, auth_headers, quiz):
    _start_session(client, auth_headers, quiz)
    resp = client.get("/api/v1/quiz_sessions/sessions", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_session_details(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    resp = client.get(
        f"/api/v1/quiz_sessions/sessions/{session['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session["id"]


def test_get_session_not_found(client, auth_headers):
    resp = client.get(
        "/api/v1/quiz_sessions/sessions/nonexistent", headers=auth_headers
    )
    assert resp.status_code == 404


def test_get_session_questions(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    resp = client.get(
        f"/api/v1/quiz_sessions/{session['id']}/questions", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session["id"]
    assert data["total_questions"] == 1
    assert len(data["questions"]) == 1
    # Correct answer must NOT be exposed
    q = data["questions"][0]
    assert "correct_answer" not in q


def test_get_session_questions_not_active(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    # Complete the session first
    client.post(
        f"/api/v1/quiz_sessions/{session['id']}/complete", headers=auth_headers
    )
    resp = client.get(
        f"/api/v1/quiz_sessions/{session['id']}/questions", headers=auth_headers
    )
    assert resp.status_code == 400


def test_submit_answer_correct(client, auth_headers, quiz, db):
    session = _start_session(client, auth_headers, quiz)
    # Get the question id
    questions_resp = client.get(
        f"/api/v1/quiz_sessions/{session['id']}/questions", headers=auth_headers
    )
    question_id = questions_resp.json()["questions"][0]["id"]

    resp = client.post(
        f"/api/v1/quiz_sessions/{session['id']}/submit_answer",
        json={"question_id": question_id, "user_answer": "4"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["attempt"]["is_correct"] is True
    assert data["attempt"]["score_earned"] == 1.0


def test_submit_answer_wrong(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    questions_resp = client.get(
        f"/api/v1/quiz_sessions/{session['id']}/questions", headers=auth_headers
    )
    question_id = questions_resp.json()["questions"][0]["id"]

    resp = client.post(
        f"/api/v1/quiz_sessions/{session['id']}/submit_answer",
        json={"question_id": question_id, "user_answer": "99"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["attempt"]["is_correct"] is False
    assert data["attempt"]["score_earned"] == 0.0


def test_submit_answer_missing_fields(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    resp = client.post(
        f"/api/v1/quiz_sessions/{session['id']}/submit_answer",
        json={"question_id": "some-id"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_complete_session(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    resp = client.post(
        f"/api/v1/quiz_sessions/{session['id']}/complete", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_complete_session_not_found(client, auth_headers):
    resp = client.post(
        "/api/v1/quiz_sessions/nonexistent/complete", headers=auth_headers
    )
    assert resp.status_code == 404
