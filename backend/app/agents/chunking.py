from chonkie import SemanticChunker, OpenAIEmbeddings
from app.core.config import settings


class DocumentChunker:
    def __init__(self):
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.OPENAI_API_KEY,
        )
        self.chunker = SemanticChunker(embedding_model=embeddings, threshold=0.5)

    def chunk(self, text: str) -> list[str]:
        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
