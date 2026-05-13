from typing import Literal
from sqlalchemy.orm import Session
from app.agents.parsers import ParserAgent
from app.agents.chunking import DocumentChunker
from app.agents.embedding_pipeline import EmbeddingPipelineAgent
from app.models.material import Material
from app.crud.material import update_material
from app.agents.summarization import SummarizationAgent
from app.agents.exceptions import IngestionError


class IngestionAgent:
    def __init__(self, db: Session):
        self.db = db
        self.parser = ParserAgent()
        self.chunker = DocumentChunker()
        self.embedding_pipeline = EmbeddingPipelineAgent()
        self.summarizer = SummarizationAgent()

    async def ingest(
        self, material_id: str, file_path: str, file_type: Literal["pdf", "txt"]
    ) -> dict:
        try:
            material = self.db.query(Material).get(material_id)
            if not material:
                raise IngestionError(f"Material {material_id} not found in database")

            user_id = material.user_id

            update_material(
                self.db, material_id=material_id, user_id=user_id, status="processing"
            )

            import asyncio
            pages = await asyncio.to_thread(self.parser.parse, file_path, file_type)

            all_chunks = []
            for page in pages:
                chunks = self.chunker.chunk(page)
                all_chunks.extend(chunks)

            self.embedding_pipeline.store_chunks(all_chunks, material_id)

            # Generate summary for the material
            full_text = " ".join(pages)
            summary = await self.summarizer.generate(full_text)

            update_material(
                self.db,
                material_id=material_id,
                user_id=user_id,
                status="completed",
                summary=summary,
            )

            return {
                "status": "success",
                "material_id": material_id,
                "num_chunks": len(all_chunks),
            }

        except Exception as e:
            try:
                material = self.db.query(Material).get(material_id)
                if material:
                    update_material(
                        self.db,
                        material_id=material_id,
                        user_id=material.user_id,
                        status="failed",
                    )
            except Exception:
                pass
            raise e

    async def ingest_with_retry(
        self,
        material_id: str,
        file_path: str,
        file_type: Literal["pdf", "txt"],
        max_retries: int = 3,
    ) -> dict:
        last_error = None
        for attempt in range(max_retries):
            try:
                return await self.ingest(material_id, file_path, file_type)
            except Exception as e:
                last_error = e
                if attempt == max_retries - 1:
                    break
                continue
        raise IngestionError(f"Failed after {max_retries} attempts: {str(last_error)}")
