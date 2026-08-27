"use client";

import React, { useState } from "react";
import ConfidenceBadge from "./ConfidenceBadge";
import SourcePanel from "./SourcePanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Source {
  filename: string;
  content: string;
  similarity: number;
}

interface Confidence {
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  retrieval_confidence: number;
  grounding_score: number;
  self_consistency_score?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: Confidence;
  response_type?: string;
  response_label?: string;
  sources?: Source[];
  log_id?: number | null; // SQLite row ID — used to submit feedback
}

interface ChatMessageProps {
  message: Message;
}

function formatContent(content: string): React.ReactNode {
  // Simple markdown-like rendering
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let processed = line;

    // Bold
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Code
    processed = processed.replace(/`(.*?)`/g, "<code>$1</code>");

    if (processed.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />
      );
    }
  });

  return elements;
}

// ── Feedback button component ──────────────────────────────────────────────────
type FeedbackState = "none" | "thumbs_up" | "thumbs_down" | "sending" | "done";

function FeedbackButtons({ logId }: { logId: number }) {
  const [state, setState] = useState<FeedbackState>("none");

  const submit = async (value: "thumbs_up" | "thumbs_down") => {
    if (state !== "none") return; // already voted
    setState("sending");
    try {
      await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: logId, feedback: value }),
      });
      setState(value);
    } catch {
      // Silently revert — feedback is non-critical
      setState("none");
    }
  };

  if (state === "thumbs_up" || state === "thumbs_down") {
    return (
      <div className="feedback-done" id={`feedback-done-${logId}`}>
        {state === "thumbs_up" ? (
          <span className="feedback-thankyou thumbs-up">👍 Thanks for the rating!</span>
        ) : (
          <span className="feedback-thankyou thumbs-down">👎 Feedback noted — we'll improve.</span>
        )}
      </div>
    );
  }

  return (
    <div className="feedback-buttons" id={`feedback-${logId}`}>
      <span className="feedback-label">Was this helpful?</span>
      <button
        id={`thumbs-up-${logId}`}
        className={`feedback-btn thumbs-up ${state === "sending" ? "disabled" : ""}`}
        onClick={() => submit("thumbs_up")}
        disabled={state === "sending"}
        title="This response was helpful"
        aria-label="Thumbs up — helpful"
      >
        👍
      </button>
      <button
        id={`thumbs-down-${logId}`}
        className={`feedback-btn thumbs-down ${state === "sending" ? "disabled" : ""}`}
        onClick={() => submit("thumbs_down")}
        disabled={state === "sending"}
        title="This response was not helpful"
        aria-label="Thumbs down — not helpful"
      >
        👎
      </button>
    </div>
  );
}

// ── Main ChatMessage component ─────────────────────────────────────────────────
export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const timeStr = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">{isUser ? "👤" : "✨"}</div>

      <div className="message-body">
        <div className="message-content">{formatContent(message.content)}</div>

        <div className="message-meta">
          <span className="message-time">{timeStr}</span>

          {message.confidence && (
            <ConfidenceBadge
              level={message.confidence.level}
              score={message.confidence.score}
              retrievalConfidence={message.confidence.retrieval_confidence}
              groundingScore={message.confidence.grounding_score}
              selfConsistencyScore={message.confidence.self_consistency_score}
            />
          )}

          {message.response_label && (
            <span className="response-type-badge">{message.response_label}</span>
          )}
        </div>

        {/* Feedback buttons — only on assistant messages with a valid log_id */}
        {!isUser && message.log_id != null && (
          <FeedbackButtons logId={message.log_id} />
        )}

        {message.sources && message.sources.length > 0 && (
          <SourcePanel sources={message.sources} />
        )}
      </div>
    </div>
  );
}
