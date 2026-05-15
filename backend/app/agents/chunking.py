import logging

from chonkie import TokenChunker, SemanticChunker, OpenAIEmbeddings
from app.core.config import settings


class DocumentChunker:
    def __init__(self):
        self.chunker = None
        try:
            # Attempt OpenAI-based semantic chunking first if possible
            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.OPENAI_API_KEY,
            )
            self.chunker = SemanticChunker(embedding_model=embeddings, threshold=0.5)
            logger.info("Initialized OpenAI SemanticChunker")
        except Exception as e:
            logger.warning("OpenAI SemanticChunker unavailable: %s", e)
            try:
                # Fallback to lightweight TokenChunker (no heavy dependencies)
                self.chunker = TokenChunker(chunk_size=512, chunk_overlap=64)
                logger.info("Falling back to TokenChunker")
            except Exception as e2:
                logger.error("Failed to initialize any Chonkie chunker: %s", e2)
                self.chunker = None

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
