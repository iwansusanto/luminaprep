from app.agents.chunking import DocumentChunker
from app.agents.parsers import pdf_parser, txt_parser
from app.agents.embedding_pipeline import store_chunks
from app.db.database import SessionLocal
from app.models.material import Material
from app.crud.material import update_material
from typing import Literal


async def ingest_material(
    material_id: str, file_path: str, file_type: Literal["pdf", "txt"]
):
    db = SessionLocal()
    try:
        material = db.query(Material).get(material_id)
        if not material:
            raise IngestionError(f"Material {material_id} not found in database")

        user_id = material.user_id

        # update status to processing
        update_material(
            db, material_id=material_id, user_id=user_id, status="processing"
        )

        # load document
        if file_type == "pdf":
            pages = pdf_parser(file_path)
        elif file_type == "txt":
            pages = txt_parser(file_path)

        # chunking
        chunker = DocumentChunker()
        all_chunks = []
        for page in pages:
            chunks = chunker.chunk(page)
            all_chunks.extend(chunks)

        # embedding and save to ChromaDB
        store_chunks(all_chunks, material_id)

        # update status to completed
        update_material(
            db, material_id=material_id, user_id=user_id, status="completed"
        )

        return {
            "status": "success",
            "material_id": material_id,
            "num_chunks": len(all_chunks),
        }

    except Exception as e:
        try:
            material = db.query(Material).get(material_id)
            if material:
                update_material(
                    db,
                    material_id=material_id,
                    user_id=material.user_id,
                    status="failed",
                )
        except:
            pass
        raise e

    finally:
        db.close()


class IngestionError(Exception):
    pass


async def ingest_material_with_retry(
    material_id: str,
    file_path: str,
    file_type: Literal["pdf", "txt"],
    max_retries: int = 3,
):
    for attempt in range(max_retries):
        try:
            return await ingest_material(material_id, file_path, file_type)
        except Exception as e:
            if attempt == max_retries - 1:
                raise IngestionError(f"Failed after {max_retries} attempts: {str(e)}")
            continue
