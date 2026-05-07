import os
from typing import Optional
from ingestion.pdf_loader import load_all_pdfs
from ingestion.chunker import chunk_documents
from ingestion.embedder import Embedder
from config.settings import settings


class IngestionPipeline:
    """
    Main ingestion pipeline for processing PDFs and storing embeddings.
    """
    
    def __init__(
        self,
        pdf_folder: Optional[str] = None,
        chroma_dir: Optional[str] = None,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        chunk_size: int = 300,
        chunk_overlap: int = 50
    ):
        """
        Initialize the ingestion pipeline.
        
        Args:
            pdf_folder: Path to PDF folder (uses settings default if None)
            chroma_dir: Path to ChromaDB directory (uses settings default if None)
            embedding_model: Model name for embeddings
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
        """
        self.pdf_folder = pdf_folder or "data/pdfs"
        self.chroma_dir = chroma_dir or settings.vectorstore_path
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedder = None
        self.total_chunks = 0
    
    def run(self) -> dict:
        """
        Execute the full ingestion pipeline:
        1. Load PDFs
        2. Chunk text
        3. Generate embeddings
        4. Store in ChromaDB
        
        Returns:
            dict: Pipeline execution results
        """
        try:
            print("🚀 Starting ingestion pipeline...")
            
            # Step 1: Load PDFs
            print(f"📄 Loading PDF documents from {self.pdf_folder}...")
            documents = load_all_pdfs(self.pdf_folder)
            
            if not documents:
                error_msg = f"❌ No documents found in {self.pdf_folder}"
                print(error_msg)
                return {
                    "status": "failed",
                    "message": error_msg,
                    "documents_count": 0,
                    "chunks_count": 0
                }
            
            print(f"✅ Loaded {len(documents)} PDF(s).")
            
            # Step 2: Chunk documents
            print(f"✂️ Chunking documents (size={self.chunk_size}, overlap={self.chunk_overlap})...")
            chunked_docs = chunk_documents(
                documents,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
            
            self.total_chunks = len(chunked_docs)
            print(f"✅ Created {self.total_chunks} chunks.")
            
            # Step 3: Initialize embedder
            print(f"🔧 Initializing embedding model ({self.embedding_model})...")
            self.embedder = Embedder(
                model_name=self.embedding_model,
                persist_directory=self.chroma_dir
            )
            
            # Step 4: Add chunks to DB
            print("💾 Storing embeddings in ChromaDB...")
            self.embedder.add_chunks_to_db(chunked_docs)
            
            # Step 5: Persist DB
            print("💾 Persisting ChromaDB...")
            self.embedder.persist()
            
            result_msg = "🎉 Ingestion pipeline completed successfully!"
            print(result_msg)
            
            return {
                "status": "success",
                "message": result_msg,
                "documents_count": len(documents),
                "chunks_count": self.total_chunks
            }
            
        except Exception as e:
            error_msg = f"❌ Ingestion failed: {str(e)}"
            print(error_msg)
            return {
                "status": "failed",
                "message": error_msg,
                "documents_count": 0,
                "chunks_count": 0
            }


# Convenience functions for API compatibility
def ingest_documents(pdf_folder: str, chunk_size: int = 500, chunk_overlap: int = 50) -> int:
    """
    Ingest documents from a folder.
    
    Args:
        pdf_folder: Path to PDF folder
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        
    Returns:
        int: Number of chunks created
    """
    pipeline = IngestionPipeline(
        pdf_folder=pdf_folder,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    result = pipeline.run()
    return result["chunks_count"]


def run_ingestion():
    """
    Run the ingestion pipeline with default settings.
    """
    pipeline = IngestionPipeline()
    pipeline.run()


if __name__ == "__main__":
    run_ingestion()
