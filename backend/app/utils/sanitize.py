"""
Input sanitization utilities for user-provided AI prompt fields.
Prevents prompt injection and enforces length limits.
"""
import re

# Patterns that look like prompt injection attempts
_INJECTION_PATTERNS = [
    r"ignore\s+(previous|all|above|prior)\s+instructions?",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+(a|an)\s+",
    r"forget\s+(everything|all|your)",
    r"new\s+instructions?:",
    r"system\s*:",
    r"<\s*/?system\s*>",
    r"\[INST\]",
    r"###\s*instruction",
]

_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)


def sanitize_prompt_field(value: str | None, max_length: int = 500) -> str:
    """
    Clean a user-provided prompt field:
    - Strip whitespace
    - Truncate to max_length
    - Remove/replace prompt injection patterns
    Returns empty string if value is None or empty.
    """
    if not value:
        return ""

    value = value.strip()[:max_length]

    # Replace injection patterns with a safe placeholder
    value = _INJECTION_RE.sub("[removed]", value)

    # Remove null bytes and control characters (except newline/tab)
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)

    return value.strip()
