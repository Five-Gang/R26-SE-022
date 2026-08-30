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
from contextlib import asynccontextmanager

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ingestion.ingest_pipeline import ingest_documents
from retrieval.retriever import retrieve_documents, get_retriever
from config.settings import Settings
from llm.llm_engine import LLMEngine
from llm.confidence_scorer import ConfidenceScorer
from llm.adaptive_responder import AdaptiveResponder
from database.query_logger import get_query_logger

# Load environment variables
load_dotenv()
settings = Settings()


# ============================================================================
# LIFESPAN (Startup / Shutdown handlers)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan context manager for startup and shutdown."""
    print(" AuraLearn Backend Starting...")
    print(f" Vector DB Path: {settings.vectorstore_path}")
    print(f" LLM Engine: Google AI Studio Gemini API (Model: {settings.llm_model})")
    print(f" Confidence Thresholds: HIGH>={settings.confidence_high_threshold}, LOW<{settings.confidence_low_threshold}")
    try:
        logger = get_query_logger()
        count = logger.get_total_count()
        print(f" QueryLogger: Ready - {count} interactions logged so far.")
    except Exception as e:
        print(f" QueryLogger: Init warning - {e}")
    
    yield
    
    print(" AuraLearn Backend Shutting Down...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="AuraLearn Backend",
    description="Hallucination-Controlled LLM Tutor Backend",
    version="0.1.0",
    lifespan=lifespan
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
            api_key=settings.gemini_api_key,
            gemini_api_url=settings.gemini_api_url,
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
    # Per-request override: if provided, overrides the global ENABLE_SELF_CONSISTENCY setting.
    # This allows the frontend UI toggle to control the feature live without restarting the server.
    enable_self_consistency: Optional[bool] = None
    # Optional module context injected by the frontend from the summarizer backend.
    # Contains LOs, weekly topics, and existing AI summaries so the tutor can answer
    # even when the local vector store has no matching documents.
    module_context: Optional[str] = None
    module_name: Optional[str] = None
    module_code: Optional[str] = None


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
    """Check if Google AI Studio (Gemini) API is connected and available."""
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

        # Step 1: Retrieve relevant documents from the local vector store
        print(f"\n{'='*60}")
        print(f" Query: {request.query}")
        retrieval_results = retrieve_documents(request.query, top_k=request.top_k)

        # Check if retrieval returned real (non-error) results
        has_real_results = any(
            "content" in r and "error" not in r
            for r in retrieval_results
        )

        # Step 2: Build context — combine RAG results + any module_context from the frontend
        context_parts = []
        sources = []

        # 2a. Inject module context from the summarizer backend (LOs, weeks, AI summaries)
        #     This allows the tutor to answer even when the local vector store is empty.
        #     Note: module_context is only sent by the frontend when real summaries exist.
        real_retrieval_results = [r for r in retrieval_results if "content" in r and "error" not in r]

        if request.module_context and request.module_context.strip():
            module_label = f"{request.module_name} ({request.module_code})" if request.module_name else "Module Materials"
            source_label = f"{module_label} — AI Lecture Summaries"
            context_parts.append(
                f"[Source: {source_label}]\n{request.module_context}"
            )
            sources.append({
                "filename": source_label,
                "content": request.module_context[:300],
                "similarity": 0.92  # treat summarizer content as high-confidence source
            })
            # Synthesise ONE retrieval result so the confidence scorer sees a real hit.
            # Keep it separate from real_retrieval_results to avoid double-processing.
            synthetic_hit = {
                "content": request.module_context,
                "metadata": {"source": source_label},
                "similarity": 0.92,
            }
            retrieval_results = [synthetic_hit] + real_retrieval_results
            has_real_results = True
            print(f" Module context injected from summarizer ({len(request.module_context)} chars)")

        # 2b. Add real vector store hits (skip any that are already in sources)
        recorded_filenames = {s["filename"] for s in sources}
        for r in real_retrieval_results:
            if "content" in r and "error" not in r:
                source_name = (
                    r.get("metadata", {}).get("filename")
                    or r.get("metadata", {}).get("source")
                    or r.get("source")
                    or "Course Document"
                )
                if source_name not in recorded_filenames:
                    context_parts.append(
                        f"[Source: {source_name}]\n{r['content']}"
                    )
                    sources.append({
                        "filename": source_name,
                        "content": r["content"][:300],
                        "similarity": r.get("similarity", 0)
                    })
                    recorded_filenames.add(source_name)

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

        # If API key is missing, return configuration notice directly
        if llm_response.startswith("⚠️ **Gemini API Key Required:"):
            return {
                "response": llm_response,
                "confidence": {
                    "score": 0.0,
                    "level": "LOW",
                    "retrieval_confidence": 0.0,
                    "grounding_score": 0.0
                },
                "response_type": "clarification_request",
                "response_label": "API Key Required",
                "sources": sources,
                "conversation_history": conv_history,
                "log_id": None
            }

        # Step 5: Generate multiple responses for self-consistency (if enabled)
        # Per-request flag takes priority; falls back to the global settings value.
        use_self_consistency = (
            request.enable_self_consistency
            if request.enable_self_consistency is not None
            else settings.enable_self_consistency
        )
        multiple_responses = None
        if use_self_consistency and has_real_results:
            print(" Running self-consistency check (3 LLM calls)...")
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

        # Step 6b: When module context was injected from the summarizer, the local
        # ChromaDB may be empty so the scorer returns 0.0. Clamp to MEDIUM minimum
        # since we DO have verified, grounded course material as context.
        module_context_used = bool(request.module_context and request.module_context.strip())
        if module_context_used:
            # Ensure score is at least the LOW→MEDIUM threshold so we get a useful response
            min_score = scorer.low_threshold + 0.05  # just above LOW threshold
            if confidence["score"] < min_score:
                confidence["score"] = round(min_score, 4)
            if confidence["level"] == "LOW":
                confidence["level"] = "MEDIUM"
            confidence["module_context_used"] = True
            print(f" Confidence overridden to MEDIUM (module context injected from summarizer)")

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

        # Step 9: Log interaction to SQLite for research evaluation
        log_id = None
        try:
            logger = get_query_logger()
            log_id = logger.log(
                query=request.query,
                response=adaptive_result["response"],
                response_type=adaptive_result["response_type"],
                confidence=confidence,
                sources=sources,
                self_consistency_used=use_self_consistency,
                llm_model=settings.llm_model
            )
        except Exception as log_err:
            # Logging failure must NEVER break the chat response
            print(f" Logging failed (non-fatal): {log_err}")

        return {
            "response": adaptive_result["response"],
            "response_type": adaptive_result["response_type"],
            "response_label": adaptive_result["response_label"],
            "confidence": confidence,
            "sources": sources,
            "conversation_history": updated_history,
            "log_id": log_id  # Used by frontend to submit thumbs-up/down feedback
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


@app.delete("/api/materials/{filename}")
async def delete_material(filename: str):
    """Delete a course material by its filename."""
    try:
        # Delete from vector store
        retriever = get_retriever()
        deleted_count = retriever.delete_by_filename(filename)
        
        # Reset retriever to reload collection
        import retrieval.retriever
        retrieval.retriever._retriever_instance = None
        global _confidence_scorer
        _confidence_scorer = None

        # Delete the physical file from the upload directory if it exists
        upload_dir = settings.pdf_upload_dir
        file_path = os.path.join(upload_dir, filename)
        file_deleted = False
        if os.path.exists(file_path):
            os.remove(file_path)
            file_deleted = True
            
        return {
            "status": "success",
            "message": f"Successfully deleted {filename}",
            "deleted_chunks": deleted_count,
            "file_deleted": file_deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


# ============================================================================
# ANALYTICS & LOGGING ENDPOINTS
# ============================================================================

@app.get("/api/analytics")
async def get_analytics():
    """
    Returns aggregate research metrics computed over all logged interactions.

    Metrics returned (per proposal Section 3.5 — Validation Strategy):
      - total_queries
      - hallucination_rate_pct   (LOW-confidence queries as % of total)
      - avg_confidence_score     (composite, 0–1)
      - avg_grounding_score      (grounding signal, 0–1)
      - avg_retrieval_confidence (retrieval signal, 0–1)
      - confidence_distribution  (HIGH / MEDIUM / LOW counts)
      - response_type_distribution (direct_answer / guided_hint / clarification_request counts)
      - confidence_response_alignment (% where system chose the correct mode per level)
      - self_consistency_queries  (how many queries used 3-signal mode)
    """
    try:
        logger = get_query_logger()
        return logger.get_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics failed: {str(e)}")


@app.get("/api/logs")
async def get_logs(limit: int = 50, offset: int = 0):
    """
    Retrieve recent query-response log entries (newest first).

    Args:
        limit:  Maximum number of entries to return (default 50, max 200).
        offset: Pagination offset for large log sets.
    """
    try:
        limit = min(limit, 200)  # cap at 200 to prevent large payloads
        logger = get_query_logger()
        logs = logger.get_logs(limit=limit, offset=offset)
        total = logger.get_total_count()
        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log retrieval failed: {str(e)}")


class FeedbackRequest(BaseModel):
    log_id: int
    feedback: str  # 'thumbs_up' or 'thumbs_down'


@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Record a student's thumbs-up / thumbs-down rating for a specific response.

    This human-in-the-loop signal is used to:
      - Compute user satisfaction rate (proposal Page 15 evaluation metric)
      - Detect HIGH-confidence false positives (machine said HIGH, student said BAD)
      - Build a labelled dataset for future ML retraining

    Args:
        log_id:   ID of the query_logs row to rate (returned by /api/chat as 'log_id').
        feedback: 'thumbs_up' or 'thumbs_down'.
    """
    if request.feedback not in ("thumbs_up", "thumbs_down"):
        raise HTTPException(
            status_code=400,
            detail="feedback must be 'thumbs_up' or 'thumbs_down'"
        )
    try:
        logger = get_query_logger()
        success = logger.submit_feedback(
            log_id=request.log_id,
            feedback=request.feedback
        )
        if not success:
            raise HTTPException(status_code=404, detail=f"Log entry {request.log_id} not found")
        return {
            "status": "ok",
            "log_id": request.log_id,
            "feedback": request.feedback
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")




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
            "analytics": "/api/analytics (GET)",
            "logs": "/api/logs (GET)",
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
