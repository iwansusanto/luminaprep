import asyncio
import json
import random
from app.celery_app import celery_app
from app.database import SessionLocal
from app.crud.quiz import update_quiz_status
from app.crud.question import create_question
from app.utils.oa_client import oa_client
from app.vector_db.collections import chromadb_collections
from pydantic import BaseModel


class MCQQuestion(BaseModel):
    question: str
    correct_answer: str
    options: dict
    explanation: str


def generate_topics(num_questions: int, summary: str, difficulty: str) -> list[str]:
    user_prompt = f"""
    Berikut adalah ringkasan materi yang telah dibuat:
    {summary}

    Buatlah {num_questions} topik yang relevan dengan ringkasan tersebut untuk membuat soal pilihan ganda dengan tingkat kesulitan {difficulty}. Topik-topik tersebut harus mencakup aspek-aspek penting dari ringkasan yang dapat dijadikan dasar untuk pertanyaan pilihan ganda. Pastikan topik yang dihasilkan dapat digunakan untuk membuat soal pilihan ganda yang menantang dan sesuai dengan tingkat kesulitan yang ditentukan.
    """
    response = oa_client.chat.completions.create(
        model="gpt-4o-mini",
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


def get_related_chunks(topic: str, collection) -> list[str]:
    results = collection.query(query_texts=[topic], n_results=5)
    return [item for sublist in results["documents"] for item in sublist]


def build_complete_summary(chunks: list[str]) -> str:
    combined_chunks = "\n\n".join(chunks)

    user_prompt = f"""
    Berikut adalah potongan-potongan informasi yang relevan:
    {combined_chunks}

    Buatlah ringkasan lengkap dan komprehensif dari potongan-potongan informasi di atas. Ringkasan harus mencakup semua informasi penting dan detail yang dapat digunakan untuk membuat soal pilihan ganda.
    """

    response = oa_client.chat.completions.create(
        model="gpt-4o-mini",
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
    summary: str, difficulty: str, max_retries: int = 3
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
            response = oa_client.chat.completions.create(
                model="gpt-4o-mini",
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


def generate_single_question_for_topic(
    topic: str, difficulty: str, collection
) -> MCQQuestion | None:
    try:
        chunks = get_related_chunks(topic, collection)
        if not chunks:
            return None

        complete_summary = build_complete_summary(chunks)
        if not complete_summary:
            return None

        return generate_question(complete_summary, difficulty)
    except Exception:
        return None


@celery_app.task(bind=True)
def generate_quiz_task(
    self, quiz_id: str, summary: str, num_questions: int, difficulty: str
):
    db = SessionLocal()
    collection = chromadb_collections()

    try:
        update_quiz_status(db, quiz_id, "processing")

        topics = generate_topics(num_questions, summary, difficulty)
        if not topics:
            update_quiz_status(db, quiz_id, "failed")
            return {"status": "failed", "error": "No topics generated"}

        questions = []
        for topic in topics:
            question = generate_single_question_for_topic(topic, difficulty, collection)
            if question:
                questions.append(question)

        if not questions:
            update_quiz_status(db, quiz_id, "failed")
            return {"status": "failed", "error": "No questions generated"}

        for q in questions:
            create_question(
                db=db,
                quiz_id=quiz_id,
                question_text=q.question,
                correct_answer=q.correct_answer,
                options=q.options,
                explanation=q.explanation,
                question_metadata={"difficulty": difficulty},
            )

        update_quiz_status(db, quiz_id, "completed")
        return {"status": "completed", "questions_count": len(questions)}

    except Exception as e:
        update_quiz_status(db, quiz_id, "failed")
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
