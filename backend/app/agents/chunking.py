from chonkie import SemanticChunker
from chonkie.embeddings import AutoEmbeddings


class DocumentChunker:
    def __init__(self):
        # Use a local model for semantic chunking (fast, reliable, no API issues)
        self.chunker = SemanticChunker(
            embedding_model="all-MiniLM-L6-v2", threshold=0.5
        )

    def chunk(self, text: str) -> list[str]:
        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
