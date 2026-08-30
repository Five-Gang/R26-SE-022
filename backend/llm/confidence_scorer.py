"""
Confidence Scorer - Uncertainty Estimation for AuraLearn
Computes composite confidence scores using retrieval confidence,
grounding score, and optional self-consistency checks.
"""

import numpy as np
import os
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer

# Optional imports for the trained ML model
try:
    from transformers import pipeline
except ImportError:
    pipeline = None


class ConfidenceScorer:
    """
    Computes confidence scores for LLM responses using multiple signals:
    1. Retrieval Confidence - How relevant are the retrieved documents?
    2. Grounding Score - How well does the response align with retrieved docs?
    3. Self-Consistency Score - Do multiple responses agree?
    """

    def __init__(
        self,
        embedding_model: Optional[SentenceTransformer] = None,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        high_threshold: float = 0.75,
        low_threshold: float = 0.45
    ):
        """
        Initialize the confidence scorer.

        Args:
            embedding_model: Pre-loaded SentenceTransformer model (reuse from retriever).
            model_name: Model name if no pre-loaded model is provided.
            high_threshold: Score above this = HIGH confidence.
            low_threshold: Score below this = LOW confidence.
        """
        if embedding_model is not None:
            self.model = embedding_model
        else:
            self.model = SentenceTransformer(model_name)

        self.high_threshold = high_threshold
        self.low_threshold = low_threshold

        # Try to load custom ML model for hallucination detection
        self.ml_pipeline = None
        self.ml_model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            "models", "hallucination_detector"
        )
        
        if pipeline is not None and os.path.exists(self.ml_model_path):
            try:
                print(f"[ConfidenceScorer] Loading custom ML Hallucination Model from {self.ml_model_path}...")
                # Try to load the text-classification pipeline
                self.ml_pipeline = pipeline("text-classification", model=self.ml_model_path, device=-1)
                print("[ConfidenceScorer] ML Model loaded successfully!")
            except Exception as e:
                print(f"[ConfidenceScorer] ML model load note: {e}. Using heuristic grounding score.")
                self.ml_pipeline = None

    def compute_retrieval_confidence(self, retrieval_results: List[Dict]) -> float:
        """
        Compute confidence based on retrieval similarity scores.

        Args:
            retrieval_results: List of retrieved documents with similarity scores.

        Returns:
            float: Retrieval confidence score (0-1).
        """
        if not retrieval_results:
            return 0.0

        similarities = []
        for result in retrieval_results:
            sim = result.get("similarity", 0.0)
            if isinstance(sim, (int, float)) and sim > 0:
                similarities.append(sim)

        if not similarities:
            return 0.0

        # Weighted average: top results matter more
        weights = [1.0 / (i + 1) for i in range(len(similarities))]
        weighted_sum = sum(s * w for s, w in zip(similarities, weights))
        total_weight = sum(weights)

        return min(1.0, weighted_sum / total_weight)

    def compute_grounding_score(
        self,
        response_text: str,
        retrieved_texts: List[str]
    ) -> float:
        """
        Compute how well the response is grounded in retrieved documents
        using semantic similarity.

        Args:
            response_text: The LLM-generated response.
            retrieved_texts: List of retrieved document texts.

        Returns:
            float: Grounding score (0-1).
        """
        if not response_text or not retrieved_texts:
            return 0.0

        ml_grounding = None
        # Step 1: If custom ML model is available, compute NLI entailment score
        # Note: Model is trained on (claim=response, evidence=context)
        if self.ml_pipeline is not None:
            try:
                context = " ".join(retrieved_texts)
                raw = self.ml_pipeline(
                    {"text": response_text, "text_pair": context},
                    truncation=True
                )
                result = raw[0] if isinstance(raw, list) else raw
                label = result.get('label', '')
                score = result.get('score', 0.5)
                
                # If model predicts LABEL_1 (grounded/entailment), score as-is.
                # If LABEL_0 (hallucination/neutral), invert score.
                if label == "LABEL_1" or label == 1:
                    ml_grounding = float(score)
                else:
                    ml_grounding = 1.0 - float(score)

                print(f"[ConfidenceScorer] ML Model -> label={label}, raw_score={score:.4f}, ml_grounding={ml_grounding:.4f}")
            except Exception as e:
                print(f"[ConfidenceScorer] ML model inference notice: {e}")
                ml_grounding = None

        # Step 2: Compute Semantic Embedding Grounding via SentenceTransformers
        semantic_grounding = 0.5
        try:
            response_emb = self.model.encode(response_text, convert_to_numpy=True)
            doc_embs = self.model.encode(retrieved_texts, convert_to_numpy=True)

            response_norm = response_emb / (np.linalg.norm(response_emb) + 1e-8)
            if len(doc_embs.shape) == 1:
                doc_embs = doc_embs.reshape(1, -1)

            doc_norms = doc_embs / (np.linalg.norm(doc_embs, axis=1, keepdims=True) + 1e-8)
            similarities = np.dot(doc_norms, response_norm)

            max_sim = float(np.max(similarities))
            mean_sim = float(np.mean(similarities))
            semantic_grounding = min(1.0, max(0.0, 0.7 * max_sim + 0.3 * mean_sim))
        except Exception as e:
            print(f"[ConfidenceScorer] Semantic grounding failed: {e}")
            semantic_grounding = 0.5

        # Step 3: Ensemble ML classification and Semantic Grounding
        if ml_grounding is not None:
            final_grounding = 0.50 * ml_grounding + 0.50 * semantic_grounding
        else:
            final_grounding = semantic_grounding

        return round(min(1.0, max(0.0, final_grounding)), 4)

    def compute_self_consistency(self, responses: List[str]) -> float:
        """
        Compute self-consistency score by comparing multiple responses.

        Args:
            responses: List of response texts generated from same query.

        Returns:
            float: Self-consistency score (0-1).
        """
        if len(responses) < 2:
            return 0.5  # Neutral score if only one response

        try:
            embeddings = self.model.encode(responses, convert_to_numpy=True)

            # Compute pairwise cosine similarities
            norms = embeddings / (np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-8)
            similarity_matrix = np.dot(norms, norms.T)

            # Extract upper triangle (exclude diagonal)
            n = len(responses)
            pairwise_sims = []
            for i in range(n):
                for j in range(i + 1, n):
                    pairwise_sims.append(similarity_matrix[i][j])

            return float(np.mean(pairwise_sims))

        except Exception as e:
            print(f"[ConfidenceScorer] Self-consistency computation notice: {e}")
            return 0.5

    def compute_composite_score(
        self,
        retrieval_confidence: float,
        grounding_score: float,
        self_consistency_score: Optional[float] = None
    ) -> float:
        """
        Compute the final composite confidence score.

        Args:
            retrieval_confidence: Retrieval relevance score.
            grounding_score: Response grounding score.
            self_consistency_score: Optional self-consistency score.

        Returns:
            float: Composite confidence score (0-1).
        """
        if self_consistency_score is not None:
            # Full mode: all three signals
            composite = (
                0.40 * retrieval_confidence +
                0.35 * grounding_score +
                0.25 * self_consistency_score
            )
        else:
            # Fast mode: two signals
            composite = (
                0.50 * retrieval_confidence +
                0.50 * grounding_score
            )

        return round(min(1.0, max(0.0, composite)), 4)

    def classify_confidence(self, score: float) -> str:
        """
        Classify confidence score into HIGH, MEDIUM, or LOW.

        Args:
            score: Composite confidence score (0-1).

        Returns:
            str: Confidence level ("HIGH", "MEDIUM", or "LOW").
        """
        if score >= self.high_threshold:
            return "HIGH"
        elif score >= self.low_threshold:
            return "MEDIUM"
        else:
            return "LOW"

    def score(
        self,
        response_text: str,
        retrieval_results: List[Dict],
        multiple_responses: Optional[List[str]] = None
    ) -> Dict:
        """
        Compute the full confidence assessment.

        Args:
            response_text: The primary LLM response.
            retrieval_results: Retrieved documents with similarity scores.
            multiple_responses: Optional list of multiple responses for self-consistency.

        Returns:
            Dict: Complete confidence assessment with all scores and classification.
        """
        # Extract texts from retrieval results
        retrieved_texts = []
        for r in retrieval_results:
            content = r.get("content", "")
            if content and not content.startswith("{") and "error" not in content.lower():
                retrieved_texts.append(content)

        # Compute individual scores
        retrieval_conf = self.compute_retrieval_confidence(retrieval_results)
        grounding = self.compute_grounding_score(response_text, retrieved_texts) if retrieved_texts else 0.0

        self_consistency = None
        if multiple_responses and len(multiple_responses) >= 2:
            self_consistency = self.compute_self_consistency(multiple_responses)

        # Composite score
        composite = self.compute_composite_score(retrieval_conf, grounding, self_consistency)
        level = self.classify_confidence(composite)

        result = {
            "score": composite,
            "level": level,
            "retrieval_confidence": round(retrieval_conf, 4),
            "grounding_score": round(grounding, 4),
        }

        if self_consistency is not None:
            result["self_consistency_score"] = round(self_consistency, 4)

        return result
