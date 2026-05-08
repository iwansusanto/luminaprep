# 3.3. Farisbay (AI/RAG Specialist) - Tugas Granular

---

## Hari 1: Penyiapan Lingkungan AI & Vector DB (5 Mei)

### Tujuan
Setup lingkungan Python dengan dependencies AI/LLM dan inisialisasi ChromaDB.

### Tugas Detail

#### 1. Install Dependencies
```bash
uv add openai chromadb chonkie pypdf python-dotenv
```

**Dependencies yang dibutuhkan:**
- `openai>=2.35.1` - LLM dan Embeddings
- `chromadb>=1.5.9` - Vector database
- `chonkie>=1.6.5` - Text chunking
- `pypdf>=3.0.0` - PDF parsing
- `python-dotenv>=1.0.0` - Environment variables

#### 2. Struktur Folder
```
app/
├── vector_db/
│   ├── __init__.py
│   ├── client.py          # ChromaDB client initialization
│   └── collections.py     # Collection definitions
├── agents/
│   ├── __init__.py
│   └── base.py            # Base agent class
```

#### 3. Inisialisasi ChromaDB Client
**File: `app/vector_db/client.py`**
```python
from chromadb import Client
from chromadb.config import Settings

def get_chroma_client():
    """Get ChromaDB client instance."""
    return Client(Settings(
        persist_directory="./chroma_db",
        anonymized_telemetry=False
    ))
```

#### 4. Definisi Collections
**File: `app/vector_db/collections.py`**
```python
from chromadb.api.types import Collection

def get_materials_collection(client: Client) -> Collection:
    """Get or create materials collection."""
    return client.get_or_create_collection(
        name="materials",
        metadata={"hnsw:space": "cosine"}
    )
```

#### 5. Fungsi `ingest_material` Signature
**File: `app/agents/base.py`**
```python
from typing import Literal

async def ingest_material(
    material_id: str,
    file_path: str,
    file_type: Literal["pdf", "txt"]
) -> dict:
    """
    Ingest material into vector database.
    
    Args:
        material_id: Unique identifier for the material
        file_path: Path to the file
        file_type: Type of file (pdf/txt)
    
    Returns:
        dict with ingestion status and metadata
    """
    pass
```

### Deliverables
- [ ] Dependencies terinstall
- [ ] ChromaDB client terinisialisasi
- [ ] Collection `materials` tersedia
- [ ] Fungsi `ingest_material` signature terdefinisi

---

## Hari 2: Arsitektur RAG & Embedding (6 Mei)

### Tujuan
Implementasi embedding pipeline dan text chunking.

### Tugas Detail

#### 1. OpenAI Embeddings Integration
**File: `app/vector_db/embeddings.py`**
```python
from openai import OpenAI
from app.core.config import settings

class OpenAIEmbeddings:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = "text-embedding-3-small"
    
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for single text."""
        response = self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding
    
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for batch of texts."""
        response = self.client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [d.embedding for d in response.data]
```

#### 2. Text Chunking dengan Chonkie
**File: `app/agents/chunking.py`**
```python
from chonkie import SemanticChunker
from typing import List

class DocumentChunker:
    def __init__(self, method: str = "semantic"):
        if method == "semantic":
            self.chunker = SemanticChunker(
                embedding_model="text-embedding-3-small",
                threshold=0.5
            )
        elif method == "recursive":
            self.chunker = RecursiveChunker(
                chunk_size=500,
                chunk_overlap=50
            )
    
    def chunk(self, text: str) -> List[str]:
        """Chunk text into smaller pieces."""
        return self.chunker.chunk(text)
```

#### 3. PDF Parser
**File: `app/agents/parsers.py`**
```python
from pypdf import PdfReader
from typing import List

class PDFParser:
    def parse(self, file_path: str) -> List[str]:
        """Parse PDF and return list of pages."""
        reader = PdfReader(file_path)
        return [page.extract_text() for page in reader.pages if page.extract_text()]
```

#### 4. TXT Parser
**File: `app/agents/parsers.py`**
```python
class TXTParser:
    def parse(self, file_path: str) -> List[str]:
        """Parse TXT and return content."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return [f.read()]
```

