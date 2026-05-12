3.3. Farisbay (AI/RAG Specialist) - Tugas Granular
Hari 1: Penyiapan Lingkungan AI & Vector DB (5 Mei)

• Siapkan lingkungan virtual Python di apps/backend dan instal pustaka yang diperlukan (cth: langchain, qdrant-client, openai, pypdf).
• Inisialisasi klien Qdrant (instans lokal atau cloud) di apps/backend/app/vector_db.
• Definisikan tanda tangan fungsi ingest_material.
• Hasil: Lingkungan Python AI siap, klien Qdrant diinisialisasi.

Hari 2: Arsitektur RAG & Embedding (6 Mei)

• Pilih dan integrasikan model embedding (cth: OpenAI Embeddings, Sentence Transformers) di apps/backend/app/agents.
• Implementasikan strategi chunking teks untuk berbagai jenis dokumen (PDF, TXT).
• Kembangkan logika untuk menghasilkan embedding untuk chunk teks.
• Hasil: Fungsi untuk chunking teks dan pembuatan embedding siap.

Hari 3: Agen Ingestion (7 Mei)

• Implementasikan fungsi ingest_material(material_id, file_path, file_type) di apps/backend/app/agents. Fungsi ini akan memuat dokumen, memecahnya, menghasilkan embedding, dan menyimpannya di Qdrant.
• Hasil: Agen Ingestion berfungsi penuh yang memproses materi dan mengisi Vector DB.

Hari 4: Agen Sintesis (Ringkasan & Ekstraksi) (8 Mei)

• Implementasikan fungsi generate_summary(material_id) di apps/backend/app/agents. Gunakan RAG: Ambil chunk yang relevan dari Qdrant berdasarkan prompt ringkasan. Panggil LLM (cth: OpenAI GPT-4) untuk menghasilkan ringkasan singkat. Implementasikan sebagai generator untuk menghasilkan token untuk streaming.
• Hasil: Agen AI yang mampu menghasilkan ringkasan streaming untuk materi.

Hari 5: Agen Kuis - Rekayasa Prompt (9 Mei)

• [PERTEMUAN SABTU]
• Implementasikan fungsi generate_mcq_quiz(quiz_id, material_id, difficulty, num_questions) di apps/backend/app/agents. Kembangkan rekayasa prompt yang kuat untuk pembuatan MCQ, termasuk instruksi untuk teks pertanyaan, opsi, jawaban yang benar, penjelasan, dan kutipan. Gunakan RAG: Ambil chunk yang relevan dari Qdrant berdasarkan prompt pembuatan kuis. Panggil LLM untuk menghasilkan pertanyaan kuis dalam format JSON terstruktur.
• Hasil: Agen AI yang menghasilkan pertanyaan MCQ terstruktur berdasarkan materi dan tingkat kesulitan.

Hari 6: Logika Kuis Adaptif & Persistensi (10 Mei)

• Perbaiki generate_mcq_quiz untuk menggabungkan parameter difficulty (cth: dengan menyesuaikan kompleksitas prompt atau memilih chunk dari bagian tertentu). Pastikan pertanyaan yang dihasilkan menyertakan bidang explanation dan citation. Integrasikan dengan model Question Hasan untuk menyimpan pertanyaan yang dihasilkan ke MySQL.
• Hasil: Agen kuis yang menghasilkan pertanyaan adaptif dan menyimpannya ke DB.

Hari 7: Agen Umpan Balik Streaming (11 Mei)

• Implementasikan fungsi generate_feedback(session_id, question_id, selected_answer: str, is_correct: bool) di apps/backend/app/agents. Gunakan RAG: Ambil chunk yang relevan dari Qdrant berdasarkan pertanyaan dan materi. Panggil LLM untuk menghasilkan umpan balik terperinci yang menjelaskan kebenaran, ketidakbenaran, dan memberikan wawasan lebih lanjut. Implementasikan sebagai generator untuk menghasilkan token untuk streaming.
• Hasil: Agen AI yang menghasilkan umpan balik streaming real-time untuk jawaban pengguna.

Hari 8: Orkes Agen & Penanganan Error (12 Mei)

• Integrasikan semua agen (ingest_material, generate_summary, generate_mcq_quiz, generate_feedback) ke dalam sistem yang kohesif di apps/backend/app/agents.
• Implementasikan penanganan error yang kuat dan mekanisme percobaan ulang untuk panggilan LLM dan operasi Vector DB.
• Hasil: Sistem agen AI yang stabil dan terintegrasi.

Hari 9: Penyempurnaan RAG (13 Mei)

• Jelajahi teknik RAG lanjutan: re-ranking chunk yang diambil, pencarian hibrida (kata kunci + vektor). Evaluasi strategi chunking yang berbeda untuk kinerja pengambilan yang optimal.
• Hasil: Peningkatan kinerja dan akurasi RAG.

Hari 10: Penyesuaian Prompt & Mitigasi Halusinasi (14 Mei)

• Lakukan penyesuaian prompt ekstensif untuk semua agen untuk mengurangi halusinasi dan meningkatkan akurasi faktual. Implementasikan guardrail atau langkah validasi untuk memastikan konten yang dihasilkan sesuai dengan persyaratan (cth: jumlah opsi yang benar, kutipan yang valid).
• Hasil: Agen AI yang sangat akurat dan andal.

Hari 11: Pengujian Agen Akhir (15 Mei)

• Lakukan pengujian komprehensif semua agen AI dengan berbagai jenis dokumen dan skenario kuis. Pastikan agen bekerja secara konsisten dalam berbagai kondisi.
• Hasil: Agen AI siap untuk deployment produksi.
