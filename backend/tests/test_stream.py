"""Tests for /api/v1/stream SSE endpoints."""
from tests.conftest import _get_user_id


def _start_session(client, auth_headers, quiz):
    resp = client.post(
        f"/api/v1/quizzes/{quiz['id']}/sessions", headers=auth_headers
    )
    assert resp.status_code == 200
    return resp.json()


def test_stream_summary(client, auth_headers, material):
    resp = client.get(
        f"/api/v1/stream/summary/{material['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    # Verify SSE data is present
    assert b"data:" in resp.content


def test_stream_summary_not_found(client, auth_headers):
    resp = client.get("/api/v1/stream/summary/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_stream_feedback(client, auth_headers, quiz):
    session = _start_session(client, auth_headers, quiz)
    questions_resp = client.get(
        f"/api/v1/quiz_sessions/{session['id']}/questions",
        headers=auth_headers,
    )
    question_id = questions_resp.json()["questions"][0]["id"]

    resp = client.get(
        f"/api/v1/stream/feedback/{session['id']}/{question_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    assert b"data:" in resp.content


def test_stream_feedback_session_not_found(client, auth_headers):
    resp = client.get(
        "/api/v1/stream/feedback/nonexistent/mock_question_id",
        headers=auth_headers,
    )
    assert resp.status_code == 404
