3.2. Hasan (Backend Lead) - Tugas Granular
Hari 1: Penyiapan Proyek Backend & Basis Data (5 Mei) ✅ COMPLETED
 
• Inisialisasi proyek FastAPI dengan uvicorn di backend/ ✅
• Siapkan koneksi basis data MySQL menggunakan SQLAlchemy dan SQLModel. ✅
• Definisikan model User dan Project awal di SQLModel. ✅
• Konfigurasi Alembic untuk migrasi basis data. Jalankan migrasi awal. ✅
• Hasil: Aplikasi FastAPI berjalan, terhubung ke MySQL, tabel users dan projects dibuat. ✅
 
Hari 2: API Otentikasi (6 Mei) ✅ COMPLETED
 
• Implementasikan model User dengan hashing kata sandi (cth: passlib). ✅
• Buat endpoint otentikasi: POST /api/v1/auth/signin (OAuth-style). ✅
• Hasilkan dan kembalikan token akses JWT setelah login/registrasi berhasil. ✅
• Implementasikan dependensi JWT untuk rute yang dilindungi (GET /api/v1/auth/me). ✅
• Hasil: API otentikasi berfungsi penuh dengan pembuatan dan validasi token JWT. ✅
• BONUS: Implementasi soft delete untuk semua model dan filtering otomatis. ✅
 
Hari 3: API Manajemen Materi (7 Mei) ✅ COMPLETED
 
• Definisikan model Material di SQLModel (mereferensikan Project dan User). ✅
• Implementasikan endpoint unggah file: POST /api/v1/projects/{project_id}/materials/upload. ✅
• Simpan file yang diunggah (cth: di direktori uploads lokal atau integrasikan dengan S3 jika waktu memungkinkan). ✅
• Simpan metadata materi (nama file, path, tipe, status) ke tabel materials. ✅
• Hasil: API untuk mengunggah file dan menyimpan metadatanya di basis data. ✅
• BONUS: Tambah endpoint POST /api/v1/materials untuk testing AI quiz generation. ✅
 
Hari 4: Celery & Integrasi Agen AI (8 Mei) ✅ PARTIALLY COMPLETED
 
• Siapkan Celery dengan Redis sebagai broker pesan. 🔄 (From remote team)
• Buat tugas Celery process_material yang menerima material_id. 🔄 (From remote team)
• Modifikasi POST /api/v1/projects/{project_id}/materials/upload untuk mengantrekan tugas process_material setelah menyimpan metadata. 🔄 (From remote team)
• Implementasikan pelacakan status tugas dasar (perbarui materials.status di DB ke processing, processed atau failed). 🔄 (From remote team)
• Hasil: Celery worker berjalan, backend mengantrekan tugas pemrosesan materi. 🔄 (From remote team)
• ✅ AI Question Generator Integration: 
  - Pull AI agent dari remote (mcq_quiz.py, summarization.py, ingestions.py)
  - Install dependencies: chonkie, chromadb, openai
  - Setup OpenAI API key environment variables
  - Integrate AI question generator ke quiz endpoint
  - Test AI quiz generation flow
 
Hari 5: API Proyek & Kuis (9 Mei) ✅ COMPLETED
 
• [PERTEMUAN SABTU]
• Implementasikan API CRUD Proyek: POST /api/v1/projects, GET /api/v1/projects, GET /api/v1/projects/{project_id}, DELETE /api/v1/projects/{project_id}. ✅
• Definisikan model Quiz dan Question di SQLModel. Pastikan model Quiz mereferensikan Material (melalui material_id) dan model Question menyertakan metadata serta updated_at sesuai skema final. ✅
• Implementasikan POST /api/v1/materials/{material_id}/quizzes untuk membuat entri kuis dan mengantrekan tugas Celery generate_quiz. ✅
• Hasil: API manajemen proyek dan API pembuatan kuis (memicu agen AI). berfungsi. ✅
• BONUS: AI Question Generator Integration - Generate questions using AI agent from remote team. ✅
 
Hari 6: API Manajemen Sesi Kuis (10 Mei) ✅ COMPLETED
 
• Definisikan model QuizSession dan UserAnswer di SQLModel.Pastikan UserAnswer menggunakan feedback_text. ✅
• Implementasikan POST /api/v1/quizzes/{quiz_id}/sessions untuk memulai sesi kuis baru. ✅
• Implementasikan POST /api/v1/quiz_sessions/{session_id}/submit_answer untuk mencatat jawaban pengguna. ✅
• Implementasikan POST /api/v1/quiz_sessions/{session_id}/complete untuk menyelesaikan sesi dan menghitung skor. ✅
• Hasil: API untuk mengelola sesi kuis dan mencatat jawaban pengguna. ✅
• ✅ IMPLEMENTATION COMPLETE:
  - QuizSession model dengan relationships
  - UserAttempt model dengan quiz_session_id field
  - Complete CRUD operations untuk quiz sessions
  - Answer submission dengan automatic scoring
  - Session completion dengan final score calculation
  - Database migration untuk quiz_sessions table
 
Hari 7: Streaming Respons LLM (11 Mei)
 
• Implementasikan endpoint Server-Sent Events (SSE): GET /api/v1/stream/feedback/{session_id}/{question_id} dan GET /api/v1/stream/summary/{material_id}.
• Endpoint ini akan menerima generator token dari agen AI Farisbay dan mengalirkannya ke frontend.
• Pastikan header Content-Type: text/event-stream dan format event yang benar.
• Hasil: Endpoint SSE Backend yang mampu mengalirkan respons AI.
 
Hari 8: API Riwayat & Analitik (12 Mei)
 
• Implementasikan GET /api/v1/projects/{project_id}/materials untuk menyertakan ringkasan dan status kuis.
• Implementasikan GET /api/v1/quiz_sessions/{session_id} untuk mengambil detail sesi kuis lengkap termasuk jawaban pengguna dan umpan balik.
• Hasil: API yang menyediakan data komprehensif untuk dashboard pengguna dan riwayat kuis.
 
Hari 9: Optimasi API & Keamanan (13 Mei)
 
• Implementasikan mekanisme caching dasar untuk data yang sering diakses (cth: daftar proyek).
• Tambahkan pembatasan laju (rate limiting) ke otentikasi dan endpoint penting.
• Konfigurasi kebijakan CORS untuk akses frontend.
• Hasil: API backend yang lebih kuat dan aman.
 
Hari 10: Penanganan Error & Logging (14 Mei)
 
• Implementasikan penanganan error yang komprehensif untuk semua endpoint API.
• Integrasikan logging terstruktur (cth: loguru) untuk debugging dan pemantauan.
• Tinjau dan perbaiki semua dokumentasi API (FastAPI secara otomatis menghasilkan spesifikasi OpenAPI).
• Hasil: Backend siap produksi dengan penanganan error dan logging yang kuat.
 
Hari 11: Persiapan Deployment (15 Mei)
 
• Containerisasi aplikasi FastAPI menggunakan Docker.
• Siapkan Dockerfile dan docker-compose.yml untuk lingkungan lokal dan produksi.
• Pastikan semua variabel lingkungan dikonfigurasi dengan benar untuk deployment (koneksi DB, Redis, S3, dll.).
Hasil: Backend siap untuk deployment tercontainerisasi.
