import os
import json
import numpy as np
from typing import List, Dict, Optional
from retrieval.query_embedder import QueryEmbedder
from config.settings import settings as app_settings

class Retriever:
    """
    Handles document retrieval from a JSON file based on semantic similarity.
    """
    def __init__(
        self,
        persist_directory: str = "data/chroma",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        similarity_threshold: float = 0.3
    ):
        self.persist_directory = persist_directory
        self.db_path = os.path.join(persist_directory, "auralearn_docs.json")
        self.similarity_threshold = similarity_threshold
        self.query_embedder = QueryEmbedder(model_name=embedding_model)
        
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory, exist_ok=True)
            
        self.collection = self._load_db()

    def _load_db(self):
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []

    def save_db(self, collection_data):
        self.collection = collection_data
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(self.collection, f)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        if not self.collection:
            return [{"error": "Vector store not initialized or empty", "similarity": 0.0}]

        try:
            query_emb = self.query_embedder.embed_query(query)
            query_norm = query_emb / (np.linalg.norm(query_emb) + 1e-8)
            
            results = []
            for i, doc in enumerate(self.collection):
                doc_emb = np.array(doc["embedding"])
                doc_norm = doc_emb / (np.linalg.norm(doc_emb) + 1e-8)
                sim = float(np.dot(query_norm, doc_norm))
                
                if sim >= self.similarity_threshold:
                    results.append({
                        "content": doc["text"],
                        "metadata": doc["metadata"],
                        "similarity": sim
                    })
                    
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            print(f"Retrieval error: {e}")
            return [{"content": f"Error during retrieval: {str(e)}", "similarity": 0.0}]

    def retrieve_with_scores(self, query: str, top_k: int = 5, raw: bool = False) -> Dict:
        if not self.collection:
            return {"status": "error", "message": "Vector store not initialized or empty", "results": []}
            
        try:
            results = self.retrieve(query, top_k)
            return {"status": "success", "query": query, "count": len(results), "results": results}
        except Exception as e:
            return {"status": "error", "message": str(e), "results": []}
            
    def search_by_metadata(self, filename: Optional[str] = None, top_k: int = 10) -> List[Dict]:
        if not self.collection:
            return []
            
        results = []
        for doc in self.collection:
            if filename is None or doc.get("metadata", {}).get("filename") == filename:
                results.append({"content": doc["text"], "source": doc.get("metadata", {}).get("filename", "unknown")})
                if len(results) >= top_k:
                    break
        return results

    def get_collection_stats(self) -> Dict:
        count = len(self.collection)
        unique_files = set()
        for doc in self.collection:
            if "metadata" in doc and "filename" in doc["metadata"]:
                unique_files.add(doc["metadata"]["filename"])
                
        return {
            "total_chunks": count,
            "unique_documents": len(unique_files),
            "documents": list(unique_files),
            "status": "online" if count > 0 else "offline",
            "document_count": count,
            "unique_files": list(unique_files),
            "file_count": len(unique_files),
        }

    def delete_by_filename(self, filename: str) -> int:
        initial_count = len(self.collection)
        self.collection = [
            doc for doc in self.collection 
            if doc.get("metadata", {}).get("filename") != filename
        ]
        deleted_count = initial_count - len(self.collection)
        if deleted_count > 0:
            self.save_db(self.collection)
        return deleted_count

_retriever_instance = None

def get_retriever(persist_directory=None, embedding_model=None, similarity_threshold=None):
    global _retriever_instance
    if _retriever_instance is None:
        _retriever_instance = Retriever(
            persist_directory=persist_directory or app_settings.vectorstore_path,
            embedding_model=embedding_model or app_settings.embedding_model,
            similarity_threshold=similarity_threshold or app_settings.similarity_threshold
        )
    return _retriever_instance

def retrieve_documents(query: str, top_k: int = 5) -> List[Dict]:
    retriever = get_retriever()
    return retriever.retrieve(query, top_k=top_k)
