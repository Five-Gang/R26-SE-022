import os
import sys
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ingestion.ingest_pipeline import ingest_documents
from retrieval.retriever import retrieve_documents
from config.settings import Settings

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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],  # Allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Health check endpoint to verify the backend is running.
    
    Returns:
        dict: Status and version information
    """
    return {
        "status": "healthy",
        "version": "0.1.0"
    }


# ============================================================================
# INGESTION ENDPOINTS
# ============================================================================

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_pdfs(request: IngestRequest):
    """
    Ingest PDF documents from a folder into the vector store.
    
    Args:
        request: Contains the path to the PDF folder
        
    Returns:
        dict: Status and count of ingested documents
    """
    try:
        if not os.path.exists(request.pdf_folder):
            raise HTTPException(status_code=400, detail=f"PDF folder not found: {request.pdf_folder}")
        
        # Run ingestion pipeline
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
    """
    Query the vector store and retrieve relevant documents.
    
    Args:
        request: Contains the query and top_k parameter
        
    Returns:
        dict: Query results with relevant documents
    """
    try:
        if not request.query or request.query.strip() == "":
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        if request.top_k < 1:
            raise HTTPException(status_code=400, detail="top_k must be at least 1")
        
        # Retrieve relevant documents
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
    """
    Alternative endpoint for querying documents (same as /retrieve).
    
    Args:
        request: Contains the query and top_k parameter
        
    Returns:
        dict: Query results with relevant documents
    """
    return await retrieve(request)


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        dict: API information and available endpoints
    """
    return {
        "name": "AuraLearn Backend API",
        "version": "0.1.0",
        "description": "Hallucination-Controlled LLM Tutor",
        "endpoints": {
            "health": "/health",
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
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }


# ============================================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("🚀 AuraLearn Backend Starting...")
    print(f"📊 Vector DB Path: {settings.vectorstore_path if hasattr(settings, 'vectorstore_path') else 'data/chroma'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print("🛑 AuraLearn Backend Shutting Down...")


# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Read host and port from environment or use defaults
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    print(f"🌐 Starting server on {host}:{port}")
    print(f"📖 API Docs available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENV", "development") == "development"
    )
