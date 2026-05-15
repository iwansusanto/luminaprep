from app.agents import chunking


class FakeChunk:
    def __init__(self, text: str):
        self.text = text


class FakeSemanticChunker:
    def __init__(self, *args, **kwargs):
        pass

    def chunk(self, text: str):
        return [FakeChunk(text[:20]), FakeChunk(text[20:])]


def test_document_chunker_returns_chunks_for_text(monkeypatch):
    monkeypatch.setattr(chunking, "SemanticChunker", FakeSemanticChunker)

    chunker = chunking.DocumentChunker()

    chunks = chunker.chunk("Ini adalah materi QA. " * 80)

    assert chunks
    assert all(isinstance(chunk, str) for chunk in chunks)
