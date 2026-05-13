from chonkie import SemanticChunker
from chonkie.embeddings import AutoEmbeddings


class DocumentChunker:
    def __init__(self):
        # Manually initialize embedding model and set a compatible tokenizer
        # to avoid the "Unsupported tokenizer backend" error with CatsuTokenizerWrapper
        embedding_model = AutoEmbeddings.get_embeddings("text-embedding-3-small")
        embedding_model.get_tokenizer = lambda: "cl100k_base"

        self.chunker = SemanticChunker(
            embedding_model=embedding_model, threshold=0.5
        )

    def chunk(self, text: str) -> list[str]:
        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
