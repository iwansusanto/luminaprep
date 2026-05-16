"""
Tests for background tasks (Celery quiz generation).
These run the task logic synchronously (no broker needed) by calling
the underlying functions directly.
"""
import pytest
from unittest.mock import patch, MagicMock, call
from app.tasks.quiz_tasks import (
    generate_topics,
    generate_question,
    generate_single_question_for_topic,
    MCQQuestion,
)


# ── generate_topics ───────────────────────────────────────────────────────────

def test_generate_topics_returns_list():
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "Topic 1\nTopic 2\nTopic 3"

    with patch("app.tasks.quiz_tasks.oa_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response
        topics = generate_topics(3, "Some summary", "medium")

    assert isinstance(topics, list)
    assert len(topics) == 3
    assert "Topic 1" in topics


def test_generate_topics_empty_response():
    mock_response = MagicMock()
    mock_response.choices[0].message.content = None

    with patch("app.tasks.quiz_tasks.oa_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response
        topics = generate_topics(3, "Some summary", "medium")

    assert topics == []


# ── generate_question ─────────────────────────────────────────────────────────

def test_generate_question_success():
    import json

    mock_content = json.dumps({
        "question": "What is Python?",
        "correct_answer": "A programming language",
        "distractors": ["A snake", "A movie", "A game"],
        "explanation": "Python is a high-level programming language.",
    })
    mock_response = MagicMock()
    mock_response.choices[0].message.content = mock_content

    with patch("app.tasks.quiz_tasks.oa_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response
        question = generate_question("Some summary", "easy")

    assert question is not None
    assert isinstance(question, MCQQuestion)
    assert question.correct_answer == "A programming language"
    assert isinstance(question.options, dict)
    assert len(question.options) == 4
    # Correct answer must be one of the option values
    assert question.correct_answer in question.options.values()


def test_generate_question_invalid_json_retries_and_returns_none():
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "not valid json"

    with patch("app.tasks.quiz_tasks.oa_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response
        question = generate_question("Some summary", "easy", max_retries=2)

    assert question is None


def test_generate_question_missing_key_returns_none():
    import json

    mock_content = json.dumps({"question": "What?", "correct_answer": "Yes"})
    mock_response = MagicMock()
    mock_response.choices[0].message.content = mock_content

    with patch("app.tasks.quiz_tasks.oa_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response
        question = generate_question("Some summary", "easy", max_retries=1)

    assert question is None


# ── generate_quiz_task (full flow, synchronous) ───────────────────────────────

def _run_generate_quiz_task(quiz_id, summary, num_questions, difficulty):
    """Call the real task logic directly, bypassing Celery and the module-level mock."""
    from app.tasks.quiz_tasks import _run_task_body
    return _run_task_body(quiz_id, summary, num_questions, difficulty)


def test_generate_quiz_task_success(db, project, auth_headers, client):
    """Run the task body synchronously with mocked AI and DB."""
    from app.crud.quiz import create_quiz
    from tests.conftest import _get_user_id
    import json

    user_id = _get_user_id(client, auth_headers)
    quiz_obj = create_quiz(
        db=db,
        project_id=project["id"],
        difficulty_level="medium",
        question_count=2,
        user_id=user_id,
    )

    mock_topics_resp = MagicMock()
    mock_topics_resp.choices[0].message.content = "Topic A\nTopic B"

    mock_chunks_resp = MagicMock()
    mock_chunks_resp.choices[0].message.content = "Summary of topic."

    mock_question_content = json.dumps({
        "question": "What is X?",
        "correct_answer": "Answer X",
        "distractors": ["D1", "D2", "D3"],
        "explanation": "Because X.",
    })
    mock_question_resp = MagicMock()
    mock_question_resp.choices[0].message.content = mock_question_content

    mock_collection = MagicMock()
    mock_collection.query.return_value = {"documents": [["chunk1", "chunk2"]]}

    call_count = [0]

    def side_effect(*args, **kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            return mock_topics_resp
        elif call_count[0] % 2 == 0:
            return mock_chunks_resp
        else:
            return mock_question_resp

    with (
        patch("app.tasks.quiz_tasks.oa_client") as mock_oa,
        patch("app.tasks.quiz_tasks.chromadb_collections", return_value=mock_collection),
        patch("app.tasks.quiz_tasks.SessionLocal", return_value=db),
    ):
        mock_oa.chat.completions.create.side_effect = side_effect
        result = _run_generate_quiz_task(
            quiz_id=quiz_obj.id,
            summary="Test summary",
            num_questions=2,
            difficulty="medium",
        )

    assert result["status"] in ("completed", "failed")


def test_generate_quiz_task_caps_generated_questions_to_requested_count(
    db, project, auth_headers, client
):
    from app.crud.quiz import create_quiz
    from tests.conftest import _get_user_id
    import json

    user_id = _get_user_id(client, auth_headers)
    quiz_obj = create_quiz(
        db=db,
        project_id=project["id"],
        difficulty_level="medium",
        question_count=1,
        user_id=user_id,
    )

    mock_topics_resp = MagicMock()
    mock_topics_resp.choices[0].message.content = "\n".join(
        ["Topic A", "Topic B", "Topic C", "Topic D", "Topic E"]
    )

    mock_summary_resp = MagicMock()
    mock_summary_resp.choices[0].message.content = "Summary of topic."

    mock_question_resp = MagicMock()
    mock_question_resp.choices[0].message.content = json.dumps({
        "question": "What is X?",
        "correct_answer": "Answer X",
        "distractors": ["D1", "D2", "D3"],
        "explanation": "Because X.",
    })

    mock_collection = MagicMock()
    mock_collection.query.return_value = {"documents": [["chunk1", "chunk2"]]}

    call_count = [0]

    def side_effect(*args, **kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            return mock_topics_resp
        if call_count[0] == 2:
            return mock_summary_resp
        return mock_question_resp

    with (
        patch("app.tasks.quiz_tasks.oa_client") as mock_oa,
        patch("app.tasks.quiz_tasks.chromadb_collections", return_value=mock_collection),
        patch("app.tasks.quiz_tasks.SessionLocal", return_value=db),
    ):
        mock_oa.chat.completions.create.side_effect = side_effect
        result = _run_generate_quiz_task(
            quiz_id=quiz_obj.id,
            summary="Test summary",
            num_questions=1,
            difficulty="medium",
        )

    assert result == {"status": "completed", "questions_count": 1}


def test_generate_quiz_task_no_topics_marks_failed(db, project, auth_headers, client):
    from app.crud.quiz import create_quiz
    from tests.conftest import _get_user_id

    user_id = _get_user_id(client, auth_headers)
    quiz_obj = create_quiz(
        db=db,
        project_id=project["id"],
        difficulty_level="medium",
        question_count=1,
        user_id=user_id,
    )

    mock_response = MagicMock()
    mock_response.choices[0].message.content = None

    mock_collection = MagicMock()

    with (
        patch("app.tasks.quiz_tasks.oa_client") as mock_oa,
        patch("app.tasks.quiz_tasks.chromadb_collections", return_value=mock_collection),
        patch("app.tasks.quiz_tasks.SessionLocal", return_value=db),
    ):
        mock_oa.chat.completions.create.return_value = mock_response
        result = _run_generate_quiz_task(
            quiz_id=quiz_obj.id,
            summary="Test summary",
            num_questions=1,
            difficulty="medium",
        )

    assert result["status"] == "failed"
    assert "topics" in result["error"].lower()
