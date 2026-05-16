# QA and Observability Demo Readiness Report

Tanggal: 16 Mei 2026

Owner perspektif: QA / Observability

## Tujuan

Dokumen ini merangkum scope QA yang harus divalidasi sebelum demo, serta observability yang wajib muncul di Langfuse supaya proses AI agent bisa diaudit end-to-end.

Target utama:

- alur produk utama berjalan tanpa crash;
- setiap pipeline AI penting bisa dilacak di Langfuse;
- error bisa dilihat sebagai trace gagal, bukan hanya log aplikasi;
- metadata trace cukup kaya untuk debugging cepat;
- environment lokal, QA, dan prod konsisten secara contract.

## Status Singkat

As of 16 Mei 2026:

- backend smoke runtime pass;
- frontend dashboard smoke pass;
- chat agent trace sudah terlihat di Langfuse;
- material ingestion trace sudah terlihat di Langfuse;
- quiz generation trace sudah terlihat di Langfuse;
- feedback generation sudah diinstrumentasi;
- adaptive quiz sudah diinstrumentasi;
- batching embedding sudah ditambahkan agar request besar tidak mentok limit input;
- report QA dan runbook sudah disiapkan untuk handoff tim.

## Flow Yang Wajib Di-Trace

### 1. Material ingestion

Tujuan:

- membuktikan upload file, parsing, summarization, chunking, dan embedding benar-benar selesai;
- menangkap failure di tahap ingest tanpa merusak request utama.

Trace name:

```text
material-ingestion
```

Span yang diharapkan:

- `load-material-record`
- `update-material-status-processing`
- `parse-document`
- `summarize-material`
- `chunk-document`
- `store-embeddings`
- `update-material-status-completed`

Metadata yang harus searchable:

- `service`
- `pipeline`
- `environment`
- `user_id`
- `project_id`
- `material_id`
- `file_type`

### 2. Quiz generation

Tujuan:

- membuktikan quiz dibangun dari material yang benar;
- menangkap retrival context, summarization, dan generation per topic;
- memastikan jumlah question tidak melebihi request.

Trace name:

```text
quiz-generation
```

Span yang diharapkan:

- `update-quiz-status-processing`
- `generate-topics`
- `topic-loop`
- `retrieve-related-chunks`
- `build-complete-summary`
- `generate-question`
- `persist-questions`
- `update-quiz-status-completed`

Metadata yang harus searchable:

- `service`
- `pipeline`
- `environment`
- `user_id`
- `project_id`
- `material_id`
- `quiz_id`
- `difficulty`
- `question_count_requested`

### 3. Feedback generation

Tujuan:

- membuktikan feedback muncul setelah answer submit;
- melacak konteks question/session dan hasil correctness;
- memastikan stream dan sync path sama-sama terekam.

Trace name:

```text
feedback-generation
```

Span yang diharapkan:

- `retrieve-feedback-context`
- `feedback-generation`
- `feedback-generation-stream`

Metadata yang harus searchable:

- `service`
- `pipeline`
- `environment`
- `user_id`
- `quiz_id`
- `session_id`
- `question_id`
- `is_correct`
- `mode`

### 4. Chatbot agent

Tujuan:

- membuktikan proses agent chat bisa diaudit dari awal sampai response final;
- merekam context loading, prompt build, tool call, dan persist message;
- memastikan Langfuse menangkap proses agent secara granular, bukan hanya satu log entry.

Trace name:

```text
chatbot-agent
```

Span yang diharapkan:

- `load-chat-session`
- `load-chat-history`
- `build-system-prompt`
- `prepare-chat-input`
- `run-agent-stream`
- `persist-user-message`
- `persist-tool-message`
- `persist-assistant-message`
- tool spans seperti `tool-call:get_context`

Metadata yang harus searchable:

- `service`
- `pipeline`
- `environment`
- `user_id`
- `session_id`
- `project_id`
- `material_id`
- `quiz_id`
- `attached_material_count`
- `history_count`
- `mode`

### 5. Adaptive quiz

Tujuan:

- membuktikan retrieval, summary build, dan question generation adaptive tetap terlihat;
- memastikan pipeline agent ini konsisten dengan metadata standar observability.

Trace name:

```text
generate_adaptive_quiz
```

Span yang diharapkan:

- retrieval span
- summary build span
- generation span

Metadata yang harus searchable:

- `service`
- `pipeline`
- `environment`
- `user_id`
- `project_id`
- `material_id`
- `quiz_id`
- `difficulty`

## Kenapa Langfuse Penting Untuk QA

Langfuse dipakai untuk menjawab pertanyaan QA yang tidak bisa dijawab dari log biasa:

- step mana yang gagal;
- LLM mana yang dipanggil;
- berapa latency per step;
- apakah tool dipanggil terlalu sering;
- apakah context terlalu besar;
- apakah request input meledak sebelum masuk model;
- apakah trace gagal punya error yang jelas dan searchable.

Kalau trace tidak ada, QA hanya melihat symptom. Kalau trace ada, QA bisa lihat root cause.

## Bukti Yang Sudah Ada

### Automated evidence

- backend smoke runtime pass;
- frontend smoke E2E pass;
- backend regression test untuk observability dan guardrail sudah ada;
- test suite backend sudah mencapai state stabil pada jalur observability yang sudah ditambahkan.

### Manual evidence

- trace `chatbot-agent` sudah terlihat di portal Langfuse;
- trace `material-ingestion` sudah terlihat di portal Langfuse;
- trace `quiz-generation` sudah terlihat di portal Langfuse;
- span tree dan metadata searchable sudah terbaca di trace detail;
- failure ingestion akibat limit input embedding sempat muncul dan berhasil dijadikan debugging evidence.

## Hal Yang Harus Dicek Saat Demo Readiness

1. Upload 1 material kecil.
2. Pastikan ingestion `completed`.
3. Generate quiz dari material itu.
4. Pastikan quiz `completed`.
5. Jalankan chat di dashboard.
6. Pastikan trace `chatbot-agent` muncul di Langfuse.
7. Start quiz session dan submit jawaban.
8. Pastikan trace `feedback-generation` muncul di Langfuse.
9. Jalankan satu scenario gagal yang terkontrol.
10. Pastikan trace gagal terlihat dengan status `failed`.

## Risiko Yang Masih Perlu Dijaga

- UI quiz start masih punya area yang perlu disinkronkan dengan backend session flow;
- ada endpoint/flow lama yang belum semuanya disederhanakan;
- jika environment Langfuse salah, trace bisa muncul di environment lain sehingga terlihat seperti tidak terdeteksi;
- request AI besar harus dibatasi agar tidak kena limit input;
- agent tracing internal harus tetap tidak bentrok dengan manual trace utama.

## Rekomendasi QA Final Sebelum Push

- validasi `chatbot-agent` di local dev;
- validasi `feedback-generation` di Langfuse portal;
- jalankan smoke runtime lokal;
- jalankan smoke frontend lokal;
- capture satu trace sukses dan satu trace gagal;
- catat environment yang dipakai saat testing;
- pastikan branch yang dipush membawa perubahan observability dan guardrail.

## Status Siap Demo

Status saat ini dapat dianggap mendekati demo-ready untuk jalur observability AI utama karena:

- trace utama sudah ada;
- metadata searchable sudah ada;
- test smoke backend dan frontend sudah pass;
- failure handling untuk ingestion sudah terlihat dan diperbaiki;
- Langfuse bisa dipakai untuk audit proses agent chat secara granular.

Yang masih perlu dijaga sebelum sign-off final adalah evidence manual `feedback-generation` dan verifikasi di environment deploy target setelah push.
