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
│   ├── embedding.py       # Custom embedding function
│   └── collections.py     # Collection definitions
├── agents/
│   ├── __init__.py
│   ├── base.py            # Base agent class
│   ├── chunking.py        # Text chunking
│   └── parsers.py         # Document parsers
```

#### 3. Inisialisasi ChromaDB Client
**File: `app/vector_db/client.py`**
```python
import chromadb

chromadb_client = chromadb.PersistentClient(path="chroma_db")
```

#### 4. Custom Embedding Function
**File: `app/vector_db/embedding.py`**
```python
from app.utils.oa_client import oa_client
from chromadb import EmbeddingFunction, Embeddings
import numpy as np


class CustomEmbeddingFunction(EmbeddingFunction):
    def __init__(self, model: str = "perplexity/pplx-embed-v1-4b"):
        self.client = oa_client
        self.model = model

    def __call__(self, input: list[str]) -> Embeddings:
        response = self.client.embeddings.create(
            model=self.model,
            input=input,
        )
        return [np.array(item.embedding, dtype=np.float32) for item in response.data]
```

#### 5. Definisi Collections
**File: `app/vector_db/collections.py`**
```python
from app.vector_db.client import chromadb_client
from app.vector_db.embedding import CustomEmbeddingFunction


def get_pdf_collection():
    return chromadb_client.get_or_create_collection(
        name="pdf_rag", embedding_function=CustomEmbeddingFunction()
    )
```

#### 6. Fungsi `ingest_material` Signature
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
- [ ] Custom embedding function configured
- [ ] Collection `pdf_rag` tersedia
- [ ] Fungsi `ingest_material` signature terdefinisi

---

## Hari 2: Arsitektur RAG & Embedding (6 Mei)

### Tujuan
Implementasi embedding pipeline dan text chunking.

### Tugas Detail

#### 1. Text Chunking dengan Chonkie
**File: `app/agents/chunking.py`**
```python
from chonkie import SemanticChunker
from typing import List


class DocumentChunker:
    def __init__(self):
        self.chunker = SemanticChunker(
            embedding_model="text-embedding-3-small",
            threshold=0.5
        )

    def chunk(self, text: str) -> List[str]:
        chunks = self.chunker.chunk(text)
        return [c.text for c in chunks]
```

#### 2. PDF Parser
**File: `app/agents/parsers.py`**
```python
from pypdf import PdfReader


def pdf_parser(file_path: str) -> list[str]:
    reader = PdfReader(file_path)
    return [page.extract_text() for page in reader.pages if page.extract_text()]


def txt_parser(file_path: str) -> list[str]:
    with open(file_path, "r", encoding="utf-8") as file:
        return [file.read()]
```

#### 3. Embedding Pipeline (ChromaDB Auto-Embedding)
**File: `app/agents/embedding_pipeline.py`**
```python
from app.vector_db.collections import get_pdf_collection


def store_chunks(chunks: list[str], material_id: str) -> None:
    """
    Store chunks in ChromaDB using auto-embedding.
    ChromaDB will automatically generate embeddings via CustomEmbeddingFunction.
    """
    collection = get_pdf_collection()
    collection.add(
        documents=chunks,
        ids=[f"{material_id}_chunk_{i}" for i in range(len(chunks))],
        metadatas=[{"material_id": material_id, "chunk_index": i} for i in range(len(chunks))]
    )
```

### Deliverables
- [ ] Text chunking untuk PDF dan TXT
- [ ] Document parsers (pdf_parser, txt_parser)
- [ ] Chunk storage with auto-embedding

---

## Hari 3: Agen Ingestion (7 Mei)

### Tujuan
Implementasi fungsi `ingest_material` lengkap.

### Tugas Detail

#### 1. Ingestion Agent Implementation
**File: `app/agents/ingestion.py`**
```python
from typing import Literal
from app.vector_db.collections import get_pdf_collection
from app.agents.chunking import DocumentChunker
from app.agents.parsers import pdf_parser, txt_parser
from app.agents.embedding_pipeline import store_chunks
from app.database import SessionLocal
from app.models.material import Material


async def ingest_material(
    material_id: str,
    file_path: str,
    file_type: Literal["pdf", "txt"]
) -> dict:
    """
    Ingest material into vector database.
    
    1. Parse document
    2. Chunk text
    3. Store in ChromaDB (embeddings auto-generated)
    4. Update database
    """
    # Parse document
    if file_type == "pdf":
        pages = pdf_parser(file_path)
    else:
        pages = txt_parser(file_path)
    
    # Chunk text
    chunker = DocumentChunker()
    all_chunks = []
    for page in pages:
        chunks = chunker.chunk(page)
        all_chunks.extend(chunks)
    
    # Store in ChromaDB (auto-embedding via CustomEmbeddingFunction)
    store_chunks(all_chunks, material_id)
    
    # Update material status in database
    db = SessionLocal()
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.status = "processed"
        db.commit()
    db.close()
    
    return {
        "status": "success",
        "material_id": material_id,
        "chunks_count": len(all_chunks),
        "file_type": file_type
    }
