"use client";

import React from "react";

interface ConfidenceBadgeProps {
  level: "HIGH" | "MEDIUM" | "LOW";
  score: number;
}

export default function ConfidenceBadge({ level, score }: ConfidenceBadgeProps) {
  const levelClass = level.toLowerCase();
  const percentage = Math.round(score * 100);

  const labels: Record<string, string> = {
    HIGH: "High Confidence",
    MEDIUM: "Medium Confidence",
    LOW: "Low Confidence",
  };

  return (
    <span className={`confidence-badge ${levelClass}`} title={`Confidence: ${percentage}%`}>
      <span className="confidence-dot" />
      {labels[level]} ({percentage}%)
    </span>
  );
}
