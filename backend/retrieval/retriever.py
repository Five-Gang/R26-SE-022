from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings
from retrieval.query_embedder import QueryEmbedder
from config.settings import settings as app_settings


class Retriever:
    """
    Handles document retrieval from ChromaDB based on semantic similarity.
    """

    def __init__(
        self,
        persist_directory: str = "data/chroma",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        similarity_threshold: float = 0.5
    ):
        """
        Initialize the retriever with ChromaDB client and query embedder.

        Args:
            persist_directory (str): Path to ChromaDB persistence directory.
            embedding_model (str): HuggingFace model identifier for embeddings.
            similarity_threshold (float): Minimum similarity score for results.
        """
        self.persist_directory = persist_directory
        self.embedding_model = embedding_model
        self.similarity_threshold = similarity_threshold

        # Initialize query embedder
        self.query_embedder = QueryEmbedder(model_name=embedding_model)

        # Initialize ChromaDB client
        try:
            self.client = chromadb.Client(
                Settings(
                    chroma_db_impl="duckdb+parquet",
                    persist_directory=persist_directory
                )
            )

            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name="course_materials",
                metadata={"hnsw:space": "cosine"}
            )
            print(f"✅ ChromaDB loaded with {self.collection.count()} documents")

        except Exception as e:
            print(f"⚠️ Warning: Could not load ChromaDB: {e}")
            self.client = None
            self.collection = None

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Retrieve the most relevant documents for a given query.

        Args:
            query (str): The user's query text.
            top_k (int): Number of top results to return.

        Returns:
            List[Dict]: List of relevant documents with scores and metadata.
        """
        if not self.collection:
            return [{
                "error": "Vector store not initialized",
                "message": "Please ingest documents first using /api/ingest"
            }]

        try:
            # Validate inputs
            if not query or not query.strip():
                raise ValueError("Query cannot be empty")

            if top_k < 1:
                raise ValueError("top_k must be at least 1")

            # Generate query embedding
            print(f"🔍 Embedding query: {query[:50]}...")
            query_embedding = self.query_embedder.embed_query(query)

            # Query ChromaDB
            print(f"📚 Retrieving top {top_k} results...")
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )

            # Format results
            formatted_results = []

            if results["documents"] and len(results["documents"]) > 0:
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0]

                for i, (doc, metadata, distance) in enumerate(
                    zip(documents, metadatas, distances)
                ):
                    # Convert distance to similarity (cosine distance to similarity)
                    # For cosine distance: similarity = 1 - distance
                    similarity = 1 - distance

                    # Only include results above threshold
                    if similarity >= self.similarity_threshold:
                        formatted_results.append({
                            "rank": i + 1,
                            "content": doc,
                            "similarity": round(similarity, 4),
                            "distance": round(distance, 4),
                            "source": metadata.get("filename", "unknown"),
                            "metadata": metadata
                        })

            if not formatted_results:
                print(f"⚠️ No results above similarity threshold ({self.similarity_threshold})")
                return [{
                    "message": f"No results found above similarity threshold of {self.similarity_threshold}",
                    "query": query,
                    "threshold": self.similarity_threshold
                }]

            print(f"✅ Retrieved {len(formatted_results)} relevant documents")
            return formatted_results

        except ValueError as e:
            return [{"error": "Invalid input", "message": str(e)}]
        except Exception as e:
            print(f"❌ Retrieval error: {str(e)}")
            return [{"error": "Retrieval failed", "message": str(e)}]

    def retrieve_with_scores(
        self,
        query: str,
        top_k: int = 5,
        raw: bool = False
    ) -> Dict:
        """
        Retrieve documents with detailed scoring information.

        Args:
            query (str): The user's query text.
            top_k (int): Number of top results to return.
            raw (bool): If True, return raw ChromaDB results.

        Returns:
            Dict: Detailed retrieval results with metadata.
        """
        if not self.collection:
            return {
                "status": "error",
                "message": "Vector store not initialized",
                "results": []
            }

        try:
            # Generate query embedding
            query_embedding = self.query_embedder.embed_query(query)

            # Query ChromaDB
            raw_results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )

            if raw:
                return {
                    "status": "success",
                    "query": query,
                    "results": raw_results
                }

            # Format results
            formatted_results = []
            if raw_results["documents"] and len(raw_results["documents"]) > 0:
                documents = raw_results["documents"][0]
                metadatas = raw_results["metadatas"][0]
                distances = raw_results["distances"][0]

                for doc, metadata, distance in zip(documents, metadatas, distances):
                    similarity = 1 - distance
                    formatted_results.append({
                        "content": doc,
                        "similarity": round(similarity, 4),
                        "distance": round(distance, 4),
                        "source": metadata.get("filename", "unknown")
                    })

            return {
                "status": "success",
                "query": query,
                "count": len(formatted_results),
                "results": formatted_results
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "results": []
            }

    def search_by_metadata(
        self,
        filename: Optional[str] = None,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Search documents by metadata (e.g., filename).

        Args:
            filename (str): Filter by filename.
            top_k (int): Number of results to return.

        Returns:
            List[Dict]: Documents matching the metadata criteria.
        """
        if not self.collection:
            return []

        try:
            # Get all documents and filter by metadata
            all_docs = self.collection.get(
                include=["documents", "metadatas"]
            )

            results = []
            for doc, metadata in zip(all_docs["documents"], all_docs["metadatas"]):
                if filename is None or metadata.get("filename") == filename:
                    results.append({
                        "content": doc,
                        "source": metadata.get("filename", "unknown")
                    })

                    if len(results) >= top_k:
                        break

            return results

        except Exception as e:
            print(f"❌ Metadata search error: {str(e)}")
            return []

    def get_collection_stats(self) -> Dict:
        """
        Get statistics about the current collection.

        Returns:
            Dict: Collection statistics.
        """
        if not self.collection:
            return {
                "status": "not_initialized",
                "document_count": 0,
                "message": "Vector store not initialized"
            }

        try:
            count = self.collection.count()
            
            return {
                "status": "success",
                "document_count": count,
                "collection_name": "course_materials",
                "embedding_model": self.embedding_model,
                "persistence_path": self.persist_directory
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "document_count": 0
            }


# Global retriever instance for API use
_retriever_instance = None


def get_retriever(
    persist_directory: Optional[str] = None,
    embedding_model: Optional[str] = None,
    similarity_threshold: Optional[float] = None
) -> Retriever:
    """
    Get or create a global retriever instance.

    Args:
        persist_directory: ChromaDB persistence directory
        embedding_model: Embedding model name
        similarity_threshold: Minimum similarity threshold

    Returns:
        Retriever: Retriever instance
    """
    global _retriever_instance

    if _retriever_instance is None:
        _retriever_instance = Retriever(
            persist_directory=persist_directory or app_settings.vectorstore_path,
            embedding_model=embedding_model or app_settings.embedding_model,
            similarity_threshold=similarity_threshold or app_settings.similarity_threshold
        )

    return _retriever_instance


def retrieve_documents(query: str, top_k: int = 5) -> List[Dict]:
    """
    Convenience function to retrieve documents using the global retriever.

    Args:
        query (str): The user's query text.
        top_k (int): Number of top results to return.

    Returns:
        List[Dict]: List of relevant documents.
    """
    retriever = get_retriever()
    return retriever.retrieve(query, top_k=top_k)
