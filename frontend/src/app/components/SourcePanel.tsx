"use client";

import React, { useState } from "react";

interface Source {
  filename: string;
  content: string;
  similarity: number;
}

interface SourcePanelProps {
  sources: Source[];
}

export default function SourcePanel({ sources }: SourcePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="source-panel">
      <button className="source-toggle" onClick={() => setIsOpen(!isOpen)}>
        📄 {isOpen ? "Hide" : "Show"} Sources ({sources.length})
        <span style={{ fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="source-list">
          {sources.map((source, idx) => (
            <div className="source-item" key={idx}>
              <span className="source-item-icon">📋</span>
              <div className="source-item-details">
                <div className="source-item-name">{source.filename}</div>
                <div className="source-item-score">
                  Relevance: {Math.round(source.similarity * 100)}%
                </div>
                {source.content && (
                  <div className="source-item-preview">
                    {source.content.substring(0, 150)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
