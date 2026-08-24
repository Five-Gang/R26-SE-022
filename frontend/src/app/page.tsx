"use client";

export default function Dashboard() {
  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          Learning Outcome-Aware Educational Summarization System
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          { label: "Modules", value: "—", icon: "📚", color: "var(--primary)" },
          { label: "Documents", value: "—", icon: "📄", color: "var(--accent)" },
          { label: "Summaries Generated", value: "—", icon: "✨", color: "var(--info)" },
          { label: "LO Coverage Avg", value: "—", icon: "🎯", color: "var(--warning)" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 28 }}>{stat.icon}</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: stat.color,
                }}
              >
                {stat.value}
              </span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <a href="/modules" className="glass-card" style={{ padding: 24, textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20 }}>📚</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Manage Modules</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              Add modules, upload module outlines, and manage learning outcomes.
            </p>
          </a>

          <a href="/summarize" className="glass-card" style={{ padding: 24, textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20 }}>✨</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Generate Summary</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              Create LO-aligned summaries with Bloom&apos;s taxonomy-aware depth control.
            </p>
          </a>

          <a href="/flashcards" className="glass-card" style={{ padding: 24, textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20 }}>🃏</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Flashcards & Quiz</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              Generate flashcards and quizzes mapped to learning outcomes.
            </p>
          </a>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          LO-RAG Pipeline Architecture
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          {[
            "Module Outline",
            "→",
            "LO Extraction",
            "→",
            "Bloom's Classification",
            "→",
            "Document Chunking",
            "→",
            "Embedding",
            "→",
            "LO-Anchored Retrieval",
            "→",
            "Re-ranking",
            "→",
            "Prompt Construction",
            "→",
            "LLM Generation",
            "→",
            "Validation",
          ].map((step, i) =>
            step === "→" ? (
              <span key={i} style={{ color: "var(--primary)", fontWeight: 700 }}>
                →
              </span>
            ) : (
              <span
                key={i}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  color: step.includes("LO") ? "var(--primary)" : "var(--foreground)",
                  fontWeight: step.includes("LO") ? 600 : 400,
                }}
              >
                {step}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
