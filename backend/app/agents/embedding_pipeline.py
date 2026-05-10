from app.vector_db.collections import chromadb_collections


def store_chunks(chunks: list[str], material_id: str) -> None:
    collection = chromadb_collections()
    collection.add(
        documents=chunks,
        ids=[f"{material_id}_chunk_{i}" for i in range(len(chunks))],
        metadatas=[
            {"material_id": material_id, "chunk_index": i} for i in range(len(chunks))
        ],
    )