#### 5. Embedding Pipeline
**File: `app/agents/embedding_pipeline.py`**
```python
from typing import List, Tuple

async def generate_embeddings_for_chunks(
    chunks: List[str],
    embeddings: OpenAIEmbeddings
) -> Tuple[List[str], List[List[float]]]:
    """Generate embeddings for text chunks."""
    embeddings_list = await embeddings.embed_batch(chunks)
    return chunks, embeddings_list
```

### Deliverables
- [ ] OpenAI embeddings integration
- [ ] Text chunking untuk PDF dan TXT
- [ ] Embedding generation pipeline
- [ ] Unit tests untuk chunking dan embedding

---

## Hari 3: Agen Ingestion (7 Mei)

### Tujuan
Implementasi fungsi `ingest_material` lengkap.

### Tugas Detail

#### 1. Material Model Extension
**File: `app/models/material.py`**
```python
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid

class MaterialBase(SQLModel):
    title: str = Field(max_length=255)
    description: Optional[str] = None
    file_path: str = Field(max_length=500)
    file_type: str = Field(max_length=10)
    project_id: str = Field(foreign_key="project.id")

class Material(MaterialBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    project: Optional["Project"] = Relationship(back_populates="materials")
```

#### 2. Ingestion Agent Implementation
**File: `app/agents/ingestion.py`**
```python
from typing import Literal
from app.vector_db.client import get_chroma_client
from app.vector_db.collections import get_materials_collection
from app.agents.chunking import DocumentChunker
from app.agents.embeddings import OpenAIEmbeddings
from app.agents.parsers import PDFParser, TXTParser
from app.db.database import SessionLocal

async def ingest_material(
    material_id: str,
    file_path: str,
    file_type: Literal["pdf", "txt"]
) -> dict:
    """
    Ingest material into vector database.
    
    1. Parse document
    2. Chunk text
    3. Generate embeddings
    4. Store in ChromaDB
    5. Update database
    """
    # Parse document
    if file_type == "pdf":
        parser = PDFParser()
    else:
        parser = TXTParser()
    
    pages = parser.parse(file_path)
    
    # Chunk text
    chunker = DocumentChunker()
    all_chunks = []
    for page in pages:
        chunks = chunker.chunk(page)
        all_chunks.extend(chunks)
    
    # Generate embeddings
    embeddings = OpenAIEmbeddings()
    _, embeddings_list = await generate_embeddings_for_chunks(
        all_chunks, embeddings
    )
    
    # Store in ChromaDB
    client = get_chroma_client()
    collection = get_materials_collection(client)
    
    collection.add(
        ids=[f"{material_id}_chunk_{i}" for i in range(len(all_chunks))],
        documents=all_chunks,
        embeddings=embeddings_list,
        metadatas=[{"material_id": material_id, "chunk_index": i} 
                   for i in range(len(all_chunks))]
    )
    
    # Update database
    db = SessionLocal()
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.file_path = file_path
        material.file_type = file_type
        db.commit()
    
    return {
        "status": "success",
        "material_id": material_id,
        "chunks_count": len(all_chunks),
        "file_type": file_type
    }
```

#### 3. Error Handling
```python
class IngestionError(Exception):
    pass

async def ingest_material_with_retry(
    material_id: str,
    file_path: str,
    file_type: Literal["pdf", "txt"],
    max_retries: int = 3
) -> dict:
    """Ingest material with retry logic."""
    for attempt in range(max_retries):
        try:
            return await ingest_material(material_id, file_path, file_type)
        except Exception as e:
            if attempt == max_retries - 1:
                raise IngestionError(f"Failed after {max_retries} attempts: {str(e)}")
            continue
```

### Deliverables
- [ ] Fungsi `ingest_material` lengkap
- [ ] Error handling dan retry logic
- [ ] Integration dengan MySQL
- [ ] Unit tests

---

## Hari 4: Agen Sintesis (Ringkasan & Ekstraksi) (8 Mei)

### Tujuan
Implementasi `generate_summary` dengan streaming support.

### Tugas Detail

