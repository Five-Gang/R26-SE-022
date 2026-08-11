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
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  if (!sources || sources.length === 0) return null;

  const toggleExpandItem = (idx: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering expand toggle
    navigator.clipboard.writeText(text);
    alert("Source content copied to clipboard!");
  };

  return (
    <div className="source-panel">
      <button className="source-toggle" onClick={() => setIsOpen(!isOpen)}>
        📄 {isOpen ? "Hide" : "Show"} Retrieved Sources ({sources.length})
        <span style={{ fontSize: 10, marginLeft: 6 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="source-list">
          {sources.map((source, idx) => {
            const isExpanded = !!expandedIndices[idx];
            return (
              <div 
                className={`source-item ${isExpanded ? "expanded" : ""}`} 
                key={idx}
                onClick={() => toggleExpandItem(idx)}
                style={{ cursor: "pointer" }}
              >
                <div className="source-item-header">
                  <span className="source-item-icon">📄</span>
                  <div className="source-item-title-row">
                    <span className="source-item-name">{source.filename}</span>
                    <span className="source-item-score">
                      Relevance: {Math.round(source.similarity * 100)}%
                    </span>
                  </div>
                  <div className="source-item-actions">
                    <button 
                      className="source-action-btn"
                      onClick={(e) => copyToClipboard(source.content, e)}
                      title="Copy source content"
                    >
                      📋
                    </button>
                    <span className="expand-indicator">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {source.content && (
                  <div className="source-item-body">
                    {isExpanded ? (
                      <div className="source-item-full-content">
                        {source.content}
                      </div>
                    ) : (
                      <div className="source-item-preview">
                        {source.content.length > 150 
                          ? `${source.content.substring(0, 150)}...` 
                          : source.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
