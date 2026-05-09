# QA_MEMBER4 - QA & Observability Plan

Pemilik: Faris (QA & Observability)
Tanggal update: 8 Mei 2026

## Ringkasan Kondisi Codebase Saat Ini

Repo saat ini berisi:

- Frontend: React 19, TypeScript, Vite, TanStack Router, Tailwind, PM2/Express BFF.
- Backend: FastAPI dengan route `/health`, `/api/v1/auth`, `/api/v1/projects`, dan `/api/v1/materials`.
- Infrastruktur lokal: `docker-compose.yml` hanya menjalankan frontend, MySQL, dan phpMyAdmin. Service backend masih dikomentari.
- Test suite belum tersedia di repo.
- Observability belum tersedia: belum ada Langfuse, structured logging, request ID, metrics, atau error tracking.
- Modul AI/quiz/LLM belum tersedia di backend. Dokumentasi `backend/--Day1-3.md` menyebut fitur quiz, session, dan streaming Hari 4+ sudah dihapus.

Implikasi untuk QA:

- Jangan mulai dari evaluasi Langfuse untuk quiz/feedback karena endpoint dan agent AI belum ada.
- Prioritas pertama adalah memastikan baseline backend/frontend bisa diuji otomatis.
- Observability awal harus fokus ke API yang ada: auth, project CRUD, material upload, health check, dan proxy frontend.
- Langfuse disiapkan sebagai fondasi saja, lalu diaktifkan untuk LLM setelah modul AI/quiz masuk.

## Risiko Teknis Yang Perlu Diverifikasi

- Backend memakai `Base.metadata.create_all`, tetapi model menggunakan `SQLModel`; ini berisiko tabel tidak dibuat oleh metadata yang benar.
- Ada mismatch field antara model dan schema/CRUD:
  - `Project` model memakai `name`, sementara schema/CRUD memakai `title`, `status`, dan `vector_collection_name`.
  - `User` model tidak memiliki `full_name`, tetapi auth response dan OAuth create user memakai `full_name`.
  - Relasi `User.materials` tidak terlihat di model user, sementara `Material` punya `Relationship(back_populates="materials")`.
- Alembic migration hanya mencakup `users` dan `projects`; tabel `materials` belum ada di migration.
- Frontend saat development mem-proxy `/api` ke `http://localhost:3000`, lalu Express BFF mem-proxy ke backend. Ini perlu smoke test agar tidak terjadi proxy loop/misconfig.
- `docker-compose.yml` belum menjalankan backend, Redis, Celery, Qdrant, atau Langfuse.
- Auth frontend memakai cookie session BFF dari Google userinfo, sedangkan backend protected API memakai JWT bearer dari backend OAuth callback. Flow integrasi perlu diputuskan dan diuji.

## Plan Revisi Per Hari

### Hari 1 - QA Baseline & Contract Audit (8 Mei)

Fokus:

- Petakan endpoint aktual dari backend:
  - `GET /`
  - `GET /health`
  - `GET /api/v1/auth/google/auth`
  - `GET /api/v1/auth/google/callback`
  - `GET /api/v1/auth/me`
  - CRUD `/api/v1/projects`
  - CRUD terbatas `/api/v1/materials`
- Buat matriks test berdasarkan endpoint aktual, bukan fitur AI yang belum ada.
- Verifikasi schema/model/CRUD mismatch dan catat bug/blocker untuk backend owner.
- Tentukan test environment minimal: SQLite/test database atau MySQL container.

Deliverable:

- QA checklist endpoint aktual.
- Daftar blocker kontrak backend: model, schema, migration, auth flow.
- Prioritas bug yang harus diperbaiki sebelum E2E.

### Hari 2 - Backend Smoke Test & Unit Test Awal (9 Mei)

Fokus:

- Tambahkan struktur `backend/tests`.
- Buat smoke test untuk:
  - `GET /health`
  - `GET /api/v1/auth/google/auth`
  - protected endpoint tanpa token harus `401`