#### 1. Summary Agent
**File: `app/agents/summarization.py`**
```python
from typing import AsyncGenerator
from openai import AsyncOpenAI
from app.core.config import settings

class SummaryAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def generate_summary(
        self,
        material_id: str,
        max_tokens: int = 500
    ) -> AsyncGenerator[str, None]:
        """
        Generate summary using RAG.
        
        1. Retrieve relevant chunks from ChromaDB
        2. Send to LLM for summarization
        3. Stream response
        """
        # Retrieve chunks
        client = get_chroma_client()
        collection = get_materials_collection(client)
        
        results = collection.query(
            query_texts=[f"Summarize this material: {material_id}"],
            n_results=5
        )
        
        # Build context
        context = "\n\n".join(results['documents'][0])
        
        # Generate summary with streaming
        stream = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes documents."},
                {"role": "user", "content": f"Summarize the following text:\n\n{context}"}
            ],
            stream=True,
            max_tokens=max_tokens
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

#### 2. Streaming Endpoint
**File: `app/api/v1/agents.py`**
```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.get("/materials/{material_id}/summary")
async def get_summary(material_id: str):
    """Get summary with streaming."""
    async def generate():
        async for token in summary_agent.generate_summary(material_id):
            yield token
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Deliverables
- [ ] Fungsi `generate_summary` dengan streaming
- [ ] RAG integration untuk context retrieval
- [ ] Streaming endpoint
- [ ] Unit tests

---

## Hari 5: Agen Kuis - Rekayasa Prompt (9 Mei)

### Tujuan
Implementasi `generate_mcq_quiz` dengan prompt engineering.

### Tugas Detail

#### 1. Quiz Agent dengan Prompt Engineering
**File: `app/agents/quiz.py`**
```python
from typing import List, Literal
from pydantic import BaseModel
import json

class MCQQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    citation: str

class QuizAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    def _build_quiz_prompt(
        self,
        material_context: str,
        difficulty: Literal["easy", "medium", "hard"],
        num_questions: int
    ) -> str:
        """Build prompt for MCQ generation."""
        return f"""Generate {num_questions} multiple choice questions based on the following material.

Difficulty: {difficulty}

Material:
{material_context}

Return JSON format with the following structure:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": "Explanation of the answer",
            "citation": "Page number or section reference"
        }}
    ]
}}

Requirements:
- Questions should test understanding, not just recall
- Distractors should be plausible
- Explanations should be clear and concise
- Citations should reference specific parts of the material
"""
    
    async def generate_mcq_quiz(
        self,
        quiz_id: str,
        material_id: str,
        difficulty: Literal["easy", "medium", "hard"],
        num_questions: int
    ) -> List[MCQQuestion]:
        """Generate MCQ quiz using RAG and LLM."""
        # Retrieve relevant chunks
        client = get_chroma_client()
        collection = get_materials_collection(client)
        
        results = collection.query(
            query_texts=[f"Generate quiz questions about {material_id}"],
            n_results=10
        )
        
        context = "\n\n".join(results['documents'][0])
        
        # Generate quiz
        prompt = self._build_quiz_prompt(context, difficulty, num_questions)
        
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert quiz creator."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        quiz_data = json.loads(response.choices[0].message.content)
        
        return [MCQQuestion(**q) for q in quiz_data['questions']]
```

#### 2. Difficulty Prompt Engineering
```python
def _get_difficulty_instructions(self, difficulty: str) -> str:
    """Get difficulty-specific instructions."""
    instructions = {
        "easy": "Create basic recall questions testing fundamental concepts.",
        "medium": "Create application questions requiring understanding of concepts.",
        "hard": "Create analysis/synthesis questions requiring critical thinking."
    }
    return instructions[difficulty]
```

### Deliverables
- [ ] Fungsi `generate_mcq_quiz` lengkap
- [ ] Prompt engineering untuk MCQ
- [ ] JSON output validation
- [ ] Unit tests

---

## Hari 6: Logika Kuis Adaptif & Persistensi (10 Mei)

### Tujuan
Implementasi adaptive difficulty dan database persistence.

### Tugas Detail

