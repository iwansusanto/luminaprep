from app.vector_db.client import chromadb_client
from app.vector_db.embedding import CustomEmbeddingFunction


def chromadb_collections():
    return chromadb_client.get_or_create_collection(
        name="luminaprep_rag", embedding_function=CustomEmbeddingFunction()
    )
