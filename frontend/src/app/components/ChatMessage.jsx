"use client";

import React, { useState } from "react";
import ConfidenceBadge from "./ConfidenceBadge";
import SourcePanel from "./SourcePanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatInline(text) {
  if (!text) return "";
  let processed = text;
  // Bold & Italic
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  processed = processed.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Inline Code
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return processed;
}

function formatContent(content) {
  if (!content) return null;

  // Split content by fenced code blocks (```lang ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const preText = content.substring(lastIndex, match.index);
    if (preText.trim()) {
      elements.push(renderTextBlocks(preText, `pre-${lastIndex}`));
    }

    const language = match[1] || "code";
    const codeContent = match[2];
    elements.push(
      <div key={`code-${match.index}`} className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-lang-tag">{language}</span>
        </div>
        <pre className="code-block-pre">
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(renderTextBlocks(remainingText, `post-${lastIndex}`));
  }

  return elements;
}

function renderTextBlocks(text, keyPrefix) {
  const lines = text.split("\n");
  const nodes = [];
  let currentList = null;

  const flushList = (idx) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      nodes.push(
        <ul key={`${keyPrefix}-ul-${idx}`} className="chat-ul">
          {currentList.items.map((item, liIdx) => (
            <li key={liIdx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
    } else {
      nodes.push(
        <ol key={`${keyPrefix}-ol-${idx}`} className="chat-ol">
          {currentList.items.map((item, liIdx) => (
            <li key={liIdx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList(i);
      nodes.push(
        <h4 key={`${keyPrefix}-h4-${i}`} className="chat-h4" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(4)) }} />
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(i);
      nodes.push(
        <h3 key={`${keyPrefix}-h3-${i}`} className="chat-h3" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(3)) }} />
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushList(i);
      nodes.push(
        <h2 key={`${keyPrefix}-h2-${i}`} className="chat-h2" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(2)) }} />
      );
      return;
    }

    // Unordered List (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (ulMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList(i);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[2]);
      return;
    }

    // Ordered List (1. 2. etc)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList(i);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2]);
      return;
    }

    // Regular line / paragraph
    flushList(i);
    if (trimmed === "") {
      nodes.push(<div key={`${keyPrefix}-br-${i}`} className="chat-spacing" />);
    } else {
      nodes.push(
        <p key={`${keyPrefix}-p-${i}`} className="chat-p" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
  });

  flushList(lines.length);
  return <React.Fragment key={keyPrefix}>{nodes}</React.Fragment>;
}

// ── Feedback button component ──────────────────────────────────────────────────
function FeedbackButtons({ logId }) {
  const [state, setState] = useState("none"); // "none" | "thumbs_up" | "thumbs_down" | "sending"

  const submit = async (value) => {
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
export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const timestampObj = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
  const timeStr = !isNaN(timestampObj.getTime())
    ? timestampObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

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