- Buat test security helper:
  - token valid menghasilkan subject email.
  - token invalid ditolak.
  - token tanpa `sub` ditolak.
- Buat test CRUD level service setelah mismatch model/schema diperbaiki oleh backend owner.

Deliverable:

- `pytest` bisa dijalankan dari folder backend.
- Minimal smoke test berjalan di CI/local.
- Bug kontrak backend terdeteksi secara otomatis.

### Hari 3 - Integration Test API & Database (10 Mei)

Fokus:

- Siapkan fixture database test yang isolated.
- Test flow backend aktual:
  - create user test.
  - generate bearer token.
  - hit `/api/v1/auth/me`.
  - create/list/update/delete project.
  - upload material ke project valid.
  - upload material ke project milik user lain harus `404`.
  - file > `MAX_FILE_SIZE` harus `413`.
- Pastikan upload test tidak mencemari folder kerja utama, gunakan temp upload dir.

Deliverable:

- Integration test untuk auth, project, dan material.
- Laporan coverage endpoint aktual.
- Daftar bug data isolation dan upload handling.

### Hari 4 - Observability API Dasar (11 Mei)

Fokus:

- Tambahkan observability non-LLM terlebih dahulu:
  - request ID middleware.
  - structured JSON logging.
  - log latency per request.
  - log status code dan route template.
  - log user ID jika tersedia, tanpa membocorkan token atau PII sensitif.
- Instrument endpoint penting:
  - `/health`
  - `/api/v1/auth/me`
  - `/api/v1/projects/*`
  - `/api/v1/materials/upload`
- Definisikan standar metadata:
  - `request_id`
  - `route`
  - `method`
  - `status_code`
  - `duration_ms`
  - `user_id`
  - `project_id`
  - `material_id`

Deliverable:

- Log terstruktur bisa dipakai untuk debugging.
- Bukti log untuk success, validation error, auth error, dan server error.
- Checklist field observability yang wajib ada.

### Hari 5 - CI/CD Testing Pipeline (12 Mei)

Fokus:

- Buat GitHub Actions untuk:
  - backend lint/test.
  - frontend lint/build.
  - dependency install dari lockfile.
- Pipeline minimal:
  - `uv sync --extra dev`
  - `uv run pytest`
  - `npm ci`
  - `npm run lint`
  - `npm run build`
- Tambahkan artifact test report bila memungkinkan.

Deliverable:

- CI berjalan pada push/PR.
- Status merah jika smoke/integration test gagal.
- Dokumentasi command lokal yang sama dengan CI.

### Hari 6 - Frontend QA & E2E Skeleton (13 Mei)

Fokus:

- Tambahkan Playwright sebagai E2E framework.
- Test alur frontend aktual:
  - public route terbuka.
  - dashboard redirect ke login saat belum authenticated.
  - BFF `/auth/login`, `/auth/session`, `/auth/logout` bekerja.
  - dashboard dapat dibuka setelah session cookie ada.
  - halaman materials dan quizzes render tanpa crash.
- Karena data materials/quizzes masih mock, E2E fokus ke navigasi dan auth session, bukan validasi AI.

Deliverable:

- Playwright skeleton siap.
- Minimal E2E auth/session dan navigasi dashboard.
- Catatan gap integrasi frontend dengan backend JWT.

### Hari 7 - Langfuse Readiness, Bukan Full LLM Evaluation (14 Mei)

Fokus:

- Siapkan konfigurasi Langfuse secara optional:
  - `LANGFUSE_PUBLIC_KEY`
  - `LANGFUSE_SECRET_KEY`
  - `LANGFUSE_HOST`
  - `OBSERVABILITY_ENABLED`
- Buat wrapper observability yang no-op jika env belum diisi.
- Trace operasi backend yang ada sebagai span biasa:
  - auth user lookup.
  - project CRUD.
  - material upload/save.
- Jangan membuat evaluasi quiz/feedback sampai endpoint AI tersedia.

Deliverable:

