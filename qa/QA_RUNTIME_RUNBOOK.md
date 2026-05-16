# QA Runtime Runbook

Tanggal: 16 Mei 2026

Scope: panduan menjalankan LuminaPrep untuk QA smoke dan contract test. Dokumen ini tidak mengubah source app.

## Keputusan QA Saat Ini

Mode utama untuk QA cepat: **local/hybrid**.

Alasan:

- lebih mudah melihat error backend langsung;
- tidak perlu rebuild image setiap perubahan env;
- lebih mudah memastikan FE proxy benar ke backend `localhost:8000`;
- cocok untuk smoke dan bug reproduction awal.

Tim yang memakai Docker tetap bisa jalan, tetapi env dan host name berbeda.

## Perbedaan Penting Local vs Docker

| Kebutuhan | Local/Hybrid | Full Docker |
| --- | --- | --- |
| Backend API URL dari browser/host | `http://localhost:8000` | `http://localhost:8000` jika port diexpose |
| FE BFF `API_URL` | `http://localhost:8000` | `http://api:8000` |
| Backend DB host | remote DB host atau `localhost:3363` | `db:3306` untuk MySQL compose |
| Redis host | `localhost:6379` jika Redis diexpose | `redis:6379` |
| FE container ke backend host-local | perlu `host.docker.internal:8000` | tidak perlu jika backend service `api` hidup |

Catatan utama:

- `localhost` di laptop berbeda dengan `localhost` di container.
- Jika FE berjalan di container dan backend berjalan di laptop, `API_URL=http://localhost:8000` dari FE container akan salah.
- Jika FE dan backend sama-sama Docker service, gunakan `API_URL=http://api:8000`.

## Mode A - Local/Hybrid QA

Gunakan mode ini untuk QA tahap awal.

### 1. Database

Pilih salah satu:

- pakai remote MySQL public;
- atau pakai MySQL Docker yang expose port `3363`.

Contoh backend `.env` untuk backend yang berjalan di host:

```env
DATABASE_URL=mysql+mysqlconnector://user_lp:<password>@43.133.137.125:3363/db_lp
REDIS_URL=redis://localhost:6379
SECRET_KEY=<local-secret>
OPENAI_API_KEY=<openai-key>
OPENAI_BASE_URL=https://api.openai.com/v1
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
LANGFUSE_ENABLED=false
```

Jika pakai MySQL Docker lokal:

```env
DATABASE_URL=mysql+mysqlconnector://user_lp:<password>@localhost:3363/db_lp
```

### 2. Backend

Dari folder backend:

```bash
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected:

```bash
curl -i http://localhost:8000/health
```

Harus menghasilkan `200` dan database `connected`.

### 3. Frontend BFF

Jika container FE di port 3000 masih hidup, hentikan dulu container tersebut atau gunakan port berbeda. Untuk local QA yang paling jelas, jalankan FE BFF dari host:

```bash
cd fe
API_URL=http://localhost:8000 PORT=3000 npm run serve
```

Expected:

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/api/v1/auth/me
```

Hasil yang benar:

- `/` -> `200`
- `/api/v1/auth/me` -> `401` tanpa token, bukan `504`

### 4. Retest Smoke

Dari root repo:

```bash
python3 qa/observability/templates/latency_probe.py \
  --base-url http://localhost:8000 \
  --samples 3
```

File output:

```text
qa/observability/reports/latency-report.json
```

### 5. Backend Automated Tests

Dari folder `backend`:

```bash
uv run --extra dev --extra celery pytest
```

Expected:

- seluruh test backend pass;
- termasuk `tests/test_mvp_happy_path.py`;
- command memakai extra `celery` karena test background task mengimpor modul Celery.

### 6. Frontend Smoke E2E

Dari folder `fe`:

```bash
npm run test:e2e
```

Expected:

- unauthenticated `/dashboard` redirect ke `/login`;
- authenticated dashboard shell render dengan mocked BFF session;
- material list dan navigasi dashboard terlihat.

## Mode B - Full Docker QA

