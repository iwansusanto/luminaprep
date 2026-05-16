from app.vector_db.collections import chromadb_collections


class EmbeddingPipelineAgent:
    def __init__(self):
        self.collection = chromadb_collections()

    def _batch_chunks(self, chunks: list[str], max_items: int = 64, max_chars: int = 80_000):
        batch: list[str] = []
        batch_chars = 0
        for chunk in chunks:
            chunk_chars = len(chunk)
            if batch and (len(batch) >= max_items or batch_chars + chunk_chars > max_chars):
                yield batch
                batch = []
                batch_chars = 0
            batch.append(chunk)
            batch_chars += chunk_chars
        if batch:
            yield batch

    def store_chunks(self, chunks: list[str], material_id: str) -> None:
        chunk_index = 0
        for batch in self._batch_chunks(chunks):
            self.collection.add(
                documents=batch,
                ids=[
                    f"{material_id}_chunk_{chunk_index + i}"
                    for i in range(len(batch))
                ],
                metadatas=[
                    {"material_id": material_id, "chunk_index": chunk_index + i}
                    for i in range(len(batch))
                ],
            )
            chunk_index += len(batch)
