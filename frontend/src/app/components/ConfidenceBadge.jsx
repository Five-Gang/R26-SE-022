"use client";

import React, { useState } from "react";

export default function ConfidenceBadge({
  level = "LOW",
  score = 0,
  retrievalConfidence,
  groundingScore,
  selfConsistencyScore,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const levelClass = (level || "low").toLowerCase();
  const percentage = Math.round((score || 0) * 100);

  const labels = {
    HIGH: "High Confidence",
    MEDIUM: "Medium Confidence",
    LOW: "Low Confidence",
  };

  const getMetricPercentage = (val) => {
    if (val === undefined || val === null) return "N/A";
    return `${Math.round(val * 100)}%`;
  };

  return (
    <span
      className="confidence-badge-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <span className={`confidence-badge ${levelClass}`}>
        <span className="confidence-dot" />
        {labels[level] || "Confidence"} ({percentage}%)
      </span>

      {showTooltip && (
        <div className="confidence-tooltip">
          <div className="tooltip-header">
            <strong>Confidence Breakdown</strong>
          </div>
          <div className="tooltip-divider" />
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Composite Score:</span>
              <span className={`tooltip-value font-highlight ${levelClass}`}>
                {percentage}%
              </span>
            </div>
            {retrievalConfidence !== undefined && (
              <div className="tooltip-row">
                <span className="tooltip-label">Retrieval Relevance:</span>
                <span className="tooltip-value">
                  {getMetricPercentage(retrievalConfidence)}
                </span>
              </div>
            )}
            {groundingScore !== undefined && (
              <div className="tooltip-row">
                <span className="tooltip-label">Grounding Score:</span>
                <span className="tooltip-value">
                  {getMetricPercentage(groundingScore)}
                </span>
              </div>
            )}
            {selfConsistencyScore !== undefined && (
              <div className="tooltip-row">
                <span className="tooltip-label">Self-Consistency:</span>
                <span className="tooltip-value">
                  {getMetricPercentage(selfConsistencyScore)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
