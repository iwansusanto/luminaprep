from chonkie import SemanticChunker
from typing import List


class DocumentChunker:
    def __init__(self):
        self.chunker = SemanticChunker(
            embedding_model="text-embedding-3-small", threshold=0.5
        )

    def chunk(self, text: str) -> list[str]:
        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
