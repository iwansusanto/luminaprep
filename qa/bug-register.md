# QA Bug Register

Update: 16 Mei 2026

| ID | Severity | Area | Status | Owner | Summary |
| --- | --- | --- | --- | --- | --- |
| QA-BUG-001 | High | Backend Materials | Fixed | Backend | `Material` model tidak punya field `file_size`, sementara schema, CRUD, dan frontend membaca field itu. |
| QA-BUG-002 | High | Frontend Quiz | Open | Frontend | Halaman start quiz masih memakai pertanyaan statis, belum mengambil questions dari backend session. |
| QA-BUG-003 | Medium | Backend API | Open | Backend | Endpoint generate quiz punya dua pola path: `/materials/{id}/quizzes` dan `/quizzes/materials/{id}/quizzes`. |
| QA-BUG-004 | Medium | Backend Jobs | Open | Backend | Flow ingestion dan quiz generation memakai FastAPI `BackgroundTasks`, belum Celery walaupun Redis/Celery tersedia. |
| QA-BUG-005 | Medium | Frontend Analytics | Open | Frontend | Statistik quiz seperti avg score, best score, accuracy masih placeholder. |
| QA-BUG-006 | Low | Docs | Open | All | Dokumentasi lama di `qa/QA.md` dan beberapa README belum sinkron dengan kondisi backend/AI sekarang. |
| QA-BUG-007 | High | QA/Dependencies | Fixed | Backend/DevOps | `backend/uv.lock` gagal diparse oleh uv sehingga `uv run pytest` belum bisa berjalan. |
| QA-BUG-008 | High | QA/Tests | Fixed | QA | `backend/tests/conftest.py` corrupt sehingga pytest gagal import dengan `IndentationError`. |
| QA-BUG-009 | Medium | QA/Smoke Contract | Fixed | QA | Smoke test dan latency probe masih mengharapkan endpoint stale `/api/v1/auth/google/auth`. |
| QA-BUG-010 | Medium | QA/Coverage | Fixed | QA | Belum ada automated backend gate untuk MVP happy path dari auth sampai quiz result. |
| QA-BUG-011 | Medium | QA/E2E | Fixed | QA | Belum ada frontend smoke E2E untuk redirect auth dan dashboard authenticated shell. |

## Detail

### QA-BUG-001 - Material `file_size` mismatch

- Steps: jalankan upload material atau list material dengan response schema `MaterialResponse`.
- Expected: response punya `file_size` dengan nilai integer/null.
- Actual: model `backend/app/models/material.py` tidak mendefinisikan `file_size`, tetapi schema `backend/app/schemas/material.py` dan CRUD mengharapkannya.
- Evidence: test `backend/tests/test_auth_projects_materials.py::test_material_upload_to_owned_project` ditandai `xfail`.

### QA-BUG-002 - Start quiz masih statis

- Steps: buka route `/dashboard/quizzes/start/$uuid`.
- Expected: frontend membuat/ambil quiz session dan load questions dari backend.
- Actual: route memakai hardcoded question/options.

### QA-BUG-003 - Endpoint generate quiz dobel

- Steps: cek router `materials.py` dan `quiz.py`.
- Expected: hanya satu contract canonical untuk generate quiz.
- Actual: ada path yang mirip dengan response/behavior berbeda.

### QA-BUG-004 - Celery belum menjadi execution path utama

- Steps: cek upload material dan generate quiz.
- Expected: heavy AI work masuk queue worker.
- Actual: endpoint memakai `BackgroundTasks`.

### QA-BUG-005 - Quiz analytics placeholder

- Steps: buka `/dashboard/quizzes`.
- Expected: avg score, best score, accuracy dihitung dari API/session.
- Actual: beberapa nilai masih `N/A` atau static.

### QA-BUG-006 - Dokumentasi stale

- Steps: bandingkan `qa/QA.md` dengan codebase sekarang.
- Expected: dokumen QA mencerminkan backend saat ini.
- Actual: beberapa bagian masih menyatakan AI/quiz belum tersedia.

### QA-BUG-007 - `uv.lock` invalid

- Steps: jalankan `cd backend && uv run pytest` atau `uv lock`.
- Expected: uv bisa resolve environment dan menjalankan pytest.
- Actual: uv gagal dengan pesan `Dependency authlib has missing source field but has more than one matching package`.
- Impact: QA automated test suite belum bisa dieksekusi melalui command resmi `uv run pytest`.
- Resolution: `backend/uv.lock` diregenerasi, backend dipin ke Python 3.12, dan dependency AI berat dipisahkan dari default install. Test command saat ini: `cd backend && uv run --extra dev --extra celery pytest`.

### QA-BUG-008 - Pytest fixture corrupt

- Steps: jalankan `cd backend && uv run --extra dev pytest`.
- Expected: test suite collect dan berjalan.
- Actual: pytest gagal import `backend/tests/conftest.py` dengan `IndentationError`.
- Resolution: `conftest.py` dibersihkan menjadi satu fixture setup SQLite in-memory, override DB dependency, auth headers, project, material, dan quiz.
- Evidence: `cd backend && uv run --extra dev --extra celery pytest` -> `79 passed`.

### QA-BUG-009 - Smoke contract masih memakai endpoint Google auth lama

- Steps: jalankan smoke test atau latency probe default.
- Expected: hanya endpoint backend aktual yang dicek.
- Actual: `/api/v1/auth/google/auth` sudah tidak ada dan menghasilkan `404`.
- Resolution: smoke test diganti ke `/api/v1/auth/signin`, dan default latency probe menghapus endpoint stale tersebut.
- Evidence: latency probe default 10 sample -> error rate `0.0` untuk semua endpoint default.

### QA-BUG-010 - MVP happy path belum ter-cover otomatis

- Steps: cek backend tests sebelum gate terbaru.
- Expected: ada satu automated scenario yang menjalankan kontrak MVP dari auth/signin sampai quiz result.
- Actual: coverage masih terpisah per endpoint, belum membuktikan flow belajar penuh.
- Resolution: tambah `backend/tests/test_mvp_happy_path.py`.
- Evidence: `cd backend && uv run --extra dev --extra celery pytest` -> `79 passed`.

### QA-BUG-011 - Frontend smoke E2E belum tersedia

- Steps: cek frontend test command sebelum gate terbaru.
- Expected: ada Playwright smoke untuk auth redirect dan dashboard authenticated shell.
- Actual: belum ada `npm run test:e2e`.
- Resolution: tambah Playwright config, `test:e2e` script, dan `fe/tests/e2e/dashboard-smoke.spec.ts`.
- Evidence: `cd fe && npm run test:e2e` -> `2 passed`; `cd fe && npm run build` -> pass.
