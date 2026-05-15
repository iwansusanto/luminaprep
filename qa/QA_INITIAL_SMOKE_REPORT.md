# QA Initial Smoke Report

Tanggal: 16 Mei 2026

Scope: tahap awal QA runtime dan contract check. Tidak ada source app frontend/backend yang diubah.

## Ringkasan

Status: **Blocked**

Frontend container hidup dan halaman utama bisa dibuka, tetapi backend API tidak berjalan di `localhost:8000`. Akibatnya FE-BE integration gagal dan endpoint proxied `/api/*` dari frontend menghasilkan `504 Gateway Timeout`.

## Environment Yang Dicek

Working directory:

```text
/home/faris/Documents/code/projects/luminaprep
```

Container aktif:

| Container | Status | Port |
| --- | --- | --- |
| `luminaprep-fe` | Up | `3000->3000` |
| `luminaprep-mysql` | Up | `3363->3306` |
| `luminaprep-phpmyadmin` | Up | `8099->80` |

Container backend/API tidak terlihat berjalan.

Env file:

| File | Status |
| --- | --- |
| root `.env` | Missing di working tree saat dicek |
| `backend/.env` | Exists |

## Smoke Result

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| `GET http://localhost:3000/` | `200` | `200 OK`, HTML FE served | Pass |
| `GET http://localhost:8000/` | `200` | Connection refused | Fail |
| `GET http://localhost:8000/health` | `200` | Connection refused | Fail |
| `GET http://localhost:3000/auth/session` | unauthenticated response | `401 {"authenticated":false}` | Warning |
| `GET http://localhost:3000/api/v1/auth/me` | proxied backend response, likely `401` without token | `504 Gateway Timeout` | Fail |

Latency probe output:

```text
qa/observability/reports/latency-report.json
```

Probe summary:

- base URL: `http://localhost:8000`
- all checked backend endpoints failed with `Connection refused`
- error rate: `1.0` for every backend endpoint

## Evidence

Backend direct health check:

```text
curl http://localhost:8000/health
curl: Failed to connect to localhost port 8000
```

Frontend root:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

Frontend API proxy:

```text
HTTP/1.1 504 Gateway Timeout
Error occurred while trying to proxy: localhost:3000/v1/auth/me
```

FE container log:

```text
Server is running on http://localhost:3000
Proxying /api requests to http://localhost:8000
```

## Blockers

### QA-SMOKE-001 - Backend API Tidak Berjalan

Severity: High

Impact:

- semua backend API contract test gagal;
- FE tidak bisa mengambil data API;
- flow login/session/material/quiz tidak bisa diuji end-to-end.

Evidence:

- tidak ada container `luminaprep-api`;
- `GET localhost:8000/health` connection refused;
- latency probe backend error rate `100%`.

### QA-SMOKE-002 - FE Proxy Mengarah ke Backend Yang Tidak Tersedia

Severity: High

Impact:

- endpoint FE `/api/*` gagal `504`;
- halaman FE bisa render, tetapi fitur yang butuh API tidak bisa dipakai.

Evidence:

- `GET localhost:3000/api/v1/auth/me` menghasilkan `504 Gateway Timeout`;
- FE log menunjukkan proxy target `http://localhost:8000`.

Catatan:

- Jika FE berjalan di container, `localhost:8000` berarti container FE sendiri, bukan host machine.
- Jika backend dijalankan di host, FE container perlu target seperti `host.docker.internal:8000` dengan `extra_hosts`, atau backend harus ikut berjalan sebagai service Docker `api`.

### QA-SMOKE-003 - Root `.env` Missing

Severity: Medium

Impact:

- `docker compose up` dari nol berisiko gagal karena compose memakai variable seperti `FE_PORT_EXPOSE`, `API_URL`, `MYSQL_*`, dan `PMA_PORT_EXPOSE`.

Evidence:

- root `.env` tidak ada saat dicek;
- existing container kemungkinan berasal dari run sebelumnya atau env yang tidak lagi tersedia di working tree.

## Go / No-Go

Current decision: **No-Go untuk full QA/E2E.**

QA yang boleh lanjut:

- static code review;
- backend unit test jika environment dependency siap;
- dokumentasi bug register;
- observability plan.

QA yang belum layak dijalankan:

- FE-BE E2E;
- material upload flow;
- quiz generation flow;
- quiz taking/result flow;
- Langfuse validation runtime.

## Next Recommended Actions

1. Pilih mode runtime resmi untuk local QA:
   - full Docker: `fe`, `api`, `redis`, `mysql`, `phpmyadmin`;
   - atau hybrid: FE local + backend local + MySQL Docker.
2. Jika full Docker:
   - jalankan container `api`;
   - set `API_URL=http://api:8000` untuk FE container;
   - set backend `DATABASE_URL` ke host DB yang benar untuk container.
3. Jika hybrid:
   - jalankan backend di host pada `localhost:8000`;
   - jalankan FE via local `npm run serve`/dev, bukan container; atau set FE container ke `host.docker.internal:8000`.
4. Restore/siapkan root `.env.example` atau `.env.local.qa` untuk compose QA.
5. Retest smoke:
   - `GET /health` backend `200`;
   - `GET /api/v1/auth/me` backend `401` tanpa token;
   - `GET /api/v1/auth/me` lewat FE proxy `401`, bukan `504`;
   - FE `/auth/session` unauthenticated response konsisten dengan contract.