#### 1. Adaptive Difficulty Logic
```python
async def generate_adaptive_quiz(
    quiz_id: str,
    material_id: str,
    difficulty: Literal["easy", "medium", "hard"],
    num_questions: int,
    user_level: Optional[int] = None  # 1-10 scale
) -> List[MCQQuestion]:
    """Generate adaptive quiz based on user level."""
    
    # Adjust difficulty based on user level
    if user_level:
        if user_level <= 3:
            actual_difficulty = "easy"
        elif user_level <= 7:
            actual_difficulty = "medium"
        else:
            actual_difficulty = "hard"
    else:
        actual_difficulty = difficulty
    
    # Retrieve chunks specific to difficulty
    chunk_filter = {
        "easy": "basic concepts",
        "medium": "core concepts",
        "hard": "advanced concepts"
    }
    
    results = collection.query(
        query_texts=[f"{chunk_filter[actual_difficulty]} about {material_id}"],
        n_results=10
    )
    
    # Generate quiz with adjusted context
    return await self.generate_mcq_quiz(
        quiz_id, material_id, actual_difficulty, num_questions
    )
```

#### 2. Database Persistence
**File: `app/models/quiz.py`**
```python
from sqlmodel import SQLModel, Field
from typing import Optional, List
import uuid

class Question(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quiz_id: str = Field(foreign_key="quiz.id")
    question_text: str
    options: str = Field(sa_column_kwargs={"type_": "JSON"})
    correct_answer: str
    explanation: str
    citation: str
    difficulty: str
    
    quiz: Optional["Quiz"] = Relationship(back_populates="questions")

class Quiz(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    material_id: str = Field(foreign_key="material.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    questions: List["Question"] = Relationship(back_populates="quiz")
```

#### 3. Save Quiz to Database
```python
async def save_quiz_to_db(
    quiz: List[MCQQuestion],
    quiz_id: str,
    material_id: str
) -> str:
    """Save generated quiz to MySQL."""
    db = SessionLocal()
    
    db_quiz = Quiz(
        id=quiz_id,
        material_id=material_id
    )
    db.add(db_quiz)
    db.commit()
    
    for q in quiz:
        db_question = Question(
            quiz_id=quiz_id,
            question_text=q.question,
            options=json.dumps(q.options),
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            citation=q.citation,
            difficulty="medium"  # Store difficulty
        )
        db.add(db_question)
    
    db.commit()
    
    return quiz_id
```

### Deliverables
- [ ] Adaptive difficulty logic
- [ ] Database models untuk Quiz dan Question
- [ ] Persistence logic
- [ ] Unit tests

---

## Hari 7: Agen Umpan Balik Streaming (11 Mei)

### Tujuan
Implementasi `generate_feedback` dengan streaming.

### Tugas Detail

#### 1. Feedback Agent
**File: `app/agents/feedback.py`**
```python
from typing import AsyncGenerator

class FeedbackAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def generate_feedback(
        self,
        session_id: str,
        question_id: str,
        selected_answer: str,
        is_correct: bool
    ) -> AsyncGenerator[str, None]:
        """
        Generate detailed feedback with streaming.
        
        1. Retrieve question and material context
        2. Generate feedback explaining correctness
        3. Stream response
        """
        # Retrieve question context
        db = SessionLocal()
        question = db.query(Question).filter(Question.id == question_id).first()
        
        # Retrieve material chunks
        client = get_chroma_client()
        collection = get_materials_collection(client)
        
        results = collection.query(
            query_texts=[f"Explain: {question.question_text}"],
            n_results=3
        )
        
        context = "\n\n".join(results['documents'][0])
        
        # Build feedback prompt
        correctness = "correct" if is_correct else "incorrect"
        
        prompt = f"""You are a helpful tutor. Provide detailed feedback for a {correctness} answer.

Question: {question.question_text}
Selected Answer: {selected_answer}
Correct Answer: {question.correct_answer}
Explanation from material: {question.explanation}

Material Context:
{context}

Provide:
1. Confirmation of correctness
2. Detailed explanation
3. Additional insights
4. Related concepts

Format as markdown with clear sections.
"""
        
        # Stream feedback
        stream = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert tutor."},
                {"role": "user", "content": prompt}
            ],
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

#### 2. Streaming Endpoint
```python
@router.get("/feedback/{session_id}/{question_id}")
async def get_feedback(
    session_id: str,
    question_id: str,
    selected_answer: str,
    is_correct: bool
):
    """Get feedback with streaming."""
    async def generate():
        async for token in feedback_agent.generate_feedback(
            session_id, question_id, selected_answer, is_correct
        ):
            yield token
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Deliverables
- [ ] Fungsi `generate_feedback` dengan streaming
- [ ] RAG integration untuk context
- [ ] Streaming endpoint
- [ ] Unit tests

