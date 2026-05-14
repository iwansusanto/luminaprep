import json
import random
from app.celery_app import celery_app
from app.database import SessionLocal
from app.crud.quiz import update_quiz_status
from app.crud.question import create_question
from app.utils.oa_client import oa_client
from app.utils.sanitize import sanitize_prompt_field
from app.vector_db.collections import chromadb_collections
from pydantic import BaseModel


class MCQQuestion(BaseModel):
    question: str
    correct_answer: str
    options: dict  # {"A": "...", "B": "...", ...}
    explanation: str


def _style_instruction(custom_request: str) -> str:
    """Build a style/format instruction line from custom_request."""
    return f"\nGaya/format soal: {custom_request}" if custom_request else ""


def generate_topics(
    num_questions: int,
    summary: str,
    difficulty: str,
    topic: str = "",
    custom_request: str = "",
) -> list[str]:
    topic_line = f"\nFokus topik: {topic}" if topic else ""
    style_line = _style_instruction(custom_request)

    user_prompt = f"""Berikut adalah ringkasan materi:{topic_line}{style_line}

{summary}

Buatlah tepat {num_questions} topik spesifik untuk soal pilihan ganda tingkat {difficulty}.
Satu topik per baris, tanpa penomoran, tanpa bullet."""

    response = oa_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Kamu pembuat soal. Tulis topik-topik sesuai instruksi, satu per baris.",
            },
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
    )
    content = response.choices[0].message.content
    if not content:
        return []
    return [t.strip() for t in content.split("\n") if t.strip()]


def get_related_chunks(query: str, collection, n_results: int = 5) -> list[str]:
    """
    Query ChromaDB. Uses the provided query string directly —
    so when topic is given, we search by topic for more relevant chunks.
    """
    results = collection.query(query_texts=[query], n_results=n_results)
    return [item for sublist in results["documents"] for item in sublist]


def build_complete_summary(chunks: list[str]) -> str:
    combined = "\n\n".join(chunks)
    response = oa_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Buat ringkasan padat dan faktual dari informasi berikut.",
            },
            {
                "role": "user",
                "content": f"Informasi:\n\n{combined}\n\nRingkasan:",
            },
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content or ""


def generate_question(
    summary: str,
    difficulty: str,
    topic: str = "",
    custom_request: str = "",
    max_retries: int = 3,
) -> MCQQuestion | None:
    topic_line = f"\nTopik soal: {topic}" if topic else ""
    style_line = _style_instruction(custom_request)

    user_prompt = f"""Materi:{topic_line}{style_line}

{summary}

Buat SATU soal pilihan ganda tingkat {difficulty}.
Jawab HANYA dengan JSON valid:
{{
    "question": "...",
    "correct_answer": "...",
    "distractors": ["...", "...", "..."],
    "explanation": "..."
}}"""

    for attempt in range(max_retries):
        try:
            response = oa_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Buat soal pilihan ganda. Balas hanya dengan JSON valid, tanpa teks lain.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            if not content:
                continue

            # Strip markdown fences
            content = content.strip()
            if content.startswith("```"):
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            options_list = data["distractors"] + [data["correct_answer"]]
            random.shuffle(options_list)
            labels = ["A", "B", "C", "D", "E"]
            options_dict = {labels[i]: opt for i, opt in enumerate(options_list)}

            return MCQQuestion(
                question=data["question"],
                correct_answer=data["correct_answer"],
                options=options_dict,
                explanation=data["explanation"],
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            if attempt == max_retries - 1:
                return None
    return None


def generate_single_question_for_topic(
    topic: str,
    difficulty: str,
    collection,
    custom_request: str = "",
) -> MCQQuestion | None:
    try:
        # Use topic as the ChromaDB search query for more relevant chunks
        search_query = topic if topic else "key concepts"
        chunks = get_related_chunks(search_query, collection)
        if not chunks:
            return None
        summary = build_complete_summary(chunks)
        if not summary:
            return None
        return generate_question(summary, difficulty, topic=topic, custom_request=custom_request)
    except Exception:
        return None


@celery_app.task(bind=True)
def generate_quiz_task(
    self,
    quiz_id: str,
    summary: str,
    num_questions: int,
    difficulty: str,
    topic: str = "",
    custom_request: str = "",
):
    db = SessionLocal()
    collection = chromadb_collections()
    return _run_task_body(
        quiz_id, summary, num_questions, difficulty,
        topic=topic, custom_request=custom_request,
        db=db, collection=collection,
    )


def _run_task_body(
    quiz_id: str,
    summary: str,
    num_questions: int,
    difficulty: str,
    topic: str = "",
    custom_request: str = "",
    db=None,
    collection=None,
):
    """Core task logic — callable directly in tests without Celery."""
    if db is None:
        db = SessionLocal()
    if collection is None:
        collection = chromadb_collections()

    # Sanitize user inputs before using in prompts
    topic = sanitize_prompt_field(topic, max_length=255)
    custom_request = sanitize_prompt_field(custom_request, max_length=500)

    try:
        update_quiz_status(db, quiz_id, "processing")

        topics = generate_topics(
            num_questions, summary, difficulty,
            topic=topic, custom_request=custom_request,
        )
        if not topics:
            update_quiz_status(db, quiz_id, "failed")
            return {"status": "failed", "error": "No topics generated"}

        questions = []
        for t in topics:
            q = generate_single_question_for_topic(
                t, difficulty, collection, custom_request=custom_request
            )
            if q:
                questions.append(q)

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
                question_metadata={
                    "difficulty": difficulty,
                    "topic": topic,
                    "custom_request": custom_request,
                },
            )

        update_quiz_status(db, quiz_id, "completed")
        return {"status": "completed", "questions_count": len(questions)}

    except Exception as e:
        update_quiz_status(db, quiz_id, "failed")
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
