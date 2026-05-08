from app.vector_db.client import chromadb_client, CustomEmbeddingFunction


def get_pdf_collection():
    return chromadb_client.get_or_create_collection(
        name="pdf_rag", embedding_function=CustomEmbeddingFunction()
    )
