"""Backend MVP happy path coverage for QA gate.

This keeps the expensive AI generation mocked, but exercises the real API
contract from signin through quiz completion.
"""


def test_mvp_learning_flow_from_auth_to_quiz_result(
    client,
    auth_headers,
    material,
    db,
    monkeypatch,
):
    from app.api.v1 import quiz as quiz_router
    from app.crud.question import create_question
    from app.crud.quiz import update_quiz_status

    monkeypatch.setattr(quiz_router, "_run_quiz_generation", lambda *args, **kwargs: None)

    quiz_resp = client.post(
        f"/api/v1/quizzes/materials/{material['id']}/quizzes",
        json={"difficulty_level": "medium", "question_count": 1},
        headers=auth_headers,
    )
    assert quiz_resp.status_code == 202, quiz_resp.text
    assert quiz_resp.json()["status"] == "processing"
    quiz_id = quiz_resp.json()["task_id"]

    # Simulate completed background generation without calling a real LLM.
    create_question(
        db=db,
        quiz_id=quiz_id,
        question_text="What does QA validate?",
        options={
            "A": "Visual themes only",
            "B": "System behavior against expectations",
            "C": "Database passwords",
            "D": "Deployment costs only",
        },
        correct_answer="System behavior against expectations",
        explanation="QA validates whether the system behaves as expected.",
        question_metadata={"difficulty": "medium"},
    )
    update_quiz_status(db, quiz_id, "completed")

    status_resp = client.get(f"/api/v1/quizzes/{quiz_id}/status", headers=auth_headers)
    assert status_resp.status_code == 200, status_resp.text
    assert status_resp.json()["status"] == "completed"
    assert status_resp.json()["questions_count"] == 1

    session_resp = client.post(
        f"/api/v1/quizzes/{quiz_id}/sessions",
        headers=auth_headers,
    )
    assert session_resp.status_code == 200, session_resp.text
    session_id = session_resp.json()["id"]
    assert session_resp.json()["status"] == "active"

    questions_resp = client.get(
        f"/api/v1/quiz_sessions/{session_id}/questions",
        headers=auth_headers,
    )
    assert questions_resp.status_code == 200, questions_resp.text
    question = questions_resp.json()["questions"][0]
    assert "correct_answer" not in question

    submit_resp = client.post(
        f"/api/v1/quiz_sessions/{session_id}/submit_answer",
        json={
            "question_id": question["id"],
            "user_answer": "System behavior against expectations",
        },
        headers=auth_headers,
    )
    assert submit_resp.status_code == 200, submit_resp.text
    assert submit_resp.json()["attempt"]["is_correct"] is True

    complete_resp = client.post(
        f"/api/v1/quiz_sessions/{session_id}/complete",
        headers=auth_headers,
    )
    assert complete_resp.status_code == 200, complete_resp.text
    assert complete_resp.json()["status"] == "completed"
    assert complete_resp.json()["score"] == 1.0

    details_resp = client.get(
        f"/api/v1/quiz_sessions/sessions/{session_id}",
        headers=auth_headers,
    )
    assert details_resp.status_code == 200, details_resp.text
    details = details_resp.json()
    assert details["correct_answers"] == 1
    assert details["breakdown"][0]["is_correct"] is True
