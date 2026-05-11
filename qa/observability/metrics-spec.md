# Metrics Spec - Latency & Token Usage

## API Latency Metrics

Each sampled API request should record:

- `timestamp`
- `base_url`
- `method`
- `path`
- `expected_statuses`
- `status`
- `duration_ms`
- `ok`
- `error`

Aggregated report fields:

- `samples`
- `ok_count`
- `error_count`
- `error_rate`
- `min_ms`
- `max_ms`
- `avg_ms`
- `p50_ms`
- `p95_ms`
- `p99_ms`

Initial QA thresholds for local development:

- `/health` p95 should stay below `300 ms`.
- Auth/project/material protected checks should stay below `1000 ms` p95.
- Expected auth failures such as `401` count as successful QA samples when the
  expected status is `401`.

## Token Usage Event Contract

When AI/quiz features are implemented, every LLM call should emit one JSON event:

```json
{
  "timestamp": "2026-05-11T00:00:00Z",
  "request_id": "request-id",
  "operation": "quiz_generation",
  "provider": "openai",
  "model": "model-name",
  "input_tokens": 0,
  "output_tokens": 0,
  "total_tokens": 0,
  "latency_ms": 0,
  "estimated_cost_usd": 0.0,
  "user_id": "optional-user-id",
  "project_id": "optional-project-id",
  "material_id": "optional-material-id",
  "quiz_id": "optional-quiz-id"
}
```

Required fields:

- `timestamp`
- `operation`
- `provider`
- `model`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `latency_ms`

Recommended operations:

- `embedding`
- `summarization`
- `quiz_generation`
- `answer_evaluation`
- `feedback_generation`

Privacy rule: do not log prompts, raw user answers, access tokens, OAuth tokens,
or uploaded file contents in usage events.
