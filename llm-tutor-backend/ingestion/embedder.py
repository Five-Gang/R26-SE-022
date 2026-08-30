import os
import uuid
import PyPDF2
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from retrieval.retriever import get_retriever

class Embedder:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", chunk_size: int = 500, chunk_overlap: int = 50):
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
        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk = " ".join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        return chunks

    def embed_and_store(self, file_path: str) -> Dict:
        try:
            filename = os.path.basename(file_path)
            print(f" Processing {filename}...")

            text = self.process_pdf(file_path)
            if not text.strip():
                return {"status": "error", "message": "No text extracted"}

            chunks = self.create_chunks(text)
            print(f" Created {len(chunks)} chunks.")

            embeddings = self.model.encode(chunks, convert_to_numpy=True)
            
            retriever = get_retriever()
            collection_data = retriever.collection
            
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                collection_data.append({
                    "id": f"{filename}_{i}_{uuid.uuid4().hex[:8]}",
                    "text": chunk,
                    "embedding": emb.tolist(),
                    "metadata": {"filename": filename, "chunk_index": i}
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
