from app.agents.mcq_quiz import MCQQuestion


def test_mcq_question_contract():
    question = MCQQuestion(
        question="Apa tujuan QA?",
        correct_answer="Memastikan kualitas",
        options=["Memastikan kualitas", "Menghapus fitur", "Menambah bug", "Mematikan server"],
        explanation="QA memvalidasi perilaku sistem terhadap ekspektasi.",
    )

    assert question.question
    assert question.correct_answer in question.options
    assert len(question.options) == 4
    assert question.explanation
