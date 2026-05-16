from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.agents.summarization import (
    MAX_CHARS,
    SummarizationAgent,
    build_summary_context,
    select_pages,
    truncate_to_token_limit,
)


def test_select_pages_keeps_small_docs_intact():
    pages = ["page-1", "page-2", "page-3", "page-4"]

    assert select_pages(pages) == pages


def test_build_summary_context_uses_first_and_last_pages():
    pages = [f"page-{i}" for i in range(1, 7)]

    context = build_summary_context(pages)

    assert "page-1" in context
    assert "page-2" in context
    assert "page-5" in context
    assert "page-6" in context
    assert "page-3" not in context
    assert "page-4" not in context


def test_truncate_to_token_limit_caps_text_length():
    text = "x" * (MAX_CHARS + 500)

    truncated = truncate_to_token_limit(text)

    assert len(truncated) <= MAX_CHARS


@pytest.mark.asyncio
async def test_generate_from_pages_uses_truncated_context_and_max_tokens(monkeypatch):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "ringkasan"

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    from app.agents import summarization as summarization_module

    monkeypatch.setattr(summarization_module, "oa_client", mock_client)

    agent = SummarizationAgent()
    long_pages = ["A" * 3000, "B" * 3000, "C" * 3000, "D" * 3000, "E" * 3000]

    result = await agent.generate_from_pages(long_pages)

    assert result == "ringkasan"
    mock_client.chat.completions.create.assert_called_once()
    kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-4o-mini"
    assert kwargs["temperature"] == 0.4
    assert kwargs["max_tokens"] == 512
    user_message = kwargs["messages"][1]["content"]
    assert len(user_message) <= MAX_CHARS + 200
    assert user_message.startswith("Ringkas dokumen berikut:")
    assert "A" in user_message