---

## Hari 8: Orkes Agen & Penanganan Error (12 Mei)

### Tujuan
Integrasi semua agen dan implementasi error handling.

### Tugas Detail

#### 1. Agent Orchestrator
**File: `app/agents/orchestrator.py`**
```python
from app.agents.ingestion import ingest_material
from app.agents.summarization import SummaryAgent
from app.agents.quiz import QuizAgent
from app.agents.feedback import FeedbackAgent

class AgentOrchestrator:
    def __init__(self):
        self.ingestion_agent = None
        self.summary_agent = SummaryAgent()
        self.quiz_agent = QuizAgent()
        self.feedback_agent = FeedbackAgent()
    
    async def process_material(
        self,
        material_id: str,
        file_path: str,
        file_type: str
    ) -> dict:
        """Process material through full pipeline."""
        # Ingest
        ingestion_result = await ingest_material(material_id, file_path, file_type)
        
        return ingestion_result
    
    async def generate_material_summary(
        self,
        material_id: str
    ) -> str:
        """Generate summary for material."""
        summary = ""
        async for token in self.summary_agent.generate_summary(material_id):
            summary += token
        return summary
    
    async def generate_material_quiz(
        self,
        quiz_id: str,
        material_id: str,
        difficulty: str,
        num_questions: int
    ) -> List[MCQQuestion]:
        """Generate quiz for material."""
        return await self.quiz_agent.generate_mcq_quiz(
            quiz_id, material_id, difficulty, num_questions
        )
```

#### 2. Error Handling
```python
from tenacity import retry, stop_after_attempt, wait_exponential

class AgentError(Exception):
    pass

class LLMError(AgentError):
    pass

class VectorDBError(AgentError):
    pass

class IngestionError(AgentError):
    pass

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def safe_llm_call(func, *args, **kwargs):
    """Safe LLM call with retry."""
    try:
        return await func(*args, **kwargs)
    except Exception as e:
        raise LLMError(f"LLM call failed: {str(e)}")

async def safe_vector_db_call(func, *args, **kwargs):
    """Safe Vector DB call with retry."""
    try:
        return await func(*args, **kwargs)
    except Exception as e:
        raise VectorDBError(f"Vector DB operation failed: {str(e)}")
```

#### 3. Circuit Breaker
```python
from app.agents.circuit_breaker import CircuitBreaker

class AgentCircuitBreaker:
    def __init__(self):
        self.llm_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=30
        )
        self.vdb_breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=10
        )
```

### Deliverables
- [ ] Agent orchestrator
- [ ] Error handling untuk semua agen
- [ ] Retry logic
- [ ] Circuit breaker implementation
- [ ] Integration tests

---

## Hari 9: Penyempurnaan RAG (13 Mei)

### Tujuan
Implementasi advanced RAG techniques.

### Tugas Detail

#### 1. Hybrid Search
```python
async def hybrid_search(
    query: str,
    material_id: str,
    keyword_weight: float = 0.3,
    vector_weight: float = 0.7
) -> List[str]:
    """Combine keyword and vector search."""
    # Vector search
    vector_results = collection.query(
        query_texts=[query],
        n_results=10,
        where={"material_id": material_id}
    )
    
    # Keyword search (simple implementation)
    keyword_results = collection.get(
        where={"material_id": material_id}
    )
    
    # RRF (Reciprocal Rank Fusion)
    combined_scores = {}
    for i, doc in enumerate(vector_results['documents'][0]):
        combined_scores[doc] = combined_scores.get(doc, 0) + vector_weight / (i + 60)
    
    for i, doc in enumerate(keyword_results['documents']):
        combined_scores[doc] = combined_scores.get(doc, 0) + keyword_weight / (i + 60)
    
    # Sort and return top results
    sorted_docs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in sorted_docs[:5]]
```

