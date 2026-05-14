"""
SummarizationAgent — generates summaries with page selection and token limiting.

Strategy:
- Select first 2 pages + last 2 pages from the document
- Concatenate and truncate to ~1000 tokens before sending to LLM
- 1 token ≈ 4 characters (conservative estimate for Indonesian/English)
"""
from app.utils.oa_client import oa_client

_CHARS_PER_TOKEN = 4
MAX_TOKENS = 1000
MAX_CHARS = MAX_TOKENS * _CHARS_PER_TOKEN  # 4000 chars


def select_pages(pages: list[str]) -> list[str]:
    """Return first 2 + last 2 pages (deduplicated for short docs)."""
    if not pages:
        return []
    if len(pages) <= 4:
        return pages
    # Avoid overlap when doc has exactly 4 pages
    first = pages[:2]
    last = pages[-2:]
    return first + last


def truncate_to_token_limit(text: str, max_chars: int = MAX_CHARS) -> str:
    """Hard-truncate text to stay within approximate token budget."""
    if len(text) <= max_chars:
        return text
    # Truncate at last sentence boundary within limit
    truncated = text[:max_chars]
    last_period = max(truncated.rfind(". "), truncated.rfind(".\n"))
    if last_period > max_chars // 2:
        return truncated[: last_period + 1]
    return truncated


def build_summary_context(pages: list[str]) -> str:
    """Select pages and enforce token limit — ready to send to LLM."""
    selected = select_pages(pages)
    combined = "\n\n---\n\n".join(selected)
    return truncate_to_token_limit(combined)


class SummarizationAgent:
    def __init__(self):
        self.client = oa_client

    async def generate(self, text: str) -> str:
        """Summarize arbitrary text. Caller is responsible for truncation."""
        response = oa_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Kamu adalah asisten AI yang ahli meringkas dokumen secara akurat. "
                        "Buat ringkasan yang mencakup poin utama, konsep kunci, dan informasi penting. "
                        "Gunakan bahasa yang sama dengan dokumen."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Ringkas dokumen berikut:\n\n{text}",
                },
            ],
            temperature=0.4,
            max_tokens=512,
        )
        return response.choices[0].message.content or ""

    async def generate_from_pages(self, pages: list[str]) -> str:
        """
        Summarize a multi-page document.
        Automatically selects first 2 + last 2 pages and enforces ~1000 token limit.
        """
        context = build_summary_context(pages)
        if not context.strip():
            return ""
        return await self.generate(context)
