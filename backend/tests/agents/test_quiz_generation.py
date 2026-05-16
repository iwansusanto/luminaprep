from app.agents import mcq_quiz
from app.agents.mcq_quiz import MCQQuestion, MCQQuizAgent


def test_mcq_question_contract():
    question = MCQQuestion(
        question="Apa tujuan QA?",
        correct_answer="Memastikan kualitas",
        options={
            "A": "Memastikan kualitas",
            "B": "Menghapus fitur",
            "C": "Menambah bug",
            "D": "Mematikan server",
        },
        explanation="QA memvalidasi perilaku sistem terhadap ekspektasi.",
    )

    assert question.question
    assert question.correct_answer in question.options.values()
    assert len(question.options) == 4
    assert question.explanation


class FakeCollection:
    def count(self):
        return 1

    def query(self, *args, **kwargs):
        return {"documents": [["Chunk materi QA yang relevan."]]}


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeChoice:
    def __init__(self, content):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeCompletions:
    def create(self, *args, **kwargs):
        messages = kwargs["messages"]
        system_prompt = messages[0]["content"]
        if "JANGAN gunakan penomoran" in system_prompt:
            return FakeResponse("Topik QA\nTopik Testing")
        if "Buatlah ringkasan lengkap" in system_prompt:
            return FakeResponse("Ringkasan lengkap materi QA.")
        return FakeResponse(
            """
            {
              "question": "Apa tujuan QA?",
              "correct_answer": "Memastikan kualitas",
              "distractors": ["Menghapus fitur", "Mematikan server", "Mengubah warna"],
              "explanation": "QA memastikan sistem sesuai ekspektasi."
            }
            """
        )


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeOpenAIClient:
    def __init__(self):
        self.chat = FakeChat()


def test_mcq_quiz_agent_generates_questions_with_mocked_llm_and_vector_db(monkeypatch):
    monkeypatch.setattr(mcq_quiz, "chromadb_collections", lambda: FakeCollection())
    monkeypatch.setattr(mcq_quiz, "oa_client", FakeOpenAIClient())

    questions = MCQQuizAgent().generate_quiz(
        num_questions=2,
        summary="Materi QA",
        difficulty="intermediate",
        material_id="material-1",
    )

    assert len(questions) == 2
    assert all(question.correct_answer in question.options.values() for question in questions)
    assert all(question.explanation for question in questions)