Gunakan mode ini jika ingin sama dengan tim yang menjalankan semua service lewat Docker.

### 1. Root Env

Root `.env` harus tersedia karena `docker-compose.yml` memakai variable `${...}`.

Minimal root `.env` untuk Docker QA:

```env
NODE_ENV=production

FE_PORT=3000
FE_PORT_EXPOSE=3000
API_URL=http://api:8000

API_PORT=8000
API_PORT_EXPOSE=8000

MYSQL_DB=db_lp
MYSQL_USER=user_lp
MYSQL_PASS=<mysql-password>
MYSQL_PASS_ROOT=<root-password>
MYSQL_PORT=3306
MYSQL_PORT_EXPOSE=3363

PMA_PORT=80
PMA_PORT_EXPOSE=8099

LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://langprep.luminaprep.my.id

VITE_GOOGLE_CLIENT_ID=<google-client-id>
```

### 2. Backend Env Dalam Container

Jika backend API berjalan sebagai service Docker, `backend/.env` harus memakai host service Docker:

```env
DATABASE_URL=mysql+mysqlconnector://user_lp:<mysql-password>@db:3306/db_lp
REDIS_URL=redis://redis:6379
```

Jangan pakai:

```env
DATABASE_URL=mysql+mysqlconnector://user_lp:<mysql-password>@localhost:3363/db_lp
```

Karena `localhost` dari container API berarti container API sendiri.

### 3. Compose

```bash
docker compose up -d --build
```

Expected container:

- `luminaprep-fe`
- `luminaprep-api`
- `luminaprep-redis`
- `luminaprep-mysql`
- `luminaprep-phpmyadmin`

Expected checks:

```bash
curl -i http://localhost:8000/health
curl -i http://localhost:3000/
curl -i http://localhost:3000/api/v1/auth/me
```

Hasil benar:

- backend `/health` -> `200`
- frontend `/` -> `200`
- frontend `/api/v1/auth/me` -> `401` tanpa token, bukan `504`

## Mode C - FE Container + Backend Local

Mode ini tidak direkomendasikan untuk QA awal, tetapi bisa dipakai jika perlu.

Syarat:

- FE container harus bisa resolve host machine.
- `API_URL` FE container harus mengarah ke host, bukan `localhost`.

Contoh:

```env
API_URL=http://host.docker.internal:8000
```

Pada Linux, compose service `fe` biasanya perlu:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Tanpa ini, FE container akan gagal proxy ke backend local.

## QA Gate

Jangan lanjut ke E2E material/quiz sebelum semua gate ini hijau:

| Gate | Command | Expected |
| --- | --- | --- |
| Backend alive | `curl -i http://localhost:8000/health` | `200` |
| Backend auth contract | `curl -i http://localhost:8000/api/v1/auth/me` | `401` tanpa token |
| Backend automated tests | `cd backend && uv run --extra dev --extra celery pytest` | semua test pass |
| Frontend smoke E2E | `cd fe && npm run test:e2e` | semua Playwright smoke pass |
| FE alive | `curl -i http://localhost:3000/` | `200` |
| FE proxy to BE | `curl -i http://localhost:3000/api/v1/auth/me` | `401`, bukan `504` |
| Latency probe | `python3 qa/observability/templates/latency_probe.py --base-url http://localhost:8000 --samples 3` | backend endpoint expected status terpenuhi |

## Jika Gate Gagal

Jika backend direct gagal:

- backend belum berjalan;
- env backend tidak valid;
- dependency belum lengkap;
- DB tidak reachable.

Jika backend direct OK tapi FE proxy `504`:

- `API_URL` FE salah;
- FE container memakai `localhost` yang salah konteks;
- backend tidak reachable dari runtime FE.

Jika `/auth/session` mengembalikan `401` atau `200 {"authenticated":false}`:

- catat sebagai contract decision.
- Yang penting untuk smoke awal: endpoint tidak crash dan tidak `500`.
- Untuk frontend UX, tim perlu memilih apakah unauthenticated session response harus `200` atau `401`.
