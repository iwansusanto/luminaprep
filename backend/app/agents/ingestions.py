from typing import Literal
from sqlalchemy.orm import Session
from app.agents.parsers import ParserAgent
from app.agents.chunking import DocumentChunker
from app.agents.embedding_pipeline import EmbeddingPipelineAgent
from app.agents.summarization import SummarizationAgent
from app.models.material import Material
from app.crud.material import update_material
from app.agents.exceptions import IngestionError
from app.utils import langfuse_client as observability


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
        trace = None
        try:
            load_span = None
            trace = observability.safe_trace(
                "material-ingestion",
                metadata=observability.standard_metadata(
                    "material-ingestion",
                    material_id=material_id,
                    file_type=file_type,
                ),
                input={"file_type": file_type},
            )
            load_span = observability.span(trace, "load-material-record")
            material = self.db.get(Material, material_id)
            if not material:
                observability.end_observation(load_span, output={"found": False})
                raise IngestionError(f"Material {material_id} not found")
            observability.end_observation(
                load_span,
                output={
                    "found": True,
                    "project_id": material.project_id,
                    "user_id": material.user_id,
                },
            )

            user_id = material.user_id
            metadata = observability.standard_metadata(
                "material-ingestion",
                user_id=user_id,
                project_id=material.project_id,
                material_id=material_id,
                file_type=file_type,
            )
            observability.update_observation(trace, metadata=metadata)

            status_span = observability.span(trace, "update-material-status-processing")
            update_material(self.db, material_id=material_id, user_id=user_id, status="processing")
            observability.end_observation(status_span, output={"status": "processing"})

            # Parse into pages (run in thread to avoid blocking async loop)
            import asyncio
            parse_span = observability.span(trace, "parse-document")
            pages = await asyncio.to_thread(self.parser.parse, file_path, file_type)
            observability.end_observation(parse_span, output={"page_count": len(pages)})

            # Generate summary from first 2 + last 2 pages, max ~1000 tokens
            summary_span = observability.span(trace, "summarize-material")
            summary = await self.summarizer.generate_from_pages(pages)
            observability.end_observation(
                summary_span,
                output={"summary_length": len(summary) if summary else 0},
            )

            # Chunk all pages for vector storage
            chunk_span = observability.span(trace, "chunk-document")
            all_chunks = []
            for page in pages:
                all_chunks.extend(self.chunker.chunk(page))
            observability.end_observation(chunk_span, output={"chunk_count": len(all_chunks)})

            embedding_span = observability.span(trace, "store-embeddings")
            self.embedding_pipeline.store_chunks(all_chunks, material_id)
            observability.end_observation(
                embedding_span,
                output={"chunk_count": len(all_chunks)},
            )

            completed_span = observability.span(trace, "update-material-status-completed")
            update_material(
                self.db,
                material_id=material_id,
                user_id=user_id,
                status="completed",
                summary=summary or None,
            )
            observability.end_observation(completed_span, output={"status": "completed"})

            result = {
                "status": "success",
                "material_id": material_id,
                "num_chunks": len(all_chunks),
                "summary_length": len(summary) if summary else 0,
            }
            observability.update_observation(trace, output=result)
            return result

        except Exception as e:
            try:
                mat = self.db.get(Material, material_id)
                if mat:
                    update_material(self.db, material_id=material_id, user_id=mat.user_id, status="failed")
            except Exception:
                pass
            observability.update_observation(
                trace,
                output={"status": "failed", "error": str(e)},
            )
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
        raise IngestionError(f"Failed after {max_retries} attempts: {str(last_error)}")
