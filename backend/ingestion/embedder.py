import os
from typing import List, Dict
import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings


class Embedder:
    """
    Handles embedding generation and storage in ChromaDB.
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        persist_directory: str = "data/chroma"
    ):
        """
        Initialize embedding model + ChromaDB client.

        Args:
            model_name (str): HuggingFace embedding model.
            persist_directory (str): Directory to store ChromaDB.
        """
        self.model = SentenceTransformer(model_name)

        # Initialize ChromaDB client
        self.client = chromadb.Client(
            Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=persist_directory
            )
        )

        # Create or load collection
        self.collection = self.client.get_or_create_collection(
            name="course_materials",
            metadata={"hnsw:space": "cosine"}
        )

    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text chunk.
        """
        embedding = self.model.encode(text)
        # Convert to NumPy array and then to list
        if isinstance(embedding, np.ndarray):
            return embedding.tolist()
        else:
            # Convert tensor to numpy then to list
            return np.array(embedding).tolist()

    def add_chunks_to_db(self, chunks: List[Dict]):
        """
        Add chunked documents to ChromaDB.

        Args:
            chunks (List[Dict]): Output from chunker.chunk_documents()
        """
        ids = []
        texts = []
        metadatas = []

        for chunk in chunks:
            ids.append(chunk["chunk_id"])
            texts.append(chunk["text"])
            metadatas.append({
                "filename": chunk["filename"]
            })

        print(f"🔍 Generating embeddings for {len(texts)} chunks...")

        # Encode texts to embeddings
        embeddings_array = self.model.encode(texts)
        
        # Convert embeddings to list format
        if isinstance(embeddings_array, np.ndarray):
            embeddings = embeddings_array.tolist()
        else:
            # Convert each embedding (tensor) to list
            embeddings = [np.array(e).tolist() for e in embeddings_array]

        print("💾 Storing embeddings in ChromaDB...")

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

        print("✅ Embeddings successfully stored.")

    def persist(self):
        """
        Save ChromaDB to disk.
        Note: ChromaDB 0.4.13+ automatically persists data to disk.
        This method is kept for compatibility but does not need explicit persistence.
        """
        # ChromaDB automatically persists with duckdb+parquet backend
        print("💾 ChromaDB data automatically persisted to disk.")
