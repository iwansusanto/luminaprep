# QA Final Testing Schema

Tanggal: 16 Mei 2026

Owner: QA & Observability

Scope: skema final testing LuminaPrep setelah fitur dianggap siap diuji. Dokumen ini adalah blueprint QA, bukan hasil eksekusi final.

## Tujuan

Final testing harus membuktikan:

- aplikasi bisa dijalankan konsisten di environment QA;
- FE-BE integration berjalan tanpa proxy/auth mismatch;
- flow utama user bisa selesai dari login sampai quiz result;
- AI pipeline ingestion, summary, quiz generation, feedback, dan chatbot berjalan atau gagal dengan status yang jelas;
- observability Langfuse bisa membantu QA menemukan trace sukses/gagal;
- bug blocker tercatat dengan evidence dan status retest.

## Test Phases

| Phase | Nama | Tujuan | Status Untuk Mulai |
| --- | --- | --- | --- |
| P0 | Runtime Smoke | Service hidup dan saling connect | Backend/FE env tersedia |
| P1 | Auth & Session | Login, cookie, JWT, session stable | P0 pass |
| P2 | Project & Material | CRUD project, upload/list/delete material | P1 pass |
| P3 | AI Ingestion | Parse, summarize, chunk, vector store | P2 pass |
| P4 | Quiz Generation | Generate quiz dari material completed | P3 pass |
| P5 | Quiz Taking | Start session, answer, complete, result | P4 pass |
| P6 | Chatbot & Feedback | Feedback stream dan chatbot context | P5 pass |
| P7 | Observability | Langfuse trace dan token/cost visible | P3-P6 berjalan |
| P8 | Regression & Reliability | Negative/security/retry cases | happy path pass |
| P9 | Deployment Smoke | Docker/full-stack parity | env deployment siap |

## Entry Criteria

Final testing boleh dimulai jika:

- branch testing sudah sinkron dengan `origin/main` terbaru atau branch release yang disepakati;
- instruksi runtime dipilih: local/hybrid atau full Docker;
- backend `/health` return `200` dan database `connected`;
- FE `/` return `200`;
- FE proxy `/api/v1/auth/me` return `401` tanpa token, bukan `504`;
- test account atau Google OAuth test flow tersedia;
- OpenAI/API key test tersedia jika AI real flow diuji;
- Langfuse key tersedia jika observability validation masuk scope.

## Exit Criteria

Final testing dianggap selesai jika:

- semua P0-P6 happy path pass;
- P7 Langfuse minimal pass untuk ingestion, quiz generation, feedback, dan chatbot jika fitur chatbot masuk release;
- tidak ada blocker severity Critical/High open;
- semua Medium bug punya owner dan keputusan release;
- final report, bug register, dan evidence trace/screenshot tersimpan di `qa/`;
- go/no-go decision terdokumentasi.

## Environment Matrix

| Environment | Tujuan | Wajib Diuji |
| --- | --- | --- |
| Local/Hybrid | Debug cepat QA | P0-P6 |
| Full Docker | Parity tim/devops | P0, P1, P2, P9 |
| Remote/Staging | Release candidate | P0-P9 |

## Runtime Gate

Jangan lanjut ke test fitur sebelum gate ini pass:

| Gate | Command | Expected |
| --- | --- | --- |
| Backend root | `curl -i http://localhost:8000/` | `200` |
| Backend health | `curl -i http://localhost:8000/health` | `200`, DB connected |
| Backend auth protected | `curl -i http://localhost:8000/api/v1/auth/me` | `401` tanpa token |
| FE root | `curl -i http://localhost:3000/` | `200` |
| FE proxy | `curl -i http://localhost:3000/api/v1/auth/me` | `401`, bukan `504` |
| Latency probe | `python3 qa/observability/templates/latency_probe.py --base-url http://localhost:8000 --samples 3` | expected status terpenuhi |

## Feature Test Matrix

### Auth & Session

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| AUTH-001 | Unauthenticated user rejected | Open dashboard protected route | Redirect/login required |
| AUTH-002 | Login success | Login via FE flow | backend `/auth/signin` `200`, `/auth/me` `200` |
| AUTH-003 | Session persistence | Refresh dashboard | user remains authenticated |
| AUTH-004 | Logout | Click sign out | session cleared, protected route blocked |
| AUTH-005 | Invalid token | Call protected API with bad token | `401` |

### Project

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| PRJ-001 | Create first project | Submit onboarding/project form | project created and visible |
| PRJ-002 | List projects | Refresh dashboard | project list persists |
| PRJ-003 | Update project | Edit project if UI/API available | update persists |
| PRJ-004 | Ownership isolation | Access another user's project | `404` or `403` |

### Material

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| MAT-001 | Upload TXT valid | Upload small `.txt` | material row created |
| MAT-002 | Upload PDF valid | Upload small `.pdf` | material row created |
| MAT-003 | Material processing | Wait/poll list | status goes `processing -> completed` |
| MAT-004 | Invalid file | Upload unsupported/broken file | rejected or status `failed` |
| MAT-005 | Oversized file | Upload above max size | `413` or validation error |
| MAT-006 | Delete material | Delete material from UI | material removed from list |

### AI Ingestion

| ID | Scenario | Expected Evidence |
| --- | --- | --- |
| ING-001 | Parse document | page count > 0, no parser error |
| ING-002 | Summarize document | summary non-empty or controlled empty summary |
| ING-003 | Chunk document | chunk count > 0 |
| ING-004 | Store embeddings | vector store success |
| ING-005 | Ingestion failure | material status `failed`, error captured |

