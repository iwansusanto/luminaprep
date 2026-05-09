# Task 2 - Backend Smoke Test & Unit Test Setup

Owner: QA
Date: 2026-05-09
Scope: prepared outside `backend` to avoid conflicts with backend owner work.

## What Is Ready

- A minimal pytest structure is drafted in `qa/test/templates`.
- Smoke tests focus on endpoints that should be stable before CRUD fixes.
- Security helper tests focus on token behavior and can run without a database.
- Backend folder is not changed in this task.

## Proposed Final Location

When backend owner is ready, copy or adapt:

- `qa/test/templates/conftest.py` to `backend/tests/conftest.py`
- `qa/test/templates/test_smoke.py` to `backend/tests/test_smoke.py`
- `qa/test/templates/test_security.py` to `backend/tests/test_security.py`

## Local Commands After Adoption

From `backend`:

```bash
uv sync --extra dev
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

If `make` is installed later, the current `backend/Makefile` can wrap Ruff, but it is not required for pytest.

## Expected Initial Results

The first backend test pass should include:

- `GET /health` succeeds.
- `GET /api/v1/auth/google/auth` succeeds if Google OAuth env is configured enough to build the URL.
- Protected endpoints reject missing bearer token with `401`.
- `verify_token(create_access_token({"sub": email}))` returns the email.
- Invalid token returns `None`.
- Token without `sub` returns `None`.

## Deferred Tests

These remain blocked until backend model/schema contracts are fixed:

- Create/list/update/delete project.
- Upload material to owned project.
- Reject upload to unowned project.
- Reject oversized upload.
- Verify upload cleanup and orphan-row behavior.

## Non-Conflict Notes

This setup intentionally avoids:

- changing `backend/pyproject.toml`
- changing `backend/tests`
- changing `fe`
- changing existing lint configuration

It gives a visible QA progress artifact while keeping implementation folders untouched.
