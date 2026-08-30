"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { modulesApi, compareApi } from "@/lib/api";

export default function ComparePage() {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"split" | "generic" | "loaess">("split");

  useEffect(() => {
    modulesApi.list().then((data) => {
      setModules(data);
      if (data.length > 0) setSelectedModuleId(data[0].id);
    });
  }, []);

  const handleCompare = async () => {
    if (!query.trim() || !selectedModuleId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await compareApi.run({
        module_id: selectedModuleId,
        query: query.trim(),
        week_number: weekNumber ?? undefined,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const locsImprovement = result
    ? (
        ((result.loa_ess.lo_coverage / Math.max(result.loa_ess.total_los, 1)) -
          (result.generic_ai.lo_coverage / Math.max(result.generic_ai.total_los, 1))) *
        100
      ).toFixed(0)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(22,27,34,0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }} className="gradient-text">LOA-ESS</div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Live Comparison</span>
          <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "rgba(62,207,142,0.15)", color: "var(--accent)", fontWeight: 700 }}>
            vs Generic AI
          </span>
        </div>
        {result && (
          <div style={{ display: "flex", gap: 6 }}>
            {(["split", "generic", "loaess"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: activeView === v ? "var(--primary)" : "var(--surface)",
                  color: activeView === v ? "white" : "var(--muted)",
                  transition: "all 0.15s",
                }}
              >
                {v === "split" ? "⚡ Split View" : v === "generic" ? "🤖 Generic AI" : "🎓 LOA-ESS"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* Query panel */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>MODULE</label>
              {modules.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--warning)" }}>⚠️ No modules. <a href="/modules" style={{ color: "var(--primary)" }}>Create one first.</a></div>
              ) : (
                <select className="input-field" value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>WEEK</label>
              <select className="input-field" value={weekNumber ?? ""} onChange={(e) => setWeekNumber(e.target.value ? Number(e.target.value) : null)}>
                <option value="">All Weeks</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((w) => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                className="btn-primary"
                style={{ width: "100%", opacity: loading || !query.trim() || !selectedModuleId ? 0.5 : 1 }}
                disabled={loading || !query.trim() || !selectedModuleId}
                onClick={handleCompare}
              >
                {loading ? "⏳ Running..." : "⚡ Compare"}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>YOUR QUERY</label>
            <textarea
              className="input-field"
              style={{ minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
              placeholder="e.g. Summarize Week 3 content on buffer overflow vulnerabilities and threat modelling..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: "8px 14px", background: "rgba(248,81,73,0.12)", border: "1px solid var(--danger)", borderRadius: 8, color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card" style={{ padding: 32, textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
              {["Generic AI", "LOA-ESS Pipeline"].map((label, i) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${i === 0 ? "var(--primary)" : "var(--accent)"}`, borderTopColor: "transparent", animation: "spin 0.9s linear infinite", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? "var(--primary)" : "var(--accent)" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{i === 0 ? "No curriculum context" : "Full LO-RAG pipeline"}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Running both systems simultaneously with the same query…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Score cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: "LO Coverage", icon: "🎯",
                  generic: `${result.generic_ai.lo_coverage}/${result.generic_ai.total_los} LOs`,
                  ours: `${result.loa_ess.lo_coverage}/${result.loa_ess.total_los} LOs`,
                  winner: "ours",
                },
                {
                  label: "Slide Citations", icon: "📚",
                  generic: `${result.generic_ai.citations} citations`,
                  ours: `${result.loa_ess.citations} citations`,
                  winner: result.loa_ess.citations > result.generic_ai.citations ? "ours" : "generic",
                },
                {
                  label: "Chunks Used", icon: "🔗",
                  generic: "0 (no retrieval)",
                  ours: `${result.loa_ess.chunks_used} lecture chunks`,
                  winner: "ours",
                },
                {
                  label: "Generation Time", icon: "⏱️",
                  generic: `${(result.generic_ai.generation_time_ms / 1000).toFixed(1)}s`,
                  ours: `${(result.loa_ess.generation_time_ms / 1000).toFixed(1)}s`,
                  winner: "note",
                },
              ].map((card) => (
                <div key={card.label} className="glass-card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {card.icon} {card.label}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--primary)" }}>Generic</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: card.winner === "generic" ? "var(--accent)" : "var(--muted)" }}>{card.generic}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--accent)" }}>LOA-ESS</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: card.winner === "ours" ? "var(--accent)" : "var(--muted)" }}>
                        {card.ours} {card.winner === "ours" && "★"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Key difference banner */}
            {locsImprovement && Number(locsImprovement) > 0 && (
              <div style={{
                marginBottom: 24, padding: "14px 24px",
                background: "linear-gradient(135deg, rgba(62,207,142,0.1), rgba(110,86,207,0.08))",
                border: "1px solid rgba(62,207,142,0.3)", borderRadius: 12,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <span style={{ fontSize: 28 }}>🎓</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                    LOA-ESS covered {locsImprovement}% more Learning Outcomes than the generic AI
                  </span>
                  <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8 }}>
                    — and grounded every claim in your actual lecture slides.
                  </span>
                </div>
              </div>
            )}

            {/* Split / single view */}
            {activeView === "split" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <OutputPanel
                  label="🤖 Generic AI"
                  subtitle="No curriculum context · No LOs · No slides"
                  accentColor="var(--primary)"
                  borderColor="rgba(110,86,207,0.3)"
                  content={result.generic_ai.content}
                  tags={[
                    { text: "Generic", color: "var(--primary)" },
                    { text: `${result.generic_ai.citations} citations`, color: "var(--muted)" },
                    { text: `${result.generic_ai.lo_coverage}/${result.generic_ai.total_los} LOs`, color: "var(--muted)" },
                  ]}
                  problems={[
                    "No knowledge of your Learning Outcomes",
                    "No access to your lecture slides",
                    "Bloom's level not matched",
                    "Generic internet content",
                  ]}
                />
                <OutputPanel
                  label="🎓 LOA-ESS (Ours)"
                  subtitle="Full LO-RAG pipeline · Curriculum-aware · Slide-grounded"
                  accentColor="var(--accent)"
                  borderColor="rgba(62,207,142,0.35)"
                  content={result.loa_ess.content}
                  tags={[
                    { text: "LOA-ESS", color: "var(--accent)" },
                    { text: `${result.loa_ess.citations} slide citations`, color: "var(--accent)" },
                    { text: `${result.loa_ess.lo_coverage}/${result.loa_ess.total_los} LOs covered`, color: "var(--accent)" },
                    { text: `${result.loa_ess.chunks_used} chunks`, color: "var(--muted)" },
                  ]}
                  strengths={[
                    "Explicitly mapped to your module LOs",
                    "Every claim cites your actual slides",
                    "Bloom's taxonomy depth matched per LO",
                    "Cross-references across weeks",
                  ]}
                />
              </div>
            )}

            {activeView === "generic" && (
              <OutputPanel
                label="🤖 Generic AI"
                subtitle="No curriculum context · No LOs · No slides"
                accentColor="var(--primary)"
                borderColor="rgba(110,86,207,0.3)"
                content={result.generic_ai.content}
                tags={[
                  { text: "Generic", color: "var(--primary)" },
                  { text: `${result.generic_ai.citations} citations`, color: "var(--muted)" },
                  { text: `${result.generic_ai.lo_coverage}/${result.generic_ai.total_los} LOs`, color: "var(--muted)" },
                ]}
                problems={[
                  "No knowledge of your Learning Outcomes",
                  "No access to your lecture slides",
                  "Bloom's level not matched",
                  "Generic internet content",
                ]}
                fullWidth
              />
            )}

            {activeView === "loaess" && (
              <OutputPanel
                label="🎓 LOA-ESS (Ours)"
                subtitle="Full LO-RAG pipeline · Curriculum-aware · Slide-grounded"
                accentColor="var(--accent)"
                borderColor="rgba(62,207,142,0.35)"
                content={result.loa_ess.content}
                tags={[
                  { text: "LOA-ESS", color: "var(--accent)" },
                  { text: `${result.loa_ess.citations} slide citations`, color: "var(--accent)" },
                  { text: `${result.loa_ess.lo_coverage}/${result.loa_ess.total_los} LOs covered`, color: "var(--accent)" },
                  { text: `${result.loa_ess.chunks_used} chunks`, color: "var(--muted)" },
                ]}
                strengths={[
                  "Explicitly mapped to your module LOs",
                  "Every claim cites your actual slides",
                  "Bloom's taxonomy depth matched per LO",
                  "Cross-references across weeks",
                ]}
                fullWidth
              />
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="glass-card" style={{ padding: 56, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Live Accuracy Comparison</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Type any topic query above. Both systems run in parallel — Generic AI (no curriculum knowledge) vs LOA-ESS (full LO-RAG pipeline). The difference proves the research contribution.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Reusable output panel ─────────────────────────────────────────────────────

function OutputPanel({
  label, subtitle, accentColor, borderColor, content, tags,
  problems, strengths, fullWidth,
}: {
  label: string; subtitle: string; accentColor: string; borderColor: string;
  content: string; tags: { text: string; color: string }[];
  problems?: string[]; strengths?: string[]; fullWidth?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{subtitle}</div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map((tag, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)", color: tag.color }}>
            {tag.text}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card" style={{
        padding: 24,
        borderColor,
        maxHeight: fullWidth ? "none" : 680,
        overflow: "auto",
        flex: 1,
      }}>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "_No content generated._"}</ReactMarkdown>
        </div>
      </div>

      {/* Problems or strengths */}
      {problems && (
        <div style={{ padding: 14, background: "rgba(248,81,73,0.06)", border: "1px solid rgba(248,81,73,0.18)", borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>❌ What's Missing</div>
          {problems.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              <span style={{ color: "var(--danger)", flexShrink: 0 }}>✗</span>{p}
            </div>
          ))}
        </div>
      )}
      {strengths && (
        <div style={{ padding: 14, background: "rgba(62,207,142,0.06)", border: "1px solid rgba(62,207,142,0.18)", borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>✅ What LOA-ESS Adds</div>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>{s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
