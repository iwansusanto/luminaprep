from app.agents.chunking import DocumentChunker
from app.agents.parsers import pdf_parser, txt_parser
from app.agents.embedding_pipeline import store_chunks


def ingest_material(material_id: str, file_path: str, file_type: str):
    # Load document
    if file_type == "pdf":
        pages = pdf_parser(file_path)
    elif file_type == "txt":
        pages = txt_parser(file_path)

    # Chunking
    chunker = DocumentChunker()
    all_chunks = []
    for page in pages:
        chunks = chunker.chunk(page)
        all_chunks.extend(chunks)

    # Embedding and save to ChromaDB
    store_chunks(all_chunks, material_id)
