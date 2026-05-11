# Day 1 - Latency & Token Usage Scope

Owner: QA
Scope: QA-only observability artifacts. No backend or frontend source files changed.

## Current Measurable Latency Scope

| Area | Method | Path | Expected status | Measurable now |
| --- | --- | --- | --- | --- |
| Core | GET | `/` | `200` | Yes |
| Core | GET | `/health` | `200` | Yes |
| Auth | GET | `/api/v1/auth/google/auth` | `200` | Yes, depends on OAuth env quality |
| Auth | GET | `/api/v1/auth/me` | `401` without token | Yes |
| Projects | GET | `/api/v1/projects/` | `401` without token | Yes |
| Materials | GET | `/api/v1/materials/project/test-project` | `401` without token | Yes |

## Blocked Token Usage Scope

Token usage cannot be measured from the current backend because there is no active
LLM/AI/quiz endpoint in `backend/app`. This is an explicit dependency, not a QA
implementation gap.

The first AI implementation should emit usage events for:

- embedding
- material summarization
- quiz generation
- answer evaluation
- feedback generation

## Non-Conflict Rule

All artifacts for this task live under `qa/observability`. Do not modify:

- `backend/app/*`
- `backend/pyproject.toml`
- `backend/uv.lock`
- `fe/*`
