from __future__ import annotations
"""Embedding Service — generates vector embeddings for chunks and learning outcomes.

Supports OpenAI (text-embedding-3-small), Google Gemini (text-embedding-004),
and local (all-MiniLM-L6-v2) models.
Manages Qdrant collection creation and point insertion.
"""

import uuid
from typing import Optional, Literal

from qdrant_client import QdrantClient, models

from app.config import get_settings


class EmbeddingService:
    """Generates embeddings and manages Qdrant vector storage.

    Supports:
    - OpenAI text-embedding-3-small (1536 dims, recommended for production)
    - Sentence-transformers all-MiniLM-L6-v2 (384 dims, free, for dev/offline)
    """

    # Qdrant collection names
    COLLECTION_CHUNKS = "lecture_chunks"
    COLLECTION_LOS = "learning_outcomes"

    def __init__(self):
        self.settings = get_settings()
        self._qdrant = QdrantClient(
            host=self.settings.qdrant_host,
            port=self.settings.qdrant_port,
        )
        self._local_model = None
        self._openai_client = None
        self._google_client = None

    async def initialize_collections(self):
        """Create Qdrant collections if they don't exist."""
        dims = self.settings.embedding_dimensions

        for collection_name in [self.COLLECTION_CHUNKS, self.COLLECTION_LOS]:
            if not self._qdrant.collection_exists(collection_name):
                self._qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=models.VectorParams(
                        size=dims,
                        distance=models.Distance.COSINE,
                    ),
                    # Enable payload indexing for metadata filtering
                    optimizers_config=models.OptimizersConfigDiff(
                        indexing_threshold=10000,
                    ),
                )

                # Create payload indexes for filtering
                for field_name in ["module_code", "week_number", "document_type", "bloom_level"]:
                    self._qdrant.create_payload_index(
                        collection_name=collection_name,
                        field_name=field_name,
                        field_schema=(
                            models.PayloadSchemaType.KEYWORD
                            if field_name != "week_number"
                            else models.PayloadSchemaType.INTEGER
                        ),
                    )

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text string."""
        # Guard: Google API rejects empty content
        if not text or not text.strip():
            return [0.0] * self.settings.embedding_dimensions
        if self.settings.embedding_provider == "openai":
            return await self._embed_openai(text)
        elif self.settings.embedding_provider == "google":
            return await self._embed_google(text)
        else:
            import asyncio
            return await asyncio.to_thread(self._embed_local, text)

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts (batched)."""
        # Filter empty strings — replace them with zero vectors
        zero = [0.0] * self.settings.embedding_dimensions
        non_empty = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        results = [zero] * len(texts)
        if not non_empty:
            return results
        idxs, valid_texts = zip(*non_empty)
        if self.settings.embedding_provider == "openai":
            embeddings = await self._embed_openai_batch(list(valid_texts))
        elif self.settings.embedding_provider == "google":
            embeddings = await self._embed_google_batch(list(valid_texts))
        else:
            import asyncio
            embeddings = await asyncio.to_thread(self._embed_local_batch, list(valid_texts))
        for idx, emb in zip(idxs, embeddings):
            results[idx] = emb
        return results

    async def upsert_chunk(
        self,
        chunk_id: str,
        embedding: list[float],
        content: str,
        metadata: dict,
    ) -> str:
        """Insert or update a chunk embedding in Qdrant.

        Returns the Qdrant point ID.
        """
        point_id = str(uuid.uuid4())
        payload = {
            "chunk_id": chunk_id,
            "content": content,  # Store text for BM25 search
            **metadata,
        }

        import asyncio
        await asyncio.to_thread(
            self._qdrant.upsert,
            collection_name=self.COLLECTION_CHUNKS,
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            ],
        )
        return point_id

    async def upsert_learning_outcome(
        self,
        lo_id: str,
        embedding: list[float],
        lo_text: str,
        metadata: dict,
    ) -> str:
        """Insert or update an LO embedding in Qdrant.

        Returns the Qdrant point ID.
        """
        point_id = str(uuid.uuid4())
        payload = {
            "lo_id": lo_id,
            "text": lo_text,
            **metadata,
        }

        import asyncio
        await asyncio.to_thread(
            self._qdrant.upsert,
            collection_name=self.COLLECTION_LOS,
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            ],
        )
        return point_id

    async def search_chunks(
        self,
        query_vector: list[float],
        filters: Optional[dict] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Search for similar chunks in Qdrant.

        Args:
            query_vector: Query embedding vector.
            filters: Metadata filters (e.g., {"module_code": "IT2060", "week_number": 5}).
            limit: Maximum results to return.

        Returns:
            List of matched chunks with scores and payloads.
        """
        qdrant_filter = self._build_filter(filters) if filters else None

        import asyncio
        response = await asyncio.to_thread(
            self._qdrant.query_points,
            collection_name=self.COLLECTION_CHUNKS,
            query=query_vector,
            query_filter=qdrant_filter,
            limit=limit,
            with_payload=True,
        )
        results = response.points

        return [
            {
                "id": str(r.id),
                "score": r.score,
                "content": r.payload.get("content", ""),
                "metadata": {k: v for k, v in r.payload.items() if k != "content"},
            }
            for r in results
        ]

    async def search_learning_outcomes(
        self,
        query_vector: list[float],
        module_code: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict]:
        """Search for similar learning outcomes in Qdrant."""
        filters = {"module_code": module_code} if module_code else None
        qdrant_filter = self._build_filter(filters) if filters else None

        import asyncio
        response = await asyncio.to_thread(
            self._qdrant.query_points,
            collection_name=self.COLLECTION_LOS,
            query=query_vector,
            query_filter=qdrant_filter,
            limit=limit,
            with_payload=True,
        )
        results = response.points

        return [
            {
                "id": str(r.id),
                "score": r.score,
                "lo_id": r.payload.get("lo_id", ""),
                "text": r.payload.get("text", ""),
                "metadata": {k: v for k, v in r.payload.items() if k not in ("text", "lo_id")},
            }
            for r in results
        ]

    def _build_filter(self, filters: dict) -> models.Filter:
        """Build a Qdrant filter from a dict of field conditions."""
        conditions = []
        for key, value in filters.items():
            if value is None:
                continue
            if isinstance(value, list):
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchAny(any=value),
                    )
                )
            elif isinstance(value, int):
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=value),
                    )
                )
            else:
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=str(value)),
                    )
                )

        return models.Filter(must=conditions)

    async def _embed_openai(self, text: str) -> list[float]:
        """Generate embedding using OpenAI API."""
        if not self._openai_client:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        response = await self._openai_client.embeddings.create(
            model=self.settings.openai_embedding_model,
            input=text,
        )
        return response.data[0].embedding

    async def _embed_openai_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of texts using OpenAI API."""
        if not self._openai_client:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        response = await self._openai_client.embeddings.create(
            model=self.settings.openai_embedding_model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def _embed_local(self, text: str) -> list[float]:
        """Generate embedding using local sentence-transformers model."""
        if not self._local_model:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.settings.local_embedding_model)

        embedding = self._local_model.encode(text)
        return embedding.tolist()

    def _embed_local_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch using local model."""
        if not self._local_model:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.settings.local_embedding_model)

        embeddings = self._local_model.encode(texts)
        return embeddings.tolist()

    # ── Google Gemini Embeddings ──────────────────────────────────────────────

    async def _embed_google(self, text: str) -> list[float]:
        """Generate embedding using Google Gemini text-embedding-004 API."""
        import asyncio
        return await asyncio.to_thread(self._embed_google_sync, text)

    async def _embed_google_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch using Google Gemini API."""
        import asyncio
        return await asyncio.to_thread(self._embed_google_batch_sync, texts)

    def _get_google_client(self):
        """Lazy-init the Google genai client."""
        if not self._google_client:
            from google import genai
            self._google_client = genai.Client(api_key=self.settings.google_api_key)
        return self._google_client

    def _embed_google_sync(self, text: str) -> list[float]:
        """Sync call to Google Gemini embedding API."""
        client = self._get_google_client()
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
        )
        return list(result.embeddings[0].values)

    def _embed_google_batch_sync(self, texts: list[str]) -> list[list[float]]:
        """Sync batch call to Google Gemini embedding API."""
        client = self._get_google_client()
        embeddings = []
        for text in texts:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
            )
            embeddings.append(list(result.embeddings[0].values))
        return embeddings
