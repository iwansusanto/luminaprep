from unittest.mock import MagicMock

from app.agents import feedback_agent
from app.agents.feedback_agent import FeedbackAgent
from app.models.question import Question


class FakeCollection:
    def query(self, *args, **kwargs):
        return {"documents": [["Relevant QA material context."]]}


def test_feedback_agent_generates_feedback_with_mocked_llm(monkeypatch):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "Helpful feedback."
    mock_response.usage = {
        "prompt_tokens": 12,
        "completion_tokens": 4,
        "total_tokens": 16,
    }

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    monkeypatch.setattr(feedback_agent, "oa_client", mock_client)
    monkeypatch.setattr(feedback_agent, "chromadb_collections", lambda: FakeCollection())

    question = Question(
        id="question-1",
        quiz_id="quiz-1",
        question_text="What does QA validate?",
        correct_answer="Expected behavior",
        options={"A": "Expected behavior", "B": "Only colors"},
        explanation="QA validates expected behavior.",
    )

    feedback = FeedbackAgent().generate_feedback(
        question=question,
        quiz_id="quiz-1",
        selected_answer="Expected behavior",
        is_correct=True,
        user_id="user-1",
        session_id="session-1",
    )

    assert feedback == "Helpful feedback."
    mock_client.chat.completions.create.assert_called_once()
