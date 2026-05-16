from __future__ import annotations

import json


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
    assert captured["kwargs"]["input"]["session_id"]
    assert fake_trace.updates
