from app.vector_db.collections import chromadb_collections


class EmbeddingPipelineAgent:
    def __init__(self):
        self.collection = chromadb_collections()

    def store_chunks(self, chunks: list[str], material_id: str) -> None:
        self.collection.add(
            documents=chunks,
            ids=[f"{material_id}_chunk_{i}" for i in range(len(chunks))],
            metadatas=[
                {"material_id": material_id, "chunk_index": i}
                for i in range(len(chunks))
            ],
        )