#### 2. Re-ranking
```python
async def rerank_chunks(
    query: str,
    chunks: List[str],
    model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
) -> List[str]:
    """Re-rank chunks based on query relevance."""
    # Use cross-encoder for re-ranking
    # For now, use simple similarity scoring
    embeddings = OpenAIEmbeddings()
    query_embedding = await embeddings.embed(query)
    
    # Score each chunk
    scored_chunks = []
    for chunk in chunks:
        chunk_embedding = await embeddings.embed(chunk)
        score = cosine_similarity(query_embedding, chunk_embedding)
        scored_chunks.append((chunk, score))
    
    # Sort by score
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    
    return [chunk for chunk, score in scored_chunks]
```

#### 3. Chunking Strategy Evaluation
```python
from chonkie import SemanticChunker, RecursiveChunker

class ChunkingEvaluator:
    def __init__(self):
        self.semantic_chunker = SemanticChunker(
            embedding_model="text-embedding-3-small",
            threshold=0.5
        )
        self.recursive_chunker = RecursiveChunker(
            chunk_size=500,
            chunk_overlap=50
        )
        self.fixed_chunker = FixedChunker(chunk_size=500)
    
    def evaluate_chunking(self, text: str) -> dict:
        """Evaluate different chunking strategies."""
        semantic_chunks = self.semantic_chunker.chunk(text)
        recursive_chunks = self.recursive_chunker.chunk(text)
        fixed_chunks = self.fixed_chunker.chunk(text)
        
        return {
            "semantic": {
                "count": len(semantic_chunks),
                "avg_length": sum(len(c) for c in semantic_chunks) / len(semantic_chunks)
            },
            "recursive": {
                "count": len(recursive_chunks),
                "avg_length": sum(len(c) for c in recursive_chunks) / len(recursive_chunks)
            },
            "fixed": {
                "count": len(fixed_chunks),
                "avg_length": sum(len(c) for c in fixed_chunks) / len(fixed_chunks)
            }
        }
```

### Deliverables
- [ ] Hybrid search implementation
- [ ] Re-ranking logic
- [ ] Chunking strategy evaluation
- [ ] Performance benchmarks

---

## Hari 10: Penyesuaian Prompt & Mitigasi Halusinasi (14 Mei)

### Tujuan
Optimize prompts dan implementasi guardrails.

### Tugas Detail

#### 1. Prompt Optimization
```python
class PromptOptimizer:
    def __init__(self):
        self.system_prompts = {
            "summary": """You are an expert academic summarizer. 
            Follow these rules:
            1. Use clear, academic language
            2. Maintain factual accuracy
            3. Include key concepts and definitions
            4. Keep summary concise (max 300 words)""",
            
            "quiz": """You are an expert exam creator.
            Follow these rules:
            1. Questions must be unambiguous
            2. Distractors must be plausible
            3. Explanations must cite specific material
            4. All questions must be answerable from given context""",
            
            "feedback": """You are an expert tutor.
            Follow these rules:
            1. Be constructive and encouraging
            2. Explain why answer is correct/incorrect
            3. Provide additional context
            4. Reference specific material sections"""
        }
    
    def optimize_prompt(self, task: str, user_prompt: str) -> str:
        """Optimize prompt for specific task."""
        system_prompt = self.system_prompts[task]
        return f"{system_prompt}\n\nUser Request: {user_prompt}"
```

#### 2. Guardrails Implementation
```python
class Guardrails:
    def __init__(self):
        self.max_output_tokens = 2000
        self.required_fields = {
            "quiz": ["question", "options", "correct_answer", "explanation", "citation"],
            "summary": ["summary", "key_points"],
            "feedback": ["feedback", "explanation"]
        }
    
    def validate_quiz_output(self, output: dict) -> bool:
        """Validate quiz output structure."""
        if "questions" not in output:
            return False
        
        for question in output["questions"]:
            for field in self.required_fields["quiz"]:
                if field not in question:
                    return False
            
            # Validate options count
            if len(question["options"]) != 4:
                return False
            
            # Validate correct answer is in options
            if question["correct_answer"] not in question["options"]:
                return False
        
        return True
    
    def validate_output(self, task: str, output: dict) -> tuple[bool, str]:
        """Validate output for given task."""
        if task not in self.required_fields:
            return True, ""
        
        for field in self.required_fields[task]:
            if field not in output:
                return False, f"Missing required field: {field}"
        
        return True, ""
```

