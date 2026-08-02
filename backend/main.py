import os
import sys
# Load the newer sqlite3.dll for ChromaDB
try:
    os.add_dll_directory(os.path.abspath("dlls"))
except Exception:
    pass
import sqlite3

import os
import sys
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ingestion.ingest_pipeline import ingest_documents
from retrieval.retriever import retrieve_documents, get_retriever
from config.settings import Settings
from llm.llm_engine import LLMEngine
from llm.confidence_scorer import ConfidenceScorer
from llm.adaptive_responder import AdaptiveResponder

# Load environment variables
load_dotenv()
settings = Settings()

# Initialize FastAPI app
app = FastAPI(
    title="AuraLearn Backend",
    description="Hallucination-Controlled LLM Tutor Backend",
    version="0.1.0"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# GLOBAL INSTANCES (lazy initialized)
# ============================================================================

_llm_engine = None
_confidence_scorer = None
_adaptive_responder = None


def get_llm_engine() -> LLMEngine:
    global _llm_engine
    if _llm_engine is None:
        _llm_engine = LLMEngine(
            model_name=settings.llm_model,
            ollama_url=settings.ollama_url,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens
        )
    return _llm_engine


def get_confidence_scorer() -> ConfidenceScorer:
    global _confidence_scorer
    if _confidence_scorer is None:
        # Reuse embedding model from retriever for efficiency
        retriever = get_retriever()
        _confidence_scorer = ConfidenceScorer(
            embedding_model=retriever.query_embedder.model,
            high_threshold=settings.confidence_high_threshold,
            low_threshold=settings.confidence_low_threshold
        )
    return _confidence_scorer


def get_adaptive_responder() -> AdaptiveResponder:
    global _adaptive_responder
    if _adaptive_responder is None:
        _adaptive_responder = AdaptiveResponder()
    return _adaptive_responder


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class HealthCheckResponse(BaseModel):
    status: str
    version: str


class IngestRequest(BaseModel):
    pdf_folder: str


class IngestResponse(BaseModel):
    message: str
    documents_count: int
    status: str


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5


class QueryResponse(BaseModel):
    query: str
    results: List[dict]
    count: int


class ConversationMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    conversation_history: List[ConversationMessage] = []
    top_k: int = 5


class ChatResponse(BaseModel):
    response: str
    response_type: str
    response_label: str
    confidence: dict
    sources: List[dict]
    conversation_history: List[dict]


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint to verify the backend is running."""
    return {
        "status": "healthy",
        "version": "0.1.0"
    }


# ============================================================================
# LLM STATUS ENDPOINT
# ============================================================================

@app.get("/api/llm/status")
async def llm_status():
    """Check if Ollama LLM is available."""
    engine = get_llm_engine()
    return engine.check_availability()


# ============================================================================
# CHAT ENDPOINT (Main Tutoring Pipeline)
# ============================================================================

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Main tutoring endpoint. Runs the full RAG + LLM + Confidence pipeline:
    1. Retrieve relevant documents
    2. Generate LLM response with context
    3. Compute confidence score
    4. Apply adaptive response strategy
    5. Return grounded response with metadata
    """
    try:
        if not request.query or request.query.strip() == "":
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        llm_engine = get_llm_engine()
        scorer = get_confidence_scorer()
        responder = get_adaptive_responder()

        # Step 1: Retrieve relevant documents
        print(f"\n{'='*60}")
        print(f" Query: {request.query}")
        retrieval_results = retrieve_documents(request.query, top_k=request.top_k)

        # Check if retrieval returned errors
        has_real_results = any(
            "content" in r and "error" not in r
            for r in retrieval_results
        )

        # Step 2: Build context from retrieved documents
        context_parts = []
        sources = []
        if has_real_results:
            for r in retrieval_results:
                if "content" in r and "error" not in r:
                    source_name = r.get("source", "unknown")
                    context_parts.append(
                        f"[Source: {source_name}]\n{r['content']}"
                    )
                    sources.append({
                        "filename": source_name,
                        "content": r["content"][:300],
                        "similarity": r.get("similarity", 0)
                    })

        context = "\n\n".join(context_parts) if context_parts else "No relevant course materials found."

        # Step 3: Convert conversation history
        conv_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        # Step 4: Generate LLM response
        print(" Generating LLM response...")
        llm_response = llm_engine.generate(
            query=request.query,
            context=context,
            conversation_history=conv_history
        )

        # Step 5: Generate multiple responses for self-consistency (if enabled)
        multiple_responses = None
        if settings.enable_self_consistency and has_real_results:
            print(" Running self-consistency check...")
            multiple_responses = llm_engine.generate_multiple(
                query=request.query,
                context=context,
                n=settings.self_consistency_samples,
                conversation_history=conv_history
            )

        # Step 6: Compute confidence score
        print(" Computing confidence...")
        confidence = scorer.score(
            response_text=llm_response,
            retrieval_results=retrieval_results if has_real_results else [],
            multiple_responses=multiple_responses
        )

        # Step 7: Apply adaptive response strategy
        print(f" Confidence: {confidence['score']} ({confidence['level']})")
        adaptive_result = responder.generate_response(
            llm_response=llm_response,
            confidence_level=confidence["level"],
            confidence_score=confidence["score"],
            sources=sources,
            original_query=request.query
        )

        # Step 8: Update conversation history
        updated_history = conv_history.copy()
        updated_history.append({"role": "user", "content": request.query})
        updated_history.append({"role": "assistant", "content": adaptive_result["response"]})

        print(f" Response type: {adaptive_result['response_type']}")
        print(f"{'='*60}\n")

        return {
            "response": adaptive_result["response"],
            "response_type": adaptive_result["response_type"],
            "response_label": adaptive_result["response_label"],
            "confidence": confidence,
            "sources": sources,
            "conversation_history": updated_history
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f" Chat error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# ============================================================================
# PDF UPLOAD ENDPOINT
# ============================================================================

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and ingest it into the vector store.
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        # Ensure upload directory exists
        upload_dir = settings.pdf_upload_dir
        os.makedirs(upload_dir, exist_ok=True)

        # Save the uploaded file
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        print(f" Uploaded: {file.filename} ({len(content)} bytes)")

        # Run ingestion on the upload directory
        documents_count = ingest_documents(upload_dir)

        # Reset retriever to reload collection
        import retrieval.retriever
        retrieval.retriever._retriever_instance = None
        global _confidence_scorer
        _confidence_scorer = None

        return {
            "message": f"Successfully uploaded and ingested {file.filename}",
            "filename": file.filename,
            "documents_count": documents_count,
            "status": "success"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f" Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ============================================================================
# MATERIALS ENDPOINT
# ============================================================================

@app.get("/api/materials")
async def get_materials():
    """Get information about ingested course materials."""
    try:
        retriever = get_retriever()
        stats = retriever.get_collection_stats()
        return stats
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "document_count": 0
        }


# ============================================================================
# INGESTION ENDPOINTS
# ============================================================================

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_pdfs(request: IngestRequest):
    """Ingest PDF documents from a folder into the vector store."""
    try:
        if not os.path.exists(request.pdf_folder):
            raise HTTPException(status_code=400, detail=f"PDF folder not found: {request.pdf_folder}")
        
        documents_count = ingest_documents(request.pdf_folder)
        
        return {
            "message": f"Successfully ingested documents from {request.pdf_folder}",
            "documents_count": documents_count,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


# ============================================================================
# RETRIEVAL ENDPOINTS
# ============================================================================

@app.post("/api/retrieve", response_model=QueryResponse)
async def retrieve(request: QueryRequest):
    """Query the vector store and retrieve relevant documents."""
    try:
        if not request.query or request.query.strip() == "":
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        if request.top_k < 1:
            raise HTTPException(status_code=400, detail="top_k must be at least 1")
        
        results = retrieve_documents(request.query, top_k=request.top_k)
        
        return {
            "query": request.query,
            "results": results,
            "count": len(results)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


@app.post("/api/query")
async def query(request: QueryRequest):
    """Alternative endpoint for querying documents (same as /retrieve)."""
    return await retrieve(request)


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "AuraLearn Backend API",
        "version": "0.1.0",
        "description": "Hallucination-Controlled LLM Tutor",
        "endpoints": {
            "health": "/health",
            "llm_status": "/api/llm/status",
            "chat": "/api/chat (POST)",
            "upload": "/api/upload (POST)",
            "materials": "/api/materials",
            "ingest": "/api/ingest (POST)",
            "retrieve": "/api/retrieve (POST)",
            "query": "/api/query (POST)",
            "docs": "/docs"
        }
    }


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )


# ============================================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print(" AuraLearn Backend Starting...")
    print(f" Vector DB Path: {settings.vectorstore_path}")
    print(f" LLM Model: {settings.llm_model} (via Ollama at {settings.ollama_url})")
    print(f" Confidence Thresholds: HIGH≥{settings.confidence_high_threshold}, LOW<{settings.confidence_low_threshold}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print(" AuraLearn Backend Shutting Down...")


# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    print(f" Starting server on {host}:{port}")
    print(f" API Docs available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENV", "development") == "development"
    )
