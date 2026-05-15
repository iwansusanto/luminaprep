import logging

from chonkie import SemanticChunker

logger = logging.getLogger(__name__)
from chonkie import SemanticChunker, OpenAIEmbeddings
from app.core.config import settings


class DocumentChunker:
    def __init__(self):
        try:
            # Use a local model for semantic chunking when optional embeddings are installed.
            self.chunker = SemanticChunker(
                embedding_model="all-MiniLM-L6-v2", threshold=0.5
            )
        except Exception as exc:
            logger.warning(
                "Semantic chunker unavailable; falling back to fixed-size chunking: %s",
                exc,
            )
            self.chunker = None
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.OPENAI_API_KEY,
        )
        self.chunker = SemanticChunker(embedding_model=embeddings, threshold=0.5)

    def chunk(self, text: str) -> list[str]:
        if self.chunker is None:
            chunk_size = 1200
            overlap = 150
            chunks = []
            start = 0
            while start < len(text):
                chunk = text[start : start + chunk_size].strip()
                if chunk:
                    chunks.append(chunk)
                start += chunk_size - overlap
            return chunks

        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