#### 3. Factual Accuracy Check
```python
async def check_factual_accuracy(
    generated_text: str,
    source_material: str
) -> dict:
    """Check if generated text is factually consistent with source."""
    prompt = f"""Check if the following text is factually consistent with the source material.

Source Material:
{source_material}

Generated Text:
{generated_text}

Respond with JSON:
{{
    "is_consistent": boolean,
    "discrepancies": ["list of discrepancies"],
    "confidence": 0.0-1.0
}}"""

    response = await client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a fact-checking assistant."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
```

### Deliverables
- [ ] Optimized system prompts
- [ ] Guardrails implementation
- [ ] Output validation
- [ ] Factual accuracy checking

---

## Hari 11: Pengujian Agen Akhir (15 Mei)

### Tujuan
Comprehensive testing semua agen.

### Tugas Detail

#### 1. Unit Tests
```python
# tests/test_agents.py
import pytest

@pytest.mark.asyncio
async def test_ingest_material_pdf():
    """Test PDF ingestion pipeline."""
    result = await ingest_material(
        material_id="test-123",
        file_path="tests/fixtures/test.pdf",
        file_type="pdf"
    )
    assert result["status"] == "success"
    assert result["chunks_count"] > 0

@pytest.mark.asyncio
async def test_generate_summary():
    """Test summary generation."""
    summary = ""
    async for token in summary_agent.generate_summary("test-123"):
        summary += token
    assert len(summary) > 0

@pytest.mark.asyncio
async def test_generate_quiz():
    """Test quiz generation."""
    quiz = await quiz_agent.generate_mcq_quiz(
        quiz_id="quiz-123",
        material_id="test-123",
        difficulty="medium",
        num_questions=3
    )
    assert len(quiz) == 3
    for question in quiz:
        assert len(question.options) == 4
        assert question.correct_answer in question.options
```

#### 2. Integration Tests
```python
# tests/test_integration.py
@pytest.mark.asyncio
async def test_full_pipeline():
    """Test complete ingestion to quiz pipeline."""
    # Ingest
    result = await ingest_material("full-test", "tests/fixtures/test.pdf", "pdf")
    assert result["status"] == "success"
    
    # Generate summary
    summary = ""
    async for token in summary_agent.generate_summary("full-test"):
        summary += token
    assert len(summary) > 0
    
    # Generate quiz
    quiz = await quiz_agent.generate_mcq_quiz(
        "quiz-full-test", "full-test", "medium", 2
    )
    assert len(quiz) == 2
```

#### 3. Performance Tests
```python
# tests/test_performance.py
import time

@pytest.mark.performance
@pytest.mark.asyncio
async def test_ingestion_performance():
    """Test ingestion performance."""
    start = time.time()
    result = await ingest_material("perf-test", "tests/fixtures/large.pdf", "pdf")
    elapsed = time.time() - start
    
    assert elapsed < 60  # Should complete in under 60 seconds
    assert result["status"] == "success"
```

#### 4. Load Tests
```python
# tests/test_load.py
import asyncio

@pytest.mark.load
@pytest.mark.asyncio
async def test_concurrent_quizzes():
    """Test concurrent quiz generation."""
    tasks = [
        quiz_agent.generate_mcq_quiz(
            f"quiz-{i}", "test-material", "medium", 5
        )
        for i in range(10)
    ]
    results = await asyncio.gather(*tasks)
    assert len(results) == 10
    for quiz in results:
        assert len(quiz) == 5
```

### Deliverables
- [ ] Unit tests untuk semua agen
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Test coverage report

---

## Catatan

- Semua agen menggunakan OpenAI GPT-4 untuk LLM
- Vector database: ChromaDB
- Text chunking: Chonkie
- PDF parsing: PyPDF
- Embeddings: OpenAI text-embedding-3-small
- Streaming: FastAPI StreamingResponse
- Error handling: Retry logic + Circuit breaker
- Testing: pytest + pytest-asyncio
