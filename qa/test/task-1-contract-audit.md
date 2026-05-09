# Task 1 - QA Baseline & Contract Audit

Owner: QA
Date: 2026-05-09
Scope: documentation-only audit. No backend or frontend files changed.

## Endpoint Matrix

| Area | Method | Path | Auth | Expected baseline |
| --- | --- | --- | --- | --- |
| Core | GET | `/` | No | `200`, body includes `message`, `version`, `status` |
| Core | GET | `/health` | No | `200`, body includes `status=healthy` and database state |
| Auth | GET | `/api/v1/auth/google/auth` | No | `200`, body includes `authorization_url` |
| Auth | GET | `/api/v1/auth/google/callback?code=...` | No | Exchanges OAuth code and returns bearer token |
| Auth | GET | `/api/v1/auth/me` | Bearer JWT | `200` with user profile, `401` without/invalid token |
| Projects | POST | `/api/v1/projects/` | Bearer JWT | Creates project for current user |
| Projects | GET | `/api/v1/projects/` | Bearer JWT | Lists current user's projects |
| Projects | GET | `/api/v1/projects/{project_id}` | Bearer JWT | Returns owned project, `404` for missing/unowned project |
| Projects | PUT | `/api/v1/projects/{project_id}` | Bearer JWT | Updates owned project, `404` for missing/unowned project |
| Projects | DELETE | `/api/v1/projects/{project_id}` | Bearer JWT | Deletes owned project, `404` for missing/unowned project |
| Materials | POST | `/api/v1/materials/upload?project_id=...` | Bearer JWT | Uploads material into owned project |
| Materials | GET | `/api/v1/materials/project/{project_id}` | Bearer JWT | Lists materials for owned project |
| Materials | GET | `/api/v1/materials/{material_id}` | Bearer JWT | Returns owned material, `404` for missing/unowned material |
| Materials | DELETE | `/api/v1/materials/{material_id}` | Bearer JWT | Deletes owned material, `404` for missing/unowned material |

## Baseline Smoke Tests

These tests are safe to add first because they do not require successful project CRUD:

- `GET /health` returns `200`.
- `GET /api/v1/auth/google/auth` returns `200` and an `authorization_url`.
- `GET /api/v1/auth/me` without token returns `401`.
- `GET /api/v1/projects/` without token returns `401`.
- `GET /api/v1/materials/project/test-project` without token returns `401`.

## Backend Contract Blockers

These should be fixed before integration tests for CRUD and uploads can be trusted:

- `Project` model uses `name`, while project schema/CRUD use `title`, `status`, and `vector_collection_name`.
- `User` model does not expose `full_name`, while auth response and OAuth user creation expect it.
- `Material` relationships reference `Project` and `User`; Ruff currently sees unresolved forward references.
- `Project` relationships reference `User` and `Material`; Ruff currently sees unresolved forward references.
- `User` relationships reference `Project`; `materials` relation is expected by `Material` but is not visible in the current user model.
- Alembic migration only covers `users` and `projects`; `materials` is not represented.
- `Base.metadata.create_all(bind=engine)` should be reviewed because the app uses SQLModel-style models.
- Frontend BFF session auth and backend bearer JWT auth are separate flows and need one integration decision.

## Test Environment Decision

Recommended first path:

- Unit/smoke tests use FastAPI `TestClient`.
- Security helper tests call `create_access_token` and `verify_token` directly.
- Database-backed route tests wait until model/schema mismatch is fixed.
- Upload tests should use a temporary upload directory fixture once material CRUD is stable.

This keeps Task 1 useful without modifying `backend` or `fe`.
