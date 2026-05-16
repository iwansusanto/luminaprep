# QA Initial Smoke Retest

Tanggal: 16 Mei 2026

Scope: retest setelah runtime local/hybrid dijalankan.

## Ringkasan

Status: **Partial Pass**

Blocker utama dari smoke pertama sudah membaik:

- backend API sudah berjalan di `localhost:8000`;
- database connected;
- frontend BFF/proxy sudah bisa meneruskan `/api/*` ke backend;
- FE proxy `/api/v1/auth/me` sekarang menghasilkan `401 Unauthorized`, bukan `504 Gateway Timeout`.

Satu failure tersisa berasal dari probe contract lama: `GET /api/v1/auth/google/auth` expected `200`, tetapi backend aktual mengembalikan `404`. Dari code saat ini, endpoint Google auth URL generation tidak tersedia di router auth; OAuth helper diberi catatan deprecated/handled by FE.

## Environment

Mode runtime: **local/hybrid**

- Backend: `http://localhost:8000`
- Frontend/BFF: `http://localhost:3000`
- Latency probe: `qa/observability/templates/latency_probe.py`

## Smoke Retest Result

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| `GET http://localhost:8000/` | `200` | `200`, p95 `7.15ms` | Pass |
| `GET http://localhost:8000/health` | `200` + DB connected | `200`, `{"status":"healthy","database":"connected"}`, p95 `50.09ms` | Pass |
| `GET http://localhost:8000/api/v1/auth/me` | `401` without token | `401`, p95 `1.02ms` | Pass |
| `GET http://localhost:8000/api/v1/projects/` | `401` without token | `401`, p95 `20.24ms` | Pass |
| `GET http://localhost:8000/api/v1/materials/project/test-project` | `401` without token | `401`, p95 `2.23ms` | Pass |
| `GET http://localhost:8000/api/v1/auth/google/auth` | probe expected `200` | `404 Not Found` | Contract Needs Update |
| `GET http://localhost:3000/api/v1/auth/me` | `401`, not `504` | `401 Unauthorized` from uvicorn via Express proxy | Pass |

Latency report:

```text
qa/observability/reports/latency-report.json
```

## Evidence

Probe command:

```bash
python3 qa/observability/templates/latency_probe.py \
  --base-url http://localhost:8000 \
  --samples 3
```

Probe output:

```text
GET / p50=0.71ms p95=7.15ms error_rate=0.0
GET /health p50=49.28ms p95=50.09ms error_rate=0.0
GET /api/v1/auth/google/auth p50=0.63ms p95=0.85ms error_rate=1.0
GET /api/v1/auth/me p50=0.81ms p95=1.02ms error_rate=0.0
GET /api/v1/projects/ p50=1.5ms p95=20.24ms error_rate=0.0
GET /api/v1/materials/project/test-project p50=1.02ms p95=2.23ms error_rate=0.0
```

FE proxy check:

```text
curl -i http://localhost:3000/api/v1/auth/me

HTTP/1.1 401 Unauthorized
X-Powered-By: Express
server: uvicorn
www-authenticate: Bearer
content-type: application/json
```

## Blocker Status

| ID | Previous Status | Retest Status | Notes |
| --- | --- | --- | --- |
| QA-SMOKE-001 - Backend API tidak berjalan | Open | Fixed for local/hybrid | Backend responds on `localhost:8000`. |
| QA-SMOKE-002 - FE proxy tidak mencapai backend | Open | Fixed for local/hybrid | FE `/api/v1/auth/me` returns backend `401`, not `504`. |
| QA-SMOKE-003 - root `.env` missing for Docker compose | Open | Still Open | Local/hybrid does not require root `.env`, but Docker team still needs it. |

## New / Remaining Issues

### QA-SMOKE-004 - Latency Probe Contains Stale Google Auth Endpoint

Severity: Low/Medium

Current:

- probe expects `GET /api/v1/auth/google/auth` to return `200`;
- backend returns `404`;
- `backend/app/core/oauth.py` marks Google OAuth URL generation as deprecated/handled by FE.

Decision needed:

- If Google OAuth is fully FE-owned, remove this endpoint from default backend latency probe.
- If backend should own OAuth URL generation, add route contract and implementation.

Recommendation for QA:

- Treat this as a contract update issue, not a runtime blocker.
- For next smoke runs, use custom endpoints or update default probe after team confirms auth ownership.

## Go / No-Go

Decision: **Go untuk QA flow MVP manual**, with caveat.

Allowed next QA:

- auth/signin via BFF;
- create/list project;
- upload material;
- verify material status;
- generate quiz;
- start quiz session;
- submit answer;
- complete quiz and view result.

Not yet done:

- Docker full-stack parity;
- E2E automation;
- Langfuse runtime validation;
- Celery/worker path validation.

## Next QA Steps

1. Confirm auth ownership:
   - FE-only Google auth with backend `/auth/signin`;
   - or backend Google auth route restored.
2. Run MVP flow manually:
   - login/session;
   - create project;
   - upload small TXT/PDF;
   - wait material completed;
   - generate 3-5 question quiz;
   - start quiz and submit answers.
3. Record any failure in `qa/bug-register.md`.
4. After one manual happy path passes, write Playwright smoke skeleton.

