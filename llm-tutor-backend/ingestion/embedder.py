import os
import uuid
import PyPDF2
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from retrieval.retriever import get_retriever

class Embedder:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", chunk_size: int = 120, chunk_overlap: int = 25):
        self.model = SentenceTransformer(model_name)
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def process_pdf(self, file_path: str) -> str:
        text = ""
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        return text

    def create_chunks(self, text: str) -> List[str]:
        words = text.split()
        chunks = []
        step = max(1, self.chunk_size - self.chunk_overlap)
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + self.chunk_size])
            if len(chunk.strip()) > 20:
                chunks.append(chunk)
        return chunks

    def embed_and_store(self, file_path: str, module_code: Optional[str] = None) -> Dict:
        """
        Process a PDF, chunk it, embed chunks, and store in the vector DB.

        Args:
            file_path:    Absolute path to the PDF file.
            module_code:  Optional module code (e.g. "SE3020") to tag chunks so that
                          per-module chunk counts can be queried from the vector store.
        Returns:
            dict: { status, filename, chunks_processed } or { status, message } on error.
        """
        try:
            filename = os.path.basename(file_path)
            print(f" Processing {filename}..." + (f" [module: {module_code}]" if module_code else ""))

            text = self.process_pdf(file_path)
            if not text.strip():
                return {"status": "error", "message": "No text extracted"}

            chunks = self.create_chunks(text)
            print(f" Created {len(chunks)} chunks.")

            embeddings = self.model.encode(chunks, convert_to_numpy=True)
            
            retriever = get_retriever()
            # Deduplicate: remove any previous chunks for this exact file
            collection_data = [
                d for d in retriever.collection
                if d.get("metadata", {}).get("filename") != filename
            ]
            
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                meta = {"filename": filename, "chunk_index": i}
                if module_code:
                    meta["module_code"] = module_code
                collection_data.append({
                    "id": f"{filename}_{i}_{uuid.uuid4().hex[:8]}",
                    "text": chunk,
                    "embedding": emb.tolist(),
                    "metadata": meta
                })
                
            retriever.save_db(collection_data)
            print(f" Stored {len(chunks)} embeddings locally.")

            return {
                "status": "success",
                "filename": filename,
                "chunks_processed": len(chunks)
            }
        except Exception as e:
            print(f" Error during embedding: {e}")
            return {"status": "error", "message": str(e)}
