"use client";

import React from "react";
import ConfidenceBadge from "./ConfidenceBadge";
import SourcePanel from "./SourcePanel";

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

        {message.sources && message.sources.length > 0 && (
          <SourcePanel sources={message.sources} />
        )}
      </div>
    </div>
  );
}
