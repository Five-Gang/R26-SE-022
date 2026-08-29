"use client";

import { useState } from "react";

const SAMPLE_QUESTIONS = [
  {
    id: 1, type: "mcq", question: "Which of the following is NOT a requirement of First Normal Form (1NF)?",
    options: ["Atomic values in each column", "Unique rows", "No repeating groups", "No transitive dependencies"],
    correct_answer: "No transitive dependencies", explanation: "No transitive dependencies is a requirement of 3NF, not 1NF. 1NF requires atomic values, unique rows, and no repeating groups.",
    lo: "LO2", bloom: "Remember", difficulty: "easy",
  },
  {
    id: 2, type: "mcq", question: "A table has columns (StudentID, CourseID, CourseName, InstructorName). StudentID+CourseID is the composite primary key. CourseName depends only on CourseID. This violates:",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correct_answer: "2NF", explanation: "CourseName depends only on CourseID (part of the composite key), creating a partial dependency. This violates 2NF which requires full functional dependency on the entire primary key.",
    lo: "LO2", bloom: "Analyze", difficulty: "hard",
  },
  {
    id: 3, type: "true_false", question: "A relation in 3NF is always in 2NF.",
    options: ["True", "False"],
    correct_answer: "True", explanation: "Normal forms are hierarchical. A relation must satisfy all lower normal forms before meeting a higher one. 3NF requires 2NF which requires 1NF.",
    lo: "LO2", bloom: "Understand", difficulty: "easy",
  },
];

const BLOOM_BADGE: Record<string, string> = {
  Remember: "badge-remember", Understand: "badge-understand", Apply: "badge-apply",
  Analyze: "badge-analyze", Evaluate: "badge-evaluate", Create: "badge-create",
};

export default function QuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const q = SAMPLE_QUESTIONS[currentQ];

  const handleAnswer = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowExplanation(true);
    setAnswered(answered + 1);
    if (answer === q.correct_answer) setScore(score + 1);
  };

  const nextQuestion = () => {
    if (currentQ < SAMPLE_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Quiz</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          Test your understanding with LO-aligned questions
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, maxWidth: 960 }}>
        {/* Question Panel */}
        <div>
          <div className="glass-card" style={{ padding: 24 }}>
            {/* Question Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span className={`badge ${BLOOM_BADGE[q.bloom]}`}>{q.bloom}</span>
                <span className="badge" style={{ background: "rgba(88,166,255,0.12)", color: "var(--info)" }}>
                  {q.lo}
                </span>
                <span className="badge" style={{
                  background: q.difficulty === "easy" ? "rgba(62,207,142,0.12)" : q.difficulty === "medium" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  color: q.difficulty === "easy" ? "var(--accent)" : q.difficulty === "medium" ? "var(--warning)" : "var(--danger)",
                }}>
                  {q.difficulty}
                </span>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {currentQ + 1} / {SAMPLE_QUESTIONS.length}
              </span>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>{q.question}</h3>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options?.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === q.correct_answer;
                let borderColor = "var(--border)";
                let bgColor = "transparent";

                if (showExplanation) {
                  if (isCorrect) {
                    borderColor = "var(--accent)";
                    bgColor = "rgba(62,207,142,0.08)";
                  } else if (isSelected && !isCorrect) {
                    borderColor = "var(--danger)";
                    bgColor = "rgba(248,81,73,0.08)";
                  }
                } else if (isSelected) {
                  borderColor = "var(--primary)";
                  bgColor = "var(--primary-glow)";
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      textAlign: "left",
                      fontSize: 14,
                      cursor: showExplanation ? "default" : "pointer",
                      color: "var(--foreground)",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--muted)", minWidth: 20 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {option}
                    {showExplanation && isCorrect && <span style={{ marginLeft: "auto", color: "var(--accent)" }}>✓</span>}
                    {showExplanation && isSelected && !isCorrect && <span style={{ marginLeft: "auto", color: "var(--danger)" }}>✗</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="animate-fade-in" style={{ marginTop: 20, padding: 16, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: selectedAnswer === q.correct_answer ? "var(--accent)" : "var(--danger)", marginBottom: 8 }}>
                  {selectedAnswer === q.correct_answer ? "✓ Correct!" : "✗ Incorrect"}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}

            {/* Next Button */}
            {showExplanation && currentQ < SAMPLE_QUESTIONS.length - 1 && (
              <button className="btn-primary" onClick={nextQuestion} style={{ marginTop: 16 }}>
                Next Question →
              </button>
            )}
          </div>
        </div>

        {/* Score Sidebar */}
        <div>
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Score</h3>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "var(--primary)" }}>
                {score}/{answered}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {answered > 0 ? `${((score / answered) * 100).toFixed(0)}% accuracy` : "Start answering"}
              </div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(answered / SAMPLE_QUESTIONS.length) * 100}%`,
                    background: "var(--primary)",
                    borderRadius: 3,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {answered} of {SAMPLE_QUESTIONS.length} answered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
