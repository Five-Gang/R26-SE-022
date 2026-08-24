"use client";

import { useState } from "react";

const SAMPLE_FLASHCARDS = [
  { id: 1, front: "What is Database Normalization?", back: "The process of organizing data to reduce redundancy and improve data integrity by decomposing tables into smaller, related tables.", lo: "LO2", bloom: "Remember", difficulty: "easy" },
  { id: 2, front: "What are the requirements for First Normal Form (1NF)?", back: "1) Each column contains atomic (indivisible) values, 2) Each row is unique, 3) No repeating groups.", lo: "LO2", bloom: "Remember", difficulty: "easy" },
  { id: 3, front: "How does 2NF differ from 1NF?", back: "2NF requires the table to be in 1NF AND every non-key attribute must be fully functionally dependent on the entire primary key (no partial dependencies).", lo: "LO2", bloom: "Understand", difficulty: "medium" },
];

export default function FlashcardsPage() {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const cards = SAMPLE_FLASHCARDS;

  const BLOOM_BADGE: Record<string, string> = {
    Remember: "badge-remember", Understand: "badge-understand", Apply: "badge-apply",
    Analyze: "badge-analyze", Evaluate: "badge-evaluate", Create: "badge-create",
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Flashcards</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          LO-mapped flashcards with Bloom&apos;s taxonomy levels
        </p>
      </div>

      {/* Flashcard Viewer */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Card */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="glass-card"
          style={{
            padding: 40,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            textAlign: "center",
            borderColor: isFlipped ? "var(--accent)" : "var(--border)",
            transition: "all 0.3s ease",
            position: "relative",
          }}
        >
          {/* Card Header */}
          <div style={{ position: "absolute", top: 16, left: 20, display: "flex", gap: 8 }}>
            <span className={`badge ${BLOOM_BADGE[cards[currentCard].bloom]}`}>
              {cards[currentCard].bloom}
            </span>
            <span className="badge" style={{ background: "rgba(88,166,255,0.12)", color: "var(--info)" }}>
              {cards[currentCard].lo}
            </span>
          </div>
          <div style={{ position: "absolute", top: 16, right: 20, fontSize: 12, color: "var(--muted)" }}>
            {currentCard + 1} / {cards.length}
          </div>

          {/* Card Content */}
          <div style={{ fontSize: isFlipped ? 15 : 18, fontWeight: isFlipped ? 400 : 600, lineHeight: 1.6, maxWidth: 500 }}>
            {isFlipped ? cards[currentCard].back : cards[currentCard].front}
          </div>

          {/* Flip indicator */}
          <p style={{ position: "absolute", bottom: 16, fontSize: 12, color: "var(--muted)" }}>
            {isFlipped ? "Click to see question" : "Click to reveal answer"}
          </p>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
          <button
            className="btn-secondary"
            onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setIsFlipped(false); }}
            disabled={currentCard === 0}
            style={{ opacity: currentCard === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          <button
            className="btn-primary"
            onClick={() => { setCurrentCard(Math.min(cards.length - 1, currentCard + 1)); setIsFlipped(false); }}
            disabled={currentCard === cards.length - 1}
            style={{ opacity: currentCard === cards.length - 1 ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>

        {/* Card List */}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--muted)" }}>All Cards</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cards.map((card, i) => (
              <div
                key={card.id}
                onClick={() => { setCurrentCard(i); setIsFlipped(false); }}
                className="glass-card"
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderColor: i === currentCard ? "var(--primary)" : undefined,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{card.front}</span>
                <span className={`badge ${BLOOM_BADGE[card.bloom]}`} style={{ flexShrink: 0 }}>
                  {card.bloom}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
