from app.utils.oa_client import oa_client
from chromadb import EmbeddingFunction, Embeddings
import chromadb
import numpy as np

chromadb_client = chromadb.PersistentClient(path="chroma_db")


class CustomEmbeddingFunction(EmbeddingFunction):
    def __init__(self, model: str = "perplexity/pplx-embed-v1-4b"):
        self.client = oa_client
        self.model = model

    def __call__(self, input: list[str]) -> Embeddings:
        response = self.client.embeddings.create(
            model=self.model,
            input=input,
        )

        # Return embeddings in the same order as input
        return [np.array(item.embedding, dtype=np.float32) for item in response.data]
