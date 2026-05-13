# Backend Observability Contract

This is a handoff document for backend implementation. QA should not patch these
directly while backend owners are changing API code.

## Request Logging Contract

Add middleware that emits one structured log event per request:

```json
{
  "timestamp": "2026-05-11T00:00:00Z",
  "level": "info",
  "event": "http_request",
  "request_id": "uuid",
  "method": "GET",
  "path": "/api/v1/projects/",
  "route": "/api/v1/projects/",
  "status_code": 401,
  "duration_ms": 12.34,
  "user_id": null,
  "error_type": null
}
```

Required behavior:

- Generate `request_id` when the request does not provide one.
- Return `x-request-id` header in every response.
- Log `duration_ms` for success and failure responses.
- Do not log bearer tokens, OAuth tokens, prompt bodies, or uploaded file body.
- Treat expected `401`/`404` responses as observable outcomes, not logging
  failures.

## LLM Usage Contract

Wrap each future LLM call with a usage recorder:

```python
record_llm_usage(
    operation="quiz_generation",
    provider="openai",
    model=model_name,
    input_tokens=usage.input_tokens,
    output_tokens=usage.output_tokens,
    total_tokens=usage.total_tokens,
    latency_ms=duration_ms,
    metadata={
        "request_id": request_id,
        "user_id": user_id,
        "project_id": project_id,
        "material_id": material_id,
        "quiz_id": quiz_id,
    },
)
```

The recorder may write JSON logs first. Langfuse or another trace backend can be
added after the raw event contract is stable.
