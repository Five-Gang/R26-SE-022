"""
Query Logger - SQLite-based logging for AuraLearn
====================================================
Persists every query/response interaction to a local SQLite database.

This module serves as the RESEARCH DATA STORE for the AuraLearn system.
Every log entry captures the full confidence breakdown, response type, and
query text — enabling post-hoc evaluation of:
  - Hallucination Rate
  - Confidence-Response Alignment
  - Grounding Score trends
  - Self-consistency impact on confidence
  - Response type distribution (direct / hint / clarification)
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, Dict, List, Any


# Default database path inside the backend/data directory
DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "auralearn_logs.db"
)


class QueryLogger:
    """
    SQLite-backed logger that records every query-response cycle.

    Schema (query_logs table):
        id                      INTEGER PRIMARY KEY AUTOINCREMENT
        timestamp               TEXT    — ISO 8601 datetime of the request
        query                   TEXT    — the student's original question
        response                TEXT    — the final adaptive response sent to the student
        response_type           TEXT    — 'direct_answer' | 'guided_hint' | 'clarification_request'
        confidence_score        REAL    — composite confidence score (0.0 – 1.0)
        confidence_level        TEXT    — 'HIGH' | 'MEDIUM' | 'LOW'
        retrieval_confidence    REAL    — retrieval similarity signal (0.0 – 1.0)
        grounding_score         REAL    — ML/semantic grounding signal (0.0 – 1.0)
        self_consistency_score  REAL    — self-consistency signal (NULL if disabled)
        sources_count           INTEGER — number of retrieved source documents
        sources_json            TEXT    — JSON array of source filenames + similarities
        self_consistency_used   INTEGER — 1 if self-consistency was enabled, 0 otherwise
        llm_model               TEXT    — name of the LLM model used (e.g. 'llama3.2')
    """

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        """Get a database connection with row factory for dict-like access."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create the query_logs table and apply column migrations if needed."""
        conn = self._get_conn()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS query_logs (
                    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp               TEXT    NOT NULL,
                    query                   TEXT    NOT NULL,
                    response                TEXT    NOT NULL,
                    response_type           TEXT    NOT NULL,
                    confidence_score        REAL,
                    confidence_level        TEXT,
                    retrieval_confidence    REAL,
                    grounding_score         REAL,
                    self_consistency_score  REAL,
                    sources_count           INTEGER DEFAULT 0,
                    sources_json            TEXT    DEFAULT '[]',
                    self_consistency_used   INTEGER DEFAULT 0,
                    llm_model               TEXT    DEFAULT 'unknown',
                    feedback                TEXT    DEFAULT NULL
                )
            """)
            # Migration: add feedback column to existing databases that predate it
            try:
                conn.execute("ALTER TABLE query_logs ADD COLUMN feedback TEXT DEFAULT NULL")
            except Exception:
                pass  # Column already exists — safe to ignore
            conn.commit()
            print(f"[QueryLogger] Database ready at {self.db_path}")
        except Exception as e:
            print(f"[QueryLogger] WARNING: Failed to init DB: {e}")
        finally:
            conn.close()

    def log(
        self,
        query: str,
        response: str,
        response_type: str,
        confidence: Dict[str, Any],
        sources: List[Dict],
        self_consistency_used: bool = False,
        llm_model: str = "unknown"
    ) -> Optional[int]:
        """
        Log a single query-response interaction.

        Args:
            query:                  The student's original question.
            response:               The final formatted response sent to the student.
            response_type:          'direct_answer', 'guided_hint', or 'clarification_request'.
            confidence:             The full confidence dict from ConfidenceScorer.score().
            sources:                List of retrieved source dicts with filename + similarity.
            self_consistency_used:  Whether self-consistency was enabled for this request.
            llm_model:              Name of the LLM model used.

        Returns:
            int: The inserted row ID, or None on failure.
        """
        try:
            # Safely extract all confidence sub-scores
            conf_score   = float(confidence.get("score", 0.0))
            conf_level   = str(confidence.get("level", "UNKNOWN"))
            ret_conf     = float(confidence.get("retrieval_confidence", 0.0))
            grounding    = float(confidence.get("grounding_score", 0.0))
            sc_score     = confidence.get("self_consistency_score")  # None if disabled

            # Serialize sources to JSON (store filename + similarity only)
            sources_slim = [
                {"filename": s.get("filename", "unknown"), "similarity": s.get("similarity", 0.0)}
                for s in (sources or [])
            ]

            conn = self._get_conn()
            try:
                cursor = conn.execute("""
                    INSERT INTO query_logs (
                        timestamp, query, response, response_type,
                        confidence_score, confidence_level,
                        retrieval_confidence, grounding_score, self_consistency_score,
                        sources_count, sources_json,
                        self_consistency_used, llm_model
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    datetime.utcnow().isoformat(),
                    query,
                    response,
                    response_type,
                    conf_score,
                    conf_level,
                    ret_conf,
                    grounding,
                    sc_score,
                    len(sources_slim),
                    json.dumps(sources_slim),
                    1 if self_consistency_used else 0,
                    llm_model
                ))
                conn.commit()
                row_id = cursor.lastrowid
                print(f"[QueryLogger] Logged query #{row_id} | {conf_level} ({conf_score:.2f}) | {response_type}")
                return row_id
            finally:
                conn.close()

        except Exception as e:
            print(f"[QueryLogger] WARNING: Failed to log query: {e}")
            return None

    def submit_feedback(
        self,
        log_id: int,
        feedback: str
    ) -> bool:
        """
        Record a student's thumbs-up or thumbs-down on a specific logged response.

        This is the human-in-the-loop validation signal that allows the research
        evaluation to compare machine-computed confidence against human judgment.

        Args:
            log_id:   The query_logs row ID returned by log().
            feedback: 'thumbs_up' or 'thumbs_down'.

        Returns:
            bool: True on success, False on failure.
        """
        if feedback not in ("thumbs_up", "thumbs_down"):
            print(f"[QueryLogger] WARNING: Invalid feedback value '{feedback}'")
            return False

        conn = self._get_conn()
        try:
            result = conn.execute(
                "UPDATE query_logs SET feedback = ? WHERE id = ?",
                (feedback, log_id)
            )
            conn.commit()
            if result.rowcount == 0:
                print(f"[QueryLogger] WARNING: No row found for log_id={log_id}")
                return False
            label = "GOOD" if feedback == "thumbs_up" else "BAD"
            print(f"[QueryLogger] Feedback #{log_id} -> {label}")
            return True
        except Exception as e:
            print(f"[QueryLogger] WARNING: Failed to submit feedback: {e}")
            return False
        finally:
            conn.close()

    def get_logs(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Retrieve recent log entries (newest first).

        Args:
            limit:  Maximum number of rows to return.
            offset: Pagination offset.

        Returns:
            List of log entry dicts.
        """
        conn = self._get_conn()
        try:
            rows = conn.execute("""
                SELECT * FROM query_logs
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset)).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def get_analytics(self) -> Dict:
        """
        Compute aggregate analytics over all logged interactions.

        Returns a summary dict containing the exact metrics defined in
        the AuraLearn proposal (hallucination rate, confidence distribution,
        response type distribution, grounding scores, etc.).
        """
        conn = self._get_conn()
        try:
            total = conn.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]

            if total == 0:
                return {
                    "total_queries": 0,
                    "message": "No queries logged yet."
                }

            # — Confidence level distribution —
            conf_dist = {}
            for row in conn.execute("""
                SELECT confidence_level, COUNT(*) as cnt
                FROM query_logs GROUP BY confidence_level
            """).fetchall():
                conf_dist[row["confidence_level"]] = row["cnt"]

            # — Response type distribution —
            resp_dist = {}
            for row in conn.execute("""
                SELECT response_type, COUNT(*) as cnt
                FROM query_logs GROUP BY response_type
            """).fetchall():
                resp_dist[row["response_type"]] = row["cnt"]

            # — Average scores —
            avgs = conn.execute("""
                SELECT
                    AVG(confidence_score)       AS avg_confidence,
                    AVG(retrieval_confidence)   AS avg_retrieval,
                    AVG(grounding_score)        AS avg_grounding,
                    AVG(self_consistency_score) AS avg_self_consistency,
                    MIN(confidence_score)       AS min_confidence,
                    MAX(confidence_score)       AS max_confidence
                FROM query_logs
            """).fetchone()

            # — Hallucination Rate proxy —
            # Clarification requests = LOW confidence = high hallucination risk responses
            # These are the queries where the system detected it couldn't answer safely
            clarification_count = resp_dist.get("clarification_request", 0)
            low_conf_count      = conf_dist.get("LOW", 0)
            hallucination_rate  = round((low_conf_count / total) * 100, 2) if total > 0 else 0.0

            # — Self-consistency usage stats —
            sc_used = conn.execute(
                "SELECT COUNT(*) FROM query_logs WHERE self_consistency_used = 1"
            ).fetchone()[0]

            # — Confidence-Response Alignment —
            # For each confidence level, what % got the "correct" response type?
            # HIGH → direct_answer, MEDIUM → guided_hint, LOW → clarification_request
            alignment_check = conn.execute("""
                SELECT
                    SUM(CASE WHEN confidence_level='HIGH'   AND response_type='direct_answer'        THEN 1 ELSE 0 END) as high_aligned,
                    SUM(CASE WHEN confidence_level='MEDIUM' AND response_type='guided_hint'           THEN 1 ELSE 0 END) as medium_aligned,
                    SUM(CASE WHEN confidence_level='LOW'    AND response_type='clarification_request' THEN 1 ELSE 0 END) as low_aligned
                FROM query_logs
            """).fetchone()

            high_total   = conf_dist.get("HIGH", 0)
            medium_total = conf_dist.get("MEDIUM", 0)
            low_total    = conf_dist.get("LOW", 0)

            def safe_pct(num, denom):
                return round((num / denom) * 100, 1) if denom > 0 else None

            # — Recent 10 entries —
            recent = conn.execute("""
                SELECT timestamp, query, response_type, confidence_level, confidence_score
                FROM query_logs ORDER BY id DESC LIMIT 10
            """).fetchall()

            # — Feedback / User Satisfaction —
            feedback_stats = conn.execute("""
                SELECT
                    SUM(CASE WHEN feedback = 'thumbs_up'   THEN 1 ELSE 0 END) AS thumbs_up,
                    SUM(CASE WHEN feedback = 'thumbs_down' THEN 1 ELSE 0 END) AS thumbs_down,
                    COUNT(feedback) AS total_with_feedback
                FROM query_logs
            """).fetchone()

            thumbs_up_count   = feedback_stats["thumbs_up"]   or 0
            thumbs_down_count = feedback_stats["thumbs_down"]  or 0
            total_feedback    = feedback_stats["total_with_feedback"] or 0
            satisfaction_rate = round((thumbs_up_count / total_feedback) * 100, 1) if total_feedback > 0 else None

            # — False Positive Rate: HIGH confidence but student gave thumbs_down —
            # This is the key research metric that validates whether the machine confidence
            # score actually predicts response quality from the student's perspective.
            fp_count = conn.execute("""
                SELECT COUNT(*) FROM query_logs
                WHERE confidence_level = 'HIGH' AND feedback = 'thumbs_down'
            """).fetchone()[0]
            high_with_feedback = conn.execute("""
                SELECT COUNT(*) FROM query_logs
                WHERE confidence_level = 'HIGH' AND feedback IS NOT NULL
            """).fetchone()[0]
            false_positive_rate = round((fp_count / high_with_feedback) * 100, 1) if high_with_feedback > 0 else None

            return {
                "total_queries": total,

                # Core research metrics (proposal Page 19)
                "hallucination_rate_pct": hallucination_rate,
                "avg_confidence_score":   round(avgs["avg_confidence"] or 0, 4),
                "avg_retrieval_confidence": round(avgs["avg_retrieval"] or 0, 4),
                "avg_grounding_score":    round(avgs["avg_grounding"] or 0, 4),
                "avg_self_consistency":   round(avgs["avg_self_consistency"] or 0, 4) if avgs["avg_self_consistency"] else None,
                "min_confidence":         round(avgs["min_confidence"] or 0, 4),
                "max_confidence":         round(avgs["max_confidence"] or 0, 4),

                # Distribution of confidence levels
                "confidence_distribution": {
                    "HIGH":   conf_dist.get("HIGH", 0),
                    "MEDIUM": conf_dist.get("MEDIUM", 0),
                    "LOW":    low_conf_count,
                },

                # Distribution of response types
                "response_type_distribution": {
                    "direct_answer":        resp_dist.get("direct_answer", 0),
                    "guided_hint":          resp_dist.get("guided_hint", 0),
                    "clarification_request": clarification_count,
                },

                # Confidence-Response Alignment (proposal metric)
                "confidence_response_alignment": {
                    "high_confidence_correct_pct":   safe_pct(alignment_check["high_aligned"],   high_total),
                    "medium_confidence_correct_pct": safe_pct(alignment_check["medium_aligned"], medium_total),
                    "low_confidence_correct_pct":    safe_pct(alignment_check["low_aligned"],    low_total),
                },

                # Self-consistency stats
                "self_consistency_queries": sc_used,
                "self_consistency_pct":     round((sc_used / total) * 100, 1) if total > 0 else 0,

                # Human feedback stats (user evaluation — proposal Page 15)
                "user_feedback": {
                    "thumbs_up":          thumbs_up_count,
                    "thumbs_down":        thumbs_down_count,
                    "total_rated":        total_feedback,
                    "satisfaction_rate_pct": satisfaction_rate,
                    "false_positive_rate_pct": false_positive_rate,
                },

                # Recent activity
                "recent_queries": [dict(r) for r in recent],
            }

        finally:
            conn.close()

    def get_total_count(self) -> int:
        """Return total number of logged queries."""
        conn = self._get_conn()
        try:
            return conn.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]
        finally:
            conn.close()


# ── Module-level singleton ─────────────────────────────────────────────────────
_logger_instance: Optional[QueryLogger] = None


def get_query_logger(db_path: str = DEFAULT_DB_PATH) -> QueryLogger:
    """Return the singleton QueryLogger instance."""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = QueryLogger(db_path=db_path)
    return _logger_instance
