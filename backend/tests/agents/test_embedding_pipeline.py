from app.agents.embedding_pipeline import EmbeddingPipelineAgent


class FakeCollection:
    def __init__(self):
        self.calls = []

    def add(self, **kwargs):
        self.calls.append(kwargs)


def test_store_chunks_batches_large_payloads(monkeypatch):
    agent = EmbeddingPipelineAgent()
    fake_collection = FakeCollection()
    agent.collection = fake_collection

    chunks = ["x" * 40_000, "y" * 40_000, "z" * 40_000]
    agent.store_chunks(chunks, "material-1")

    assert len(fake_collection.calls) == 2
    assert fake_collection.calls[0]["documents"] == chunks[:2]
    assert fake_collection.calls[1]["documents"] == chunks[2:]
    assert fake_collection.calls[0]["ids"] == ["material-1_chunk_0", "material-1_chunk_1"]
    assert fake_collection.calls[1]["ids"] == ["material-1_chunk_2"]