### Quiz Generation

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| QG-001 | Generate quiz 3 questions | From completed material | request accepted, quiz `processing` |
| QG-002 | Quiz completes | Poll status | quiz `completed`, questions > 0 |
| QG-003 | Custom topic/request | Generate with topic/custom prompt | metadata saved, questions relevant enough |
| QG-004 | LLM JSON invalid | Mock/force invalid response if possible | quiz `failed`, no partial corrupt data |
| QG-005 | Empty retrieval | Force no chunks if possible | clear failed status/error |

### Quiz Taking

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| QT-001 | Start quiz | Open start quiz | session created |
| QT-002 | Load questions | Start/continue page | questions loaded from backend |
| QT-003 | Submit answer | Select answer and submit | attempt saved |
| QT-004 | Feedback | Request/stream feedback | feedback visible or controlled fallback |
| QT-005 | Complete session | Finish quiz | session `completed`, result page visible |
| QT-006 | Retake quiz | Retake from result/list | new session created |

### Chatbot

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| CHAT-001 | Open chatbot | Click assistant | panel/page opens |
| CHAT-002 | Send generic message | Ask simple question | streamed/non-streamed response returns |
| CHAT-003 | Attach material | Attach completed material | answer references material context |
| CHAT-004 | Session history | Refresh/select old session | messages persist |
| CHAT-005 | Delete session | Delete chat session | session removed |

### Frontend Buttons & Navigation

| ID | Area | Buttons/Actions | Expected |
| --- | --- | --- | --- |
| BTN-001 | Sidebar | Dashboard, Materials, Quizzes, AI Assistant | navigate correctly |
| BTN-002 | Sidebar | Upgrade | opens coming soon modal or planned action |
| BTN-003 | Header | Add material | opens upload modal unless quota reached |
| BTN-004 | Materials | View summary | disabled unless completed+summary |
| BTN-005 | Materials | Generate quiz | disabled unless completed |
| BTN-006 | Materials | Delete | deletes or shows confirmation/result |
| BTN-007 | Quizzes | Start/Continue/Retake/View result | navigates and loads backend data |
| BTN-008 | Chatbot | New chat, send, attach, delete session | works or shows controlled error |
| BTN-009 | Landing/Login | CTA, Google login, policies | navigate or execute expected action |

If a button intentionally does nothing, it must show disabled state, tooltip, coming soon modal, or be removed from release UI.

## Langfuse Final Validation

Langfuse validation is pass only if QA can search and inspect trace evidence.

### Required Env

```env
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://langprep.luminaprep.my.id
LANGFUSE_ENVIRONMENT=qa
```

### Required Traces

| Trace | Trigger | Required Metadata | Required Spans/Generation |
| --- | --- | --- | --- |
| `material-ingestion` | upload material | `user_id`, `project_id`, `material_id`, `file_name` | parse, summarize, chunk, store embeddings |
| `quiz-generation` | generate quiz | `user_id`, `project_id`, `material_id`, `quiz_id` | generate topics, retrieval, generate question, persist |
| `feedback-generation` | submit answer/feedback | `user_id`, `quiz_id`, `session_id`, `question_id` | retrieve context, generate feedback |
| `chatbot-agent` | send chat | `user_id`, `project_id`, `session_id` | load context, run agent/LLM, persist message |

### Langfuse Evidence Checklist

For each trace:

- trace appears in Langfuse dashboard;
- trace has correct environment `qa`;
- trace has searchable entity metadata;
- LLM generation has clear `name`;
- token usage is visible;
- latency is visible;
- error trace appears when failure is forced;
- prompt/output size is acceptable and does not expose unnecessary sensitive data.

### Langfuse Failure Scenarios

| ID | Failure | Expected |
| --- | --- | --- |
| LF-FAIL-001 | Langfuse disabled | app still works, no trace sent |
| LF-FAIL-002 | Langfuse key missing | app starts, tracing no-op |
| LF-FAIL-003 | LLM error | trace status failed/error visible |
| LF-FAIL-004 | Invalid JSON from LLM | quiz trace shows validation/retry/failure |
| LF-FAIL-005 | Vector retrieval empty | trace shows empty chunk/retrieval count |

## Performance Thresholds

Initial QA thresholds:

| Metric | Threshold |
| --- | --- |
| `/health` p95 | `< 300ms` local, `< 1000ms` remote |
| protected API rejection p95 | `< 1000ms` |
| material upload p95 | `< 5000ms` for small files |
| quiz generation | no hard threshold yet, record duration |
| chatbot first token | record only until baseline exists |
| error rate | `0%` for expected statuses |

## Severity Rules

| Severity | Definition |
| --- | --- |
| Critical | App cannot start, login impossible, data loss, security breach |
| High | Main MVP flow blocked: upload, generate quiz, take quiz, result |
| Medium | Important workflow degraded but workaround exists |
| Low | Cosmetic, stale docs, unclear copy, non-blocking UX issue |

## Final Report Structure

Use `qa/templates/QA_FINAL_REPORT_TEMPLATE.md` for execution report.

Minimum final report sections:

- environment and commit tested;
- summary go/no-go;
- phase result table;
- failed scenarios;
- Langfuse trace evidence;
- performance summary;
- open bug list;
- release recommendation.

## Deliverables

Final QA handoff should include:

- `qa/QA_FINAL_TEST_REPORT_<date>.md`;
- updated `qa/bug-register.md`;
- latest `qa/observability/reports/latency-report.json`;
- Langfuse dashboard screenshots or trace links;
- notes for Docker/local runtime differences;
- go/no-go decision.