- Langfuse bisa diaktifkan tanpa mengganggu local dev.
- Trace API dasar muncul saat env Langfuse tersedia.
- Dokumentasi env dan cara verifikasi trace.

### Hari 8 - Security & Reliability Testing (15 Mei)

Fokus:

- Security checks:
  - secret default terdeteksi sebagai risiko.
  - token invalid/expired ditolak.
  - upload path traversal tidak memungkinkan.
  - file besar ditolak.
  - user tidak bisa akses project/material user lain.
- Reliability checks:
  - database unavailable menghasilkan error yang teramati.
  - upload gagal tidak membuat row material yatim.
  - delete material membersihkan file jika ada.

Deliverable:

- Security test report.
- Reliability bug list dengan severity.
- Rekomendasi fix sebelum demo.

### Hari 9 - Docker & Deployment Readiness (16 Mei)

Fokus:

- Update deployment checklist berdasarkan compose aktual:
  - backend service belum aktif di `docker-compose.yml`.
  - backend Dockerfile belum terlihat.
  - env database backend harus cocok dengan MySQL compose: `db_lp`, `user_lp`, host `db`, port `3306`.
  - migration harus mencakup `materials`.
- Validasi startup order:
  - db ready.
  - backend migrate/start.
  - frontend proxy ke backend.
- Tambahkan health check untuk backend container jika service dibuat.

Deliverable:

- Deployment readiness checklist.
- Daftar perubahan infra yang dibutuhkan sebelum deploy.
- Smoke test command untuk environment deployment.

### Hari 10 - Performance Baseline (17 Mei)

Fokus:

- Jalankan load test ringan untuk API aktual:
  - `/health`
  - `/api/v1/projects/`
  - `/api/v1/materials/upload`
- Ukur:
  - p50/p95 latency.
  - error rate.
  - throughput.
  - ukuran file upload yang aman.
- Gunakan tool sederhana seperti k6/Locust setelah API stabil.

Deliverable:

- Baseline performance report.
- Threshold awal alert:
  - API p95 > 1000 ms.
  - upload p95 > 5000 ms.
  - error rate > 5%.

### Hari 11 - Demo Readiness & Observability Dashboard (18 Mei)

Fokus:

- Siapkan dashboard demo berdasarkan fitur aktual:
  - service health.
  - request count.
  - error count.
  - latency p95.
  - upload success/failure.
  - auth failure.
- Verifikasi semua test wajib hijau:
  - backend smoke/integration.
  - frontend lint/build.
  - Playwright smoke.
- Buat go/no-go checklist.

Deliverable:

- Demo QA report.
- Observability screenshot/log evidence.
- Go/no-go decision dengan blocker tersisa.

## Scope Langfuse Setelah Modul AI Masuk

Jika backend AI/quiz sudah ditambahkan, tambahkan plan berikut:

- Trace semua panggilan LLM:
  - embedding.
  - summarization.
  - quiz generation.
  - answer evaluation.
  - feedback generation.
- Metadata wajib:
  - `user_id`
  - `project_id`
  - `material_id`
  - `quiz_id`
  - `model`
  - `prompt_version`
  - `input_tokens`
  - `output_tokens`
  - `latency_ms`
  - `cost`
- Dataset evaluasi:
  - 5-10 dokumen PDF/TXT.
  - 3-5 expected MCQ per dokumen.
  - expected answer dan explanation.
- Metrics:
  - quiz answer correctness.
  - explanation groundedness.
  - hallucination rate.
  - citation correctness.
  - latency per AI step.

## Definition of Done QA Member 4

- Test command lokal dan CI terdokumentasi.
- Smoke test API dan frontend berjalan otomatis.
- Integration test mencakup auth, project, dan material.
- Observability dasar tersedia untuk request backend.
- Langfuse optional dan tidak memblokir local development.
- Gap AI/quiz dicatat eksplisit sebagai dependency, bukan diasumsikan sudah ada.
- Demo readiness punya checklist berbasis bukti, bukan klaim manual.
