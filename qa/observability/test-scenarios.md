# Test Scenarios - Latency & Token Usage

## Latency Scenarios Available Now

Run these against a local backend server:

| Scenario | Method | Path | Expected |
| --- | --- | --- | --- |
| Root is reachable | GET | `/` | `200` |
| Health is reachable | GET | `/health` | `200` |
| OAuth URL generation | GET | `/api/v1/auth/google/auth` | `200` |
| Missing auth rejected | GET | `/api/v1/auth/me` | `401` |
| Projects protected | GET | `/api/v1/projects/` | `401` |
| Materials protected | GET | `/api/v1/materials/project/test-project` | `401` |

## Future Latency Scenarios After Auth Test Fixture Exists

- `POST /api/v1/projects/` with bearer token.
- `GET /api/v1/projects/` with bearer token.
- `POST /api/v1/materials/upload` with small valid file.
- `POST /api/v1/materials/upload` with oversized file.
- unowned project/material access returns `404`.

## Future Token Usage Scenarios

Use `qa/observability/templates/token_usage_report.py` after backend produces
JSONL usage events.

Minimum cases:

- quiz generation emits one event with non-zero input/output tokens.
- answer evaluation emits one event per submitted answer.
- failed provider call records latency and error separately without fake token
  values.
- all events include `request_id`, `operation`, `provider`, and `model`.
