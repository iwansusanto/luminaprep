import json
import random
from app.utils.oa_client import oa_client
from pydantic import BaseModel
from app.vector_db.collections import chromadb_collections


class MCQQuestion(BaseModel):
    question: str
    correct_answer: str
    options: dict
    explanation: str


class MCQQuizAgent:
    def __init__(self):
        self.client = oa_client
        self.collection = chromadb_collections()

    def generate_topics(
        self, num_questions: int, summary: str, difficulty: str
    ) -> list[str]:
        user_prompt = f"""
        Berikut adalah ringkasan materi yang telah dibuat:
        {summary}

        Buatlah {num_questions} topik yang relevan dengan ringkasan tersebut untuk membuat soal pilihan ganda dengan tingkat kesulitan {difficulty}. Topik-topik tersebut harus mencakup aspek-aspek penting dari ringkasan yang dapat dijadikan dasar untuk pertanyaan pilihan ganda. Pastikan topik yang dihasilkan dapat digunakan untuk membuat soal pilihan ganda yang menantang dan sesuai dengan tingkat kesulitan yang ditentukan.
        """

        response = self.client.chat.completions.create(
            model="deepseek/deepseek-v4-flash",
            messages=[
                {
                    "role": "system",
                    "content": "Tuliskan topik sesuai dengan ringkasan berikut untuk membuat soal pilihan ganda. Topik harus relevan dengan isi ringkasan dan mencakup aspek-aspek penting yang dapat dijadikan dasar untuk pertanyaan. Pastikan topik yang dihasilkan dapat digunakan untuk membuat soal pilihan ganda yang menantang dan sesuai dengan tingkat kesulitan yang ditentukan.",
                },
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
        )

        topics = response.choices[0].message.content

        if topics is None:
            return []

        return [topic.strip() for topic in topics.split("\n") if topic.strip()]

    def get_related_chunks(self, topic: str) -> list[str]:
        results = self.collection.query(query_texts=[topic], n_results=5)
        return [item for sublist in results["documents"] for item in sublist]

    def build_complete_summary(self, chunks: list[str]) -> str:
        combined_chunks = "\n\n".join(chunks)

        user_prompt = f"""
        Berikut adalah potongan-potongan informasi yang relevan:
        {combined_chunks}

        Buatlah ringkasan lengkap dan komprehensif dari potongan-potongan informasi di atas. Ringkasan harus mencakup semua informasi penting dan detail yang dapat digunakan untuk membuat soal pilihan ganda.
        """

        response = self.client.chat.completions.create(
            model="deepseek/deepseek-v4-flash",
            messages=[
                {
                    "role": "system",
                    "content": "Buatlah ringkasan lengkap dan detail dari informasi yang diberikan. Fokus pada fakta-fakta penting yang dapat dijadikan dasar pertanyaan pilihan ganda.",
                },
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )

        return response.choices[0].message.content or ""

    def generate_question(
        self, summary: str, difficulty: str, max_retries: int = 3
    ) -> MCQQuestion | None:
        user_prompt = f"""
        Berikut adalah ringkasan materi:
        {summary}

        Buatlah satu soal pilihan ganda dengan tingkat kesulitan {difficulty}. 
        Berikan pertanyaan, jawaban yang benar, 3 pilihan jawaban yang salah (distractor), dan penjelasan mengapa jawaban tersebut benar.

        Format respons HARUS dalam JSON dengan struktur berikut:
        {{
            "question": "pertanyaan di sini",
            "correct_answer": "jawaban yang benar di sini",
            "distractors": ["pilihan salah 1", "pilihan salah 2", "pilihan salah 3"],
            "explanation": "penjelasan mengapa jawaban benar di sini"
        }}

        Pastikan semua pilihan jawaban masuk akal dan relevan dengan materi.
        """

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model="deepseek/deepseek-v4-flash",
                    messages=[
                        {
                            "role": "system",
                            "content": "Buatlah soal pilihan ganda dalam format JSON. Pastikan respons hanya berisi JSON valid tanpa teks tambahan.",
                        },
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.7,
                )

                content = response.choices[0].message.content
                if content is None:
                    continue

                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                data = json.loads(content)

                options = data["distractors"] + [data["correct_answer"]]
                random.shuffle(options)

                return MCQQuestion(
                    question=data["question"],
                    correct_answer=data["correct_answer"],
                    options=options,
                    explanation=data["explanation"],
                )
            except (json.JSONDecodeError, KeyError, TypeError):
                if attempt == max_retries - 1:
                    return None
                continue

        return None

    def generate_quiz(
        self, num_questions: int, summary: str, difficulty: str
    ) -> list[MCQQuestion]:
        topics = self.generate_topics(num_questions, summary, difficulty)

        if not topics:
            return []

        questions = []

        for topic in topics:
            try:
                chunks = self.get_related_chunks(topic)

                if not chunks:
                    continue

                complete_summary = self.build_complete_summary(chunks)

                if not complete_summary:
                    continue

                question = self.generate_question(complete_summary, difficulty)

                if question:
                    questions.append(question)
            except Exception:
                continue

        return questions
