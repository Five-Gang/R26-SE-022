"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { modulesApi, summariesApi } from "@/lib/api";

const OUTPUT_TYPES = [
  { value: "summary", label: "📋 Summary", desc: "Educational summary" },
  { value: "flashcards", label: "🃏 Flashcards", desc: "Study flashcards" },
  { value: "quiz", label: "❓ Quiz", desc: "Practice quiz" },
];

export default function SummarizePage() {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [outputType, setOutputType] = useState("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Module health state
  const [moduleLOs, setModuleLOs] = useState<any[]>([]);
  const [moduleWeeks, setModuleWeeks] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const toggleAnswer = (id: number) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCard = (id: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await modulesApi.list();
        setModules(data);
        if (data.length > 0) {
          setSelectedModuleId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };
    fetchModules();
  }, []);

  // Fetch LOs and weeks whenever selected module changes
  useEffect(() => {
    if (!selectedModuleId) return;
    const fetchModuleHealth = async () => {
      setHealthLoading(true);
      try {
        const [los, weeks] = await Promise.all([
          modulesApi.getLearningOutcomes(selectedModuleId),
          modulesApi.getWeeks(selectedModuleId),
        ]);
        setModuleLOs(los || []);
        setModuleWeeks(weeks || []);
      } catch (err) {
        console.error("Failed to fetch module health:", err);
        setModuleLOs([]);
        setModuleWeeks([]);
      } finally {
        setHealthLoading(false);
      }
    };
    fetchModuleHealth();
  }, [selectedModuleId]);

  const handleGenerate = async () => {
    if (!selectedModuleId) {
      setErrorMsg("Please select a module first.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setResult(null);
    setRevealedAnswers(new Set());
    setFlippedCards(new Set());

    try {
      const response = await summariesApi.generate({
        module_id: selectedModuleId,
        week_number: weekNumber || undefined,
        query: "",
        output_type: outputType,
      });

      setResult(response);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setErrorMsg(err.message || "Failed to generate from backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  const hasNoLOs = !healthLoading && selectedModuleId && moduleLOs.length === 0;
  const hasNoOutline = !healthLoading && selectedModuleId && moduleWeeks.length === 0;
  const hasWarnings = hasNoLOs || hasNoOutline;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Generate</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          LO-aligned educational summaries, flashcards, and quizzes — powered by the LO-RAG pipeline
        </p>
      </div>

      {/* ── Module Health Warning Banner ── */}
      {hasWarnings && (
        <div style={{
          marginBottom: 20,
          borderRadius: 12,
          border: "1px solid rgba(248,148,6,0.4)",
          background: "rgba(248,148,6,0.07)",
          overflow: "hidden",
        }}>
          {/* Banner header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderBottom: "1px solid rgba(248,148,6,0.25)",
            background: "rgba(248,148,6,0.12)",
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f89406" }}>
              Degraded Output Mode — Module Setup Incomplete
            </span>
          </div>

          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* No LOs warning */}
            {hasNoLOs && (
              <div style={{
                display: "flex",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 8,
                background: "rgba(248,81,73,0.1)",
                border: "1px solid rgba(248,81,73,0.3)",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🎯</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#f85149", marginBottom: 3 }}>
                    No Learning Outcomes Found
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                    The LO-anchored retrieval pipeline is <strong style={{ color: "var(--foreground)" }}>disabled</strong>. Without LOs, the system cannot:
                    perform Bloom&apos;s-aware retrieval, boost relevant chunks, compute LOCS/ERS scores, or tailor depth per outcome.
                    The output will behave like a <strong style={{ color: "var(--foreground)" }}>generic AI summarizer</strong> — equivalent to ChatGPT.
                  </div>
                  <a href="/modules" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "underline", display: "inline-block", marginTop: 6 }}>
                    → Upload module outline (PDF) to extract LOs automatically
                  </a>
                </div>
              </div>
            )}

            {/* No weekly outline warning */}
            {hasNoOutline && (
              <div style={{
                display: "flex",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 8,
                background: "rgba(248,148,6,0.08)",
                border: "1px solid rgba(248,148,6,0.25)",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#f89406", marginBottom: 3 }}>
                    No Weekly Curriculum Outline Found
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                    The LLM has <strong style={{ color: "var(--foreground)" }}>no curriculum context</strong>. It cannot anchor summaries to specific weeks,
                    show course progression, or understand which topics are covered when.
                    The prompt will include &quot;No module outline available&quot; which reduces educational alignment.
                  </div>
                  <a href="/modules" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "underline", display: "inline-block", marginTop: 6 }}>
                    → Go to Modules to upload the course outline
                  </a>
                </div>
              </div>
            )}

            {/* Impact summary */}
            <div style={{
              marginTop: 2,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: hasNoLOs ? "#f85149" : "var(--accent)" }}>{hasNoLOs ? "✗" : "✓"}</span>
                <span style={{ color: "var(--muted)", marginLeft: 6 }}>LO-Anchored Retrieval</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: hasNoLOs ? "#f85149" : "var(--accent)" }}>{hasNoLOs ? "✗" : "✓"}</span>
                <span style={{ color: "var(--muted)", marginLeft: 6 }}>Bloom&apos;s Depth Matching</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: hasNoOutline ? "#f89406" : "var(--accent)" }}>{hasNoOutline ? "✗" : "✓"}</span>
                <span style={{ color: "var(--muted)", marginLeft: 6 }}>Weekly Curriculum Context</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: hasNoLOs ? "#f85149" : "var(--accent)" }}>{hasNoLOs ? "✗" : "✓"}</span>
                <span style={{ color: "var(--muted)", marginLeft: 6 }}>LOCS / ERS Scoring</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module health summary badge (when all good) */}
      {!hasWarnings && !healthLoading && selectedModuleId && (
        <div style={{
          marginBottom: 16,
          padding: "10px 16px",
          borderRadius: 10,
          background: "rgba(62,207,142,0.07)",
          border: "1px solid rgba(62,207,142,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
        }}>
          <span style={{ color: "var(--accent)", fontSize: 16 }}>✅</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>Module Ready</span>
          <span style={{ color: "var(--muted)" }}>—</span>
          <span style={{ color: "var(--muted)" }}>
            <strong style={{ color: "var(--foreground)" }}>{moduleLOs.length}</strong> Learning Outcomes &nbsp;·&nbsp;
            <strong style={{ color: "var(--foreground)" }}>{moduleWeeks.length}</strong> Weeks of Curriculum
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(62,207,142,0.15)", color: "var(--accent)" }}>
            Full LO-RAG Pipeline Active
          </span>
        </div>
      )}

      {/* Module & Week Selector */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
              Target Module *
            </label>
            {modules.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--warning)" }}>
                ⚠️ No modules found. <a href="/modules" style={{ color: "var(--primary)", textDecoration: "underline" }}>Create a module</a> first.
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
              Week (Optional)
            </label>
            <select
              className="input-field"
              value={weekNumber ?? ""}
              onChange={(e) => setWeekNumber(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Weeks</option>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Output type + Generate */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        {errorMsg && (
          <div style={{ padding: "8px 12px", background: "rgba(248,81,73,0.15)", border: "1px solid var(--danger)", borderRadius: 6, color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
            {errorMsg}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Output type tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {OUTPUT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setOutputType(t.value)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: outputType === t.value ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: outputType === t.value ? "var(--primary-glow)" : "transparent",
                  color: outputType === t.value ? "var(--primary)" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedModuleId}
            style={{ opacity: isGenerating || !selectedModuleId ? 0.5 : 1 }}
          >
            {isGenerating ? "⏳ Generating..." : "✨ Generate"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--primary)", borderTopColor: "transparent", animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 700 }}>
              {outputType === "flashcards" ? "Building Flashcards via LO-RAG…" : outputType === "quiz" ? "Composing Quiz via LO-RAG…" : "Generating Summary via LO-RAG…"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "1. Fetching curriculum Learning Outcomes",
              "2. Running LO-anchored dual retrieval",
              "3. Re-ranking chunks with Cross-Encoder",
              "4. Compressing context & filtering redundancy",
              "5. Building Bloom's-aware prompt",
              "6. Generating via Gemini 2.5 Flash",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                <span style={{ color: "var(--accent)" }}>✓</span> {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && !isGenerating && (
        <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
          {/* Result header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                {result.output_type === "quiz"
                  ? `❓ Generated Quiz (${result.questions?.length || 0} Questions)`
                  : result.output_type === "flashcards"
                  ? `🃏 Generated Flashcards (${result.flashcards?.length || 0} Cards)`
                  : "📋 Generated Summary"}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, background: "var(--surface)", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", color: "var(--muted)" }}>
                🤖 {result.metadata?.model || "gemini-2.5-flash"}
              </span>
              <span style={{ fontSize: 11, background: "var(--surface)", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", color: "var(--muted)" }}>
                ⏱️ {((result.metadata?.generation_time_ms || 0) / 1000).toFixed(1)}s
              </span>
              <span style={{ fontSize: 11, background: "var(--surface)", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", color: "var(--muted)" }}>
                📄 {result.metadata?.chunks_used || 0} chunks
              </span>
              {result.output_type === "summary" && (
                <button
                  onClick={handleCopy}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)", background: copied ? "rgba(62,207,142,0.15)" : "var(--surface)", color: copied ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.2s" }}
                >
                  {copied ? "✓ Copied!" : "⎘ Copy"}
                </button>
              )}
            </div>
          </div>

          {/* ── QUIZ RENDERER ── */}
          {result.output_type === "quiz" && result.questions && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {result.questions.map((q: any, idx: number) => {
                const revealed = revealedAnswers.has(q.id ?? idx);
                const diffColor = q.difficulty === "easy" ? "var(--accent)" : q.difficulty === "medium" ? "var(--warning)" : "var(--danger)";
                return (
                  <div key={idx} style={{ padding: 20, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(110,86,207,0.15)", color: "var(--primary)", fontWeight: 700 }}>{q.type?.replace("_", " ").toUpperCase()}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(62,207,142,0.1)", color: "var(--accent)", fontWeight: 600 }}>{q.learning_outcome}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${diffColor}18`, color: diffColor, fontWeight: 600 }}>{q.difficulty}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--surface-2, rgba(255,255,255,0.05))", color: "var(--muted)" }}>{q.bloom_level}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>
                      <span style={{ color: "var(--muted)", marginRight: 8 }}>Q{idx + 1}.</span>{q.question}
                    </p>
                    {q.type === "mcq" && q.options && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                        {q.options.map((opt: string, oi: number) => {
                          const letter = String.fromCharCode(65 + oi);
                          const isCorrect = revealed && opt === q.correct_answer;
                          return (
                            <div key={oi} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${isCorrect ? "var(--accent)" : "var(--border)"}`, background: isCorrect ? "rgba(62,207,142,0.1)" : "transparent", fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color: isCorrect ? "var(--accent)" : "var(--muted)", minWidth: 20 }}>{letter}.</span>
                              <span>{opt}</span>
                              {isCorrect && <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 700 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "true_false" && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        {["True", "False"].map(opt => (
                          <div key={opt} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${revealed && opt === q.correct_answer ? "var(--accent)" : "var(--border)"}`, background: revealed && opt === q.correct_answer ? "rgba(62,207,142,0.1)" : "transparent", fontSize: 13, cursor: "default" }}>{opt}</div>
                        ))}
                      </div>
                    )}
                    {revealed && (
                      <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 6, background: "rgba(110,86,207,0.08)", border: "1px solid rgba(110,86,207,0.2)", fontSize: 12 }}>
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>Answer: </span>{q.correct_answer}<br />
                        <span style={{ color: "var(--muted)" }}>{q.explanation}</span>
                      </div>
                    )}
                    <button
                      onClick={() => toggleAnswer(q.id ?? idx)}
                      style={{ marginTop: 10, padding: "6px 16px", borderRadius: 6, border: "1px solid var(--border)", background: revealed ? "rgba(62,207,142,0.1)" : "var(--surface)", color: revealed ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
                    >
                      {revealed ? "Hide Answer" : "Reveal Answer"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── FLASHCARD RENDERER ── */}
          {result.output_type === "flashcards" && result.flashcards && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {result.flashcards.map((card: any, idx: number) => {
                const flipped = flippedCards.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCard(idx)}
                    style={{ cursor: "pointer", minHeight: 160, padding: 20, borderRadius: 10, border: "1px solid var(--border)", background: flipped ? "rgba(110,86,207,0.08)" : "var(--surface)", transition: "all 0.3s ease", display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(110,86,207,0.15)", color: "var(--primary)", fontWeight: 700 }}>{card.learning_outcome || card.lo_code || ""}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{flipped ? "Back ↩" : "Front — tap to flip"}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: flipped ? 400 : 600, color: flipped ? "var(--muted)" : "var(--foreground)", lineHeight: 1.5, flex: 1 }}>
                      {flipped ? (card.back || card.answer) : (card.front || card.question)}
                    </p>
                    {flipped && card.bloom_level && (
                      <span style={{ fontSize: 10, color: "var(--accent)" }}>Bloom&apos;s: {card.bloom_level}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SUMMARY RENDERER ── */}
          {(!result.output_type || result.output_type === "summary") && (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
            </div>
          )}

          {/* Citations — summary only */}
          {result.output_type === "summary" && result.citations && result.citations.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--primary)" }}>📚 Lecture Material Citations ({result.citations.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.citations.map((c: any, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", display: "flex", gap: 8 }}>
                    <strong style={{ color: "var(--accent)", flexShrink: 0 }}>[{idx + 1}]</strong>
                    <span><strong style={{ color: "var(--foreground)" }}>{c.source || "Lecture Material"}</strong> — {c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