```

#### 2. Error Handling
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
from app.vector_db.collections import get_pdf_collection


class SummaryAgent:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
    
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
        collection = get_pdf_collection()
        
        results = collection.query(
            query_texts=[f"Summarize this material: {material_id}"],
            n_results=5,
            where={"material_id": material_id}
        )
        
        context = "\n\n".join(results['documents'][0]) if results['documents'] else ""
        
        stream = await self.client.chat.completions.create(
            model="gpt-4o",
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
summary_agent = SummaryAgent()


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
from openai import AsyncOpenAI
from app.core.config import settings
from app.vector_db.collections import get_pdf_collection
import json


class MCQQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    citation: str


class QuizAgent:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
    
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
        collection = get_pdf_collection()
        
        results = collection.query(
            query_texts=[f"Generate quiz questions about {material_id}"],
            n_results=10,
            where={"material_id": material_id}
        )
        
        context = "\n\n".join(results['documents'][0]) if results['documents'] else ""
        
        prompt = self._build_quiz_prompt(context, difficulty, num_questions)
        
        response = await self.client.chat.completions.create(
            model="gpt-4o",
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
    
    if user_level:
        if user_level <= 3:
            actual_difficulty = "easy"
        elif user_level <= 7:
            actual_difficulty = "medium"
        else:
            actual_difficulty = "hard"
    else:
        actual_difficulty = difficulty
    
    chunk_filter = {
        "easy": "basic concepts",
        "medium": "core concepts",
        "hard": "advanced concepts"
    }
    
    collection = get_pdf_collection()
    results = collection.query(
        query_texts=[f"{chunk_filter[actual_difficulty]} about {material_id}"],
        n_results=10,
        where={"material_id": material_id}
    )
    
    return await self.generate_mcq_quiz(
        quiz_id, material_id, actual_difficulty, num_questions
    )
```

#### 2. Database Persistence
**File: `app/models/quiz.py`**
```python
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class Question(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quiz_id: str = Field(foreign_key="quizzes.id")
    question_text: str
    options: str = Field(sa_column_kwargs={"type_": "JSON"})
    correct_answer: str
    explanation: str
    citation: str
    difficulty: str
    
    quiz: Optional["Quiz"] = Relationship(back_populates="questions")


class Quiz(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    material_id: str = Field(foreign_key="materials.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    questions: List["Question"] = Relationship(back_populates="quiz")
```

#### 3. Save Quiz to Database
```python
from app.database import SessionLocal


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
            difficulty="medium"
        )
        db.add(db_question)
    
    db.commit()
    db.close()
    
    return quiz_id
```

### Deliverables
- [ ] Adaptive difficulty logic
- [ ] Database models untuk Quiz dan Question
- [ ] Persistence logic

---

## Hari 7: Agen Umpan Balik Streaming (11 Mei)

### Tujuan
Implementasi `generate_feedback` dengan streaming.

### Tugas Detail

#### 1. Feedback Agent
**File: `app/agents/feedback.py`**
```python
from typing import AsyncGenerator
from openai import AsyncOpenAI
from app.core.config import settings
from app.vector_db.collections import get_pdf_collection
from app.database import SessionLocal
from app.models.question import Question


class FeedbackAgent:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
    
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
        db = SessionLocal()
        question = db.query(Question).filter(Question.id == question_id).first()
        db.close()
        
        collection = get_pdf_collection()
        results = collection.query(
            query_texts=[f"Explain: {question.question_text}"],
            n_results=3,
            where={"material_id": question.quiz.material_id if hasattr(question, 'quiz') else None}
        )
        
        context = "\n\n".join(results['documents'][0]) if results['documents'] else ""
        
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
        
        stream = await self.client.chat.completions.create(
            model="gpt-4o",
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
from typing import List


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
class AgentError(Exception):
    pass

class LLMError(AgentError):
    pass

class VectorDBError(AgentError):
    pass

class IngestionError(AgentError):
    pass
```

### Deliverables
- [ ] Agent orchestrator
- [ ] Error handling untuk semua agen

---

## Hari 9: Penyempurnaan RAG (13 Mei)

### Tujuan
Implementasi advanced RAG techniques.

### Tugas Detail

#### 1. Hybrid Search
```python
def hybrid_search(
    query: str,
    material_id: str,
    keyword_weight: float = 0.3,
    vector_weight: float = 0.7
) -> List[str]:
    """Combine keyword and vector search."""
    collection = get_pdf_collection()
    
    vector_results = collection.query(
        query_texts=[query],
        n_results=10,
        where={"material_id": material_id}
    )
    
    keyword_results = collection.get(
        where={"material_id": material_id}
    )
    
    combined_scores = {}
    for i, doc in enumerate(vector_results['documents'][0]):
        combined_scores[doc] = combined_scores.get(doc, 0) + vector_weight / (i + 60)
    
    for i, doc in enumerate(keyword_results['documents']):
        combined_scores[doc] = combined_scores.get(doc, 0) + keyword_weight / (i + 60)
    
    sorted_docs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in sorted_docs[:5]]
```

#### 2. Re-ranking
```python
from app.vector_db.embedding import CustomEmbeddingFunction
import numpy as np


def rerank_chunks(query: str, chunks: List[str]) -> List[str]:
    """Re-rank chunks based on query relevance."""
    embedding_fn = CustomEmbeddingFunction()
    
    query_embedding = embedding_fn([query])[0]
    chunk_embeddings = embedding_fn(chunks)
    
    scored_chunks = []
    for chunk, embedding in zip(chunks, chunk_embeddings):
        score = np.dot(query_embedding, embedding) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
        )
        scored_chunks.append((chunk, score))
    
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    return [chunk for chunk, score in scored_chunks]
```

### Deliverables
- [ ] Hybrid search implementation
- [ ] Re-ranking logic

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
            
            if len(question["options"]) != 4:
                return False
            
            if question["correct_answer"] not in question["options"]:
                return False
        
        return True
```

### Deliverables
- [ ] Optimized system prompts
- [ ] Guardrails implementation
- [ ] Output validation

---

## Catatan

- Semua agen menggunakan OpenAI-compatible API (via base_url config)
- Vector database: ChromaDB dengan PersistentClient
- Text chunking: Chonkie SemanticChunker
- PDF parsing: PyPDF
- Embeddings: Perplexity pplx-embed-v1-4b via CustomEmbeddingFunction
- Streaming: FastAPI StreamingResponse
- Error handling: Exception classes + retry logic