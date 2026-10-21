from typing import List
from sentence_transformers import SentenceTransformer


class QueryEmbedder:
    """
    Handles embedding generation for user queries.
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize the query embedder with a SentenceTransformer model.

        Args:
            model_name (str): HuggingFace model identifier for embeddings.
        """
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a single query.

        Args:
            query (str): The user's query text.

        Returns:
            List[float]: Embedding vector as a list of floats.
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        embedding = self.model.encode(query)
        return embedding.tolist()

    def embed_queries(self, queries: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple queries.

        Args:
            queries (List[str]): List of query texts.

        Returns:
            List[List[float]]: List of embedding vectors.
        """
        if not queries:
            raise ValueError("Queries list cannot be empty")
        
        # Filter out empty queries
        valid_queries = [q for q in queries if q and q.strip()]
        
        if not valid_queries:
            raise ValueError("No valid queries provided")
        
        embeddings = self.model.encode(valid_queries)
        return embeddings.tolist()

    def get_model_info(self) -> dict:
        """
        Get information about the embedding model.

        Returns:
            dict: Model information including name and dimension.
        """
        # Get embedding dimension by embedding a test text
        test_embedding = self.model.encode("test")
        
        return {
            "model_name": self.model_name,
            "embedding_dimension": len(test_embedding),
            "model_type": "sentence-transformers"
        }
