import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings and configuration.
    Loads from environment variables with fallback defaults.
    """
    
    # Application Settings
    app_name: str = "AuraLearn"
    app_version: str = "0.1.0"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    environment: str = os.getenv("ENV", "development")
    
    # Server Settings
    backend_host: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    backend_port: int = int(os.getenv("BACKEND_PORT", 8000))
    
    # Frontend Settings (for CORS)
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Database/Vector Store Settings
    vectorstore_path: str = os.getenv("VECTORSTORE_PATH", "data/chroma")
    vectorstore_type: str = os.getenv("VECTORSTORE_TYPE", "chroma")
    
    # PDF Processing Settings
    pdf_chunk_size: int = int(os.getenv("PDF_CHUNK_SIZE", 500))
    pdf_chunk_overlap: int = int(os.getenv("PDF_CHUNK_OVERLAP", 50))
    pdf_upload_dir: str = os.getenv("PDF_UPLOAD_DIR", "data/pdfs")
    
    # Embedding Settings
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", 384))
    
    # Retrieval Settings
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", 5))
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", 0.3))
    
    # LLM Settings (Ollama)
    llm_model: str = os.getenv("LLM_MODEL", "llama3.2")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", 0.7))
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", 1024))
    ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    
    # Confidence Thresholds
    confidence_high_threshold: float = float(os.getenv("CONFIDENCE_HIGH_THRESHOLD", 0.75))
    confidence_low_threshold: float = float(os.getenv("CONFIDENCE_LOW_THRESHOLD", 0.45))
    enable_self_consistency: bool = os.getenv("ENABLE_SELF_CONSISTENCY", "False").lower() == "true"
    self_consistency_samples: int = int(os.getenv("SELF_CONSISTENCY_SAMPLES", 3))
    
    # API Keys (optional, for future OpenAI integration)
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Create global settings instance
settings = Settings()
