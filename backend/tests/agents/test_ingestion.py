import pytest

from app.agents import ingestions
from app.agents.ingestions import IngestionAgent
from app.models.material import Material
from app.models.project import Project


class FakeParserAgent:
    def parse(self, file_path, file_type):
        return ["Halaman pertama materi QA.", "Halaman kedua materi QA."]


class FakeDocumentChunker:
    def chunk(self, page):
        return [f"chunk::{page}"]


class FakeEmbeddingPipelineAgent:
    def __init__(self):
        self.stored = []

    def store_chunks(self, chunks, material_id):
        self.stored.append((chunks, material_id))


class FakeSummarizationAgent:
    async def generate_from_pages(self, pages):
        return f"Ringkasan: {pages[0][:20]}"


@pytest.mark.asyncio
async def test_ingestion_pipeline_updates_material_status_and_summary(
    db,
    test_user,
    monkeypatch,
):
    monkeypatch.setattr(ingestions, "ParserAgent", FakeParserAgent)
    monkeypatch.setattr(ingestions, "DocumentChunker", FakeDocumentChunker)
    monkeypatch.setattr(ingestions, "EmbeddingPipelineAgent", FakeEmbeddingPipelineAgent)
    monkeypatch.setattr(ingestions, "SummarizationAgent", FakeSummarizationAgent)

    project = Project(
        title="Ingestion Project",
        description="AI agent test",
        user_id=test_user.id,
        status="active",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    material = Material(
        project_id=project.id,
        user_id=test_user.id,
        file_name="material.txt",
        file_type="txt",
        storage_path="/tmp/material.txt",
        status="uploaded",
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    result = await IngestionAgent(db).ingest(
        material_id=material.id,
        file_path="/tmp/material.txt",
        file_type="txt",
    )

    db.refresh(material)
    assert result["status"] == "success"
    assert result["material_id"] == material.id
    assert result["num_chunks"] == 2
    assert result["summary_length"] > 0
    assert material.status == "completed"
    assert material.summary.startswith("Ringkasan:")
