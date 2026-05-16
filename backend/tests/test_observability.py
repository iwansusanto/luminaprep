from app.utils.langfuse_client import (
    NoOpLangfuse,
    end_observation,
    standard_metadata,
    update_observation,
)


def test_noop_langfuse_is_safe_to_call():
    trace = NoOpLangfuse().trace(name="qa-test")
    span = trace.span(name="qa-span")

    update_observation(trace, output={"status": "ok"})
    end_observation(span, output={"status": "done"})

    assert not trace
    assert span is trace


def test_standard_metadata_includes_searchable_fields():
    metadata = standard_metadata(
        "quiz-generation",
        user_id="user-1",
        project_id="project-1",
        material_id="material-1",
        quiz_id="quiz-1",
    )

    assert metadata["service"] == "luminaprep-api"
    assert metadata["pipeline"] == "quiz-generation"
    assert metadata["user_id"] == "user-1"
    assert metadata["project_id"] == "project-1"
    assert metadata["material_id"] == "material-1"
    assert metadata["quiz_id"] == "quiz-1"
