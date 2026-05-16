from __future__ import annotations

import json
from types import SimpleNamespace


class _FakeTrace:
    def __init__(self):
        self.updates = []
        self.spans = []
        self.generations = []
        self.ended = []

    def __bool__(self):
        return True

    def update(self, **kwargs):
        self.updates.append(kwargs)

    def span(self, **kwargs):
        self.spans.append(kwargs)
        return self

    def generation(self, **kwargs):
        self.generations.append(kwargs)
        return self

    def end(self, **kwargs):
        self.ended.append(kwargs)


def test_chat_endpoint_emits_chatbot_trace_metadata(
    client_as_user,
    monkeypatch,
    project,
    material,
    test_user,
):
    from app.api.v1 import agent as agent_module

    captured = {}
    fake_trace = _FakeTrace()

    def fake_safe_trace(name, **kwargs):
        captured["name"] = name
        captured["kwargs"] = kwargs
        return fake_trace

    class DummyChatbotAgent:
        def __init__(self, *args, **kwargs):
            self.trace = kwargs.get("trace")
            self._final_response = "Tutoring reply."
            self._tool_calls = []
            self._tool_results = []

        async def chat_stream(self, history, user_message):
            self._final_response = f"reply:{user_message}"
            yield f"data: {json.dumps({'type': 'text_delta', 'delta': 'reply'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        def get_final_response(self):
            return self._final_response

        def get_tool_calls(self):
            return self._tool_calls

        def get_tool_results(self):
            return self._tool_results

    monkeypatch.setattr(agent_module.observability, "safe_trace", fake_safe_trace)
    monkeypatch.setattr(agent_module, "ChatbotAgent", DummyChatbotAgent)

    resp = client_as_user.post(
        "/api/v1/agent/chat",
        json={
            "message": "Explain this material",
            "project_id": project["id"],
            "material_id": material["id"],
            "attached_material_ids": [material["id"]],
        },
    )

    assert resp.status_code == 200, resp.text
    assert captured["name"] == "chatbot-agent"
    metadata = captured["kwargs"]["metadata"]
    assert metadata["pipeline"] == "chatbot-agent"
    assert metadata["user_id"] == test_user.id
    assert metadata["project_id"] == project["id"]
    assert metadata["material_id"] == material["id"]
    assert metadata["mode"] == "stream"
    assert metadata["attached_material_count"] == 1
    assert metadata["history_count"] == 0
    assert fake_trace.updates
    assert any(
        update.get("output", {}).get("status") == "completed"
        for update in fake_trace.updates
    )
    span_names = [span["name"] for span in fake_trace.spans]
    assert "load-chat-history" in span_names
    assert "persist-user-message" in span_names
    assert "persist-assistant-message" in span_names


def test_chatbot_agent_stream_emits_run_and_tool_spans(monkeypatch, db, test_user):
    from app.agents import chatbot as chatbot_module
    from app.agents.chatbot import ChatbotAgent

    fake_trace = _FakeTrace()

    class FakeRunner:
        async def stream_events(self):
            yield SimpleNamespace(
                type="raw_response_event",
                data=SimpleNamespace(delta="hello"),
            )
            yield SimpleNamespace(
                type="run_item_stream_event",
                name="tool_called",
                item=SimpleNamespace(
                    raw_item=SimpleNamespace(
                        name="search_material",
                        arguments='{"query":"test"}',
                        id="tool-1",
                    )
                ),
            )
            yield SimpleNamespace(
                type="run_item_stream_event",
                name="tool_result",
                item=SimpleNamespace(
                    raw_item=SimpleNamespace(
                        tool_call_id="tool-1",
                        content='{"found": true}',
                    )
                ),
            )

    monkeypatch.setattr(
        chatbot_module.Runner,
        "run_streamed",
        lambda *args, **kwargs: FakeRunner(),
    )

    agent = ChatbotAgent(
        db=db,
        user_id=test_user.id,
        project_id="project-1",
        material_id="material-1",
        quiz_id="quiz-1",
        trace=fake_trace,
    )

    async def _run():
        chunks = []
        async for chunk in agent.chat_stream(
            history=[{"role": "user", "content": "hello"}],
            user_message="Explain material",
        ):
            chunks.append(chunk)
        return chunks

    import asyncio

    chunks = asyncio.run(_run())

    assert any("data:" in chunk for chunk in chunks)
    span_names = [span["name"] for span in fake_trace.spans]
    assert "build-system-prompt" in span_names
    assert "prepare-chat-input" in span_names
    assert "run-agent-stream" in span_names
    assert "tool-call:search_material" in span_names
