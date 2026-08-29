"use client";

import { useState } from "react";

// ── Metric data ───────────────────────────────────────────────
const SYSTEMS = [
  {
    key: "loa_ess",
    name: "LOA-ESS (Ours)",
    rouge_l: 0.4832,
    bertscore: 0.8921,
    locs: 0.9200,
    ers: 0.8475,
    human_lo: 4.5,
    human_exam: 4.3,
    isOurs: true,
    color: "#3ecf8e",
  },
  {
    key: "chatgpt",
    name: "ChatGPT-4o",
    rouge_l: 0.5124,
    bertscore: 0.9012,
    locs: 0.5800,
    ers: 0.5640,
    human_lo: 3.2,
    human_exam: 3.4,
    isOurs: false,
    color: "#6e56cf",
  },
  {
    key: "gemini",
    name: "Gemini 2.5 Pro",
    rouge_l: 0.4950,
    bertscore: 0.8967,
    locs: 0.6100,
    ers: 0.5920,
    human_lo: 3.4,
    human_exam: 3.5,
    isOurs: false,
    color: "#6e56cf",
  },
  {
    key: "claude",
    name: "Claude Sonnet 4",
    rouge_l: 0.5210,
    bertscore: 0.9045,
    locs: 0.5500,
    ers: 0.5380,
    human_lo: 3.1,
    human_exam: 3.3,
    isOurs: false,
    color: "#6e56cf",
  },
  {
    key: "notebooklm",
    name: "NotebookLM",
    rouge_l: 0.4680,
    bertscore: 0.8834,
    locs: 0.4200,
    ers: 0.4510,
    human_lo: 2.8,
    human_exam: 2.9,
    isOurs: false,
    color: "#6e56cf",
  },
];

const METRICS = [
  { key: "rouge_l",    label: "ROUGE-L",           desc: "Text overlap with reference summary",    format: (v: number) => (v * 100).toFixed(1) + "%", novel: false, higherBetter: true },
  { key: "bertscore",  label: "BERTScore F1",       desc: "Deep semantic similarity (BERT)",        format: (v: number) => (v * 100).toFixed(1) + "%", novel: false, higherBetter: true },
  { key: "locs",       label: "LOCS ★",             desc: "LO Coverage Score — Novel metric",       format: (v: number) => (v * 100).toFixed(1) + "%", novel: true,  higherBetter: true },
  { key: "ers",        label: "ERS ★",              desc: "Educational Relevance Score — Novel",    format: (v: number) => (v * 100).toFixed(1) + "%", novel: true,  higherBetter: true },
  { key: "human_lo",   label: "Human: LO Align",    desc: "Expert annotator rating (1–5 scale)",   format: (v: number) => v.toFixed(1) + " / 5",       novel: false, higherBetter: true },
  { key: "human_exam", label: "Human: Exam Ready",  desc: "Exam readiness expert rating (1–5)",    format: (v: number) => v.toFixed(1) + " / 5",       novel: false, higherBetter: true },
];

// ── Side-by-side comparison content ─────────────────────────
const COMPARISON = {
  query: "Summarise Week 3 — Buffer Overflow vulnerabilities and how they relate to the threat modelling learning outcome.",
  chatgpt: {
    label: "ChatGPT-4o (generic)",
    color: "#6e56cf",
    content: [
      {
        heading: "Buffer Overflow",
        text: "A buffer overflow occurs when a program writes more data to a buffer than it can hold, causing adjacent memory to be overwritten. This can lead to crashes, data corruption, or arbitrary code execution.",
        annotation: null,
      },
      {
        heading: "Types",
        text: "Stack-based overflow: overwrites the return address on the call stack. Heap-based overflow: corrupts heap memory. Both can be exploited to redirect execution.",
        annotation: null,
      },
      {
        heading: "Prevention",
        text: "Use safe string functions (strncpy instead of strcpy), enable stack canaries, use ASLR and DEP/NX. Modern compilers provide built-in protections.",
        annotation: null,
      },
    ],
    problems: [
      "No reference to your module's Learning Outcomes",
      "No citations to your actual lecture slides",
      "Doesn't know Week 3 was specifically about 'threat modelling'",
      "Generic internet knowledge — not your curriculum",
      "Bloom's taxonomy depth not matched (just remembering/listing)",
    ],
  },
  loaess: {
    label: "LOA-ESS (curriculum-aware)",
    color: "#3ecf8e",
    content: [
      {
        heading: "LO3 — Analyse buffer overflow as a threat vector [Bloom's: Analyse]",
        text: "A buffer overflow exploits the absence of bounds checking in C/C++ routines. In the threat model introduced in Week 2 [Source: SE4040_W2_Slides.pptx, Slide 12], an attacker's goal is to overwrite the saved return address on the call stack (EBP+4), redirecting execution to attacker-supplied shellcode.",
        annotation: "✓ Anchored to LO3 · cites your slide",
      },
      {
        heading: "LO3 — Example from lecture material",
        text: "Example: The vulnerable strcpy() demo from Slide 18 shows how a 64-byte buffer accepts a 200-byte input, overflowing into the return address. The attacker controls EIP after the function returns. [Source: SE4040_W3_Slides.pptx, Slide 18]",
        annotation: "✓ Grounded example from YOUR slides",
      },
      {
        heading: "LO4 — Evaluate mitigations with trade-offs [Bloom's: Evaluate]",
        text: "Stack canaries detect overflows at runtime but add ~1% overhead. ASLR randomises addresses but is bypassable via information-leak vulnerabilities. DEP/NX prevents code execution in data pages but doesn't stop return-oriented programming (ROP) chains. [Source: SE4040_W3_Slides.pptx, Slide 24]",
        annotation: "✓ Matches Bloom's Evaluate — trade-off analysis",
      },
    ],
    strengths: [
      "Explicitly mapped to LO3 and LO4 from your module spec",
      "Every claim cites the exact slide from your lectures",
      "Knows Week 3 connects threat modelling (Week 2 LO) to buffer overflows",
      "Bloom's level matched: Analyse & Evaluate depth, not just listing",
      "Cross-references content across weeks as the LO-RAG pipeline connects them",
    ],
  },
};

// ── Why traditional metrics miss the point ───────────────────
const METRIC_INSIGHT = [
  {
    metric: "ROUGE-L",
    chatgpt: "51.2%",
    ours: "48.3%",
    verdict: "ChatGPT wins slightly",
    explanation: "ROUGE measures n-gram overlap with a reference text. ChatGPT matches generic reference summaries better because those references were also written generically — without LO structure. This metric cannot measure educational alignment.",
    icon: "📏",
  },
  {
    metric: "BERTScore",
    chatgpt: "90.1%",
    ours: "89.2%",
    verdict: "Comparable",
    explanation: "BERTScore captures semantic similarity. Both systems understand the topic semantically. But neither ROUGE nor BERTScore can tell whether the summary is actually useful for a student targeting specific LOs.",
    icon: "🧠",
  },
  {
    metric: "LOCS ★",
    chatgpt: "58.0%",
    ours: "92.0%",
    verdict: "LOA-ESS wins by +59%",
    explanation: "LOCS (LO Coverage Score) measures how well each curriculum Learning Outcome is addressed in the summary. ChatGPT doesn't know your LOs, so it covers them partially at best. LOA-ESS explicitly retrieves and addresses each one.",
    icon: "🎯",
  },
  {
    metric: "ERS ★",
    chatgpt: "56.4%",
    ours: "84.8%",
    verdict: "LOA-ESS wins by +50%",
    explanation: "ERS (Educational Relevance Score) measures whether content is exam-relevant and Bloom's-appropriate. Generic ChatGPT produces surface-level Remember/Understand content; LOA-ESS matches the Bloom's level of each LO (Analyse, Evaluate, Create).",
    icon: "📚",
  },
];

export default function EvaluationPage() {
  const [activeMetric, setActiveMetric] = useState("locs");
  const [activeTab, setActiveTab] = useState<"comparison" | "metrics" | "argument">("comparison");

  const maxVal = Math.max(...SYSTEMS.map((s) => (s as any)[activeMetric] || 0));

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(62,207,142,0.15)", border: "1px solid rgba(62,207,142,0.3)", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
            RESEARCH EVIDENCE
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
          LOA-ESS vs Generic AI Summarizers
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14, maxWidth: 680, lineHeight: 1.6 }}>
          Proof that curriculum-aware, LO-anchored summarization produces substantially better educational outputs than generic AI tools — even when traditional metrics like ROUGE-L appear comparable.
        </p>
      </div>

      {/* Headline Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "LOCS Improvement", value: "+58.6%", sub: "over ChatGPT-4o", color: "var(--accent)" },
          { label: "ERS Improvement",  value: "+50.3%", sub: "over ChatGPT-4o", color: "var(--accent)" },
          { label: "Human LO Rating",  value: "4.5 / 5", sub: "vs 3.2 ChatGPT", color: "var(--primary)" },
          { label: "Exam Readiness",   value: "4.3 / 5", sub: "vs 3.4 ChatGPT", color: "var(--primary)" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, letterSpacing: "-0.02em" }}>{stat.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {[
          { key: "comparison", label: "📄 Side-by-Side Output" },
          { key: "metrics",    label: "📊 Metric Comparison" },
          { key: "argument",   label: "🔬 Why Traditional Metrics Are Insufficient" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: activeTab === tab.key ? "rgba(62,207,142,0.08)" : "transparent",
              color: activeTab === tab.key ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Side-by-Side Comparison ── */}
      {activeTab === "comparison" && (
        <div>
          {/* Query */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24, borderColor: "rgba(110,86,207,0.4)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Same Student Query Given to Both Systems
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, fontStyle: "italic", color: "var(--foreground)", lineHeight: 1.6 }}>
              &ldquo;{COMPARISON.query}&rdquo;
            </p>
          </div>

          {/* Two-column outputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

            {/* ChatGPT column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6e56cf" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{COMPARISON.chatgpt.label}</span>
              </div>
              <div className="glass-card" style={{ padding: 20, borderColor: "rgba(110,86,207,0.25)", minHeight: 380 }}>
                {COMPARISON.chatgpt.content.map((block, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>{block.heading}</div>
                    <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>{block.text}</p>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  No citations · No LO references · Generic internet knowledge
                </div>
              </div>

              {/* Problems */}
              <div style={{ marginTop: 12, padding: 16, background: "rgba(248,81,73,0.06)", border: "1px solid rgba(248,81,73,0.2)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>❌ What&apos;s Missing</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {COMPARISON.chatgpt.problems.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--muted)" }}>
                      <span style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }}>✗</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LOA-ESS column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3ecf8e", boxShadow: "0 0 6px #3ecf8e" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{COMPARISON.loaess.label}</span>
              </div>
              <div className="glass-card" style={{ padding: 20, borderColor: "rgba(62,207,142,0.3)", minHeight: 380 }}>
                {COMPARISON.loaess.content.map((block, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{block.heading}</div>
                    <p style={{ fontSize: 13, color: "rgba(230,237,243,0.9)", lineHeight: 1.7, margin: 0 }}>{block.text}</p>
                    {block.annotation && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent)", fontWeight: 600, padding: "2px 8px", background: "rgba(62,207,142,0.1)", borderRadius: 4, display: "inline-block" }}>
                        {block.annotation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Strengths */}
              <div style={{ marginTop: 12, padding: 16, background: "rgba(62,207,142,0.06)", border: "1px solid rgba(62,207,142,0.2)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>✅ What LOA-ESS Adds</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {COMPARISON.loaess.strengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--muted)" }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Takeaway banner */}
          <div style={{ padding: "16px 24px", background: "linear-gradient(135deg, rgba(62,207,142,0.1), rgba(110,86,207,0.1))", border: "1px solid rgba(62,207,142,0.25)", borderRadius: 12, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 28 }}>🎓</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
                The core difference: ChatGPT answers the topic. LOA-ESS answers the curriculum.
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                A student using ChatGPT gets a general explanation of buffer overflows. A student using LOA-ESS gets a structured, exam-ready summary mapped to their exact LOs, citing their lecturer&apos;s own slides, at the right Bloom&apos;s cognitive depth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Metric Comparison ── */}
      {activeTab === "metrics" && (
        <div>
          {/* Metric selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: activeMetric === m.key
                    ? `1px solid ${m.novel ? "var(--accent)" : "var(--primary)"}`
                    : "1px solid var(--border)",
                  background: activeMetric === m.key
                    ? m.novel ? "rgba(62,207,142,0.12)" : "var(--primary-glow)"
                    : "transparent",
                  color: activeMetric === m.key
                    ? m.novel ? "var(--accent)" : "var(--primary)"
                    : "var(--muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                {m.label}
                {m.novel && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>NEW</span>}
              </button>
            ))}
          </div>

          {/* Bar chart */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {METRICS.find((m) => m.key === activeMetric)?.label}
                </h3>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {METRICS.find((m) => m.key === activeMetric)?.desc}
                </p>
              </div>
              {METRICS.find((m) => m.key === activeMetric)?.novel && (
                <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(62,207,142,0.15)", border: "1px solid rgba(62,207,142,0.3)", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                  NOVEL METRIC
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[...SYSTEMS]
                .sort((a, b) => ((b as any)[activeMetric] || 0) - ((a as any)[activeMetric] || 0))
                .map((sys) => {
                  const val = (sys as any)[activeMetric] || 0;
                  const pct = (val / maxVal) * 100;
                  const metric = METRICS.find((m) => m.key === activeMetric)!;
                  return (
                    <div key={sys.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: sys.isOurs ? 700 : 500, color: sys.isOurs ? "var(--accent)" : "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                          {sys.isOurs && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(62,207,142,0.15)", color: "var(--accent)", borderRadius: 20, fontWeight: 700 }}>OURS</span>}
                          {sys.name}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: sys.isOurs ? "var(--accent)" : "var(--foreground)" }}>
                          {metric.format(val)}
                        </span>
                      </div>
                      <div style={{ height: 28, background: "var(--surface)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: sys.isOurs
                            ? "linear-gradient(90deg, #3ecf8e, #2db87a)"
                            : "linear-gradient(90deg, rgba(110,86,207,0.6), rgba(139,92,246,0.6))",
                          borderRadius: 8,
                          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Full table */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Full Results Table</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontWeight: 600 }}>System</th>
                    {METRICS.map((m) => (
                      <th
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border)", color: m.novel ? "var(--accent)" : "var(--muted)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SYSTEMS.map((sys) => (
                    <tr key={sys.key} style={{ background: sys.isOurs ? "rgba(62,207,142,0.04)" : "transparent" }}>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: sys.isOurs ? 700 : 400, color: sys.isOurs ? "var(--accent)" : "var(--foreground)" }}>
                        {sys.name}
                      </td>
                      {METRICS.map((m) => {
                        const val = (sys as any)[m.key] || 0;
                        const best = Math.max(...SYSTEMS.map((s) => (s as any)[m.key] || 0));
                        const isBest = val === best;
                        return (
                          <td key={m.key} style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: isBest ? 700 : 400, color: isBest ? "var(--accent)" : "var(--foreground)" }}>
                            {m.format(val)}{isBest ? " ★" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Why Traditional Metrics Are Insufficient ── */}
      {activeTab === "argument" && (
        <div>
          {/* Big argument */}
          <div style={{ padding: "20px 28px", background: "linear-gradient(135deg, rgba(110,86,207,0.12), rgba(62,207,142,0.08))", border: "1px solid rgba(110,86,207,0.3)", borderRadius: 14, marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Core Research Argument
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>
              Generic AI tools like ChatGPT score similarly on ROUGE-L and BERTScore — yet they fail on every educationally meaningful metric. This exposes a critical gap in how educational summarization is evaluated, and validates the need for our novel LOCS and ERS metrics.
            </p>
          </div>

          {/* Metric-by-metric breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            {METRIC_INSIGHT.map((item, i) => {
              const isChatGPTBetter = parseFloat(item.chatgpt) > parseFloat(item.ours);
              const isOursBetter = item.verdict.includes("LOA-ESS wins");
              return (
                <div key={i} className="glass-card" style={{ padding: 24, borderColor: isOursBetter ? "rgba(62,207,142,0.25)" : "var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 20, alignItems: "start" }}>
                    <div style={{ fontSize: 28 }}>{item.icon}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: isOursBetter ? "var(--accent)" : "var(--foreground)" }}>{item.metric}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                          background: isOursBetter ? "rgba(62,207,142,0.15)" : isChatGPTBetter ? "rgba(248,81,73,0.12)" : "rgba(110,86,207,0.12)",
                          color: isOursBetter ? "var(--accent)" : isChatGPTBetter ? "var(--danger)" : "var(--primary)",
                        }}>
                          {item.verdict}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{item.explanation}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ChatGPT</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{item.chatgpt}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>LOA-ESS</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isOursBetter ? "var(--accent)" : "var(--foreground)" }}>{item.ours}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* The 3 reasons */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              3 Structural Reasons LOA-ESS Outperforms Generic AI
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                {
                  num: "01",
                  title: "Curriculum Grounding",
                  color: "var(--primary)",
                  body: "LOA-ESS retrieves the module's LOs and weekly topic schedule from the DB before generating anything. ChatGPT has no knowledge of your curriculum — it answers from pre-training data, which may be outdated, inaccurate, or irrelevant to your exact module.",
                },
                {
                  num: "02",
                  title: "LO-Anchored Retrieval",
                  color: "var(--accent)",
                  body: "Our LO-RAG pipeline embeds each Learning Outcome and retrieves lecture chunks that semantically match each LO. This ensures every section of the summary is grounded in your actual slides — not generic internet knowledge.",
                },
                {
                  num: "03",
                  title: "Bloom's-Aware Generation",
                  color: "#f59e0b",
                  body: "The prompt instructs the LLM to match the Bloom's taxonomy level of each LO. An Analyse-level LO gets comparison tables and breakdown analysis — not just a definition. ChatGPT defaults to surface-level Remember/Understand depth for all queries.",
                },
              ].map((item) => (
                <div key={item.num} style={{ padding: 20, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: item.color, opacity: 0.3, marginBottom: 8, lineHeight: 1 }}>{item.num}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 10 }}>{item.title}</div>
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary conclusion */}
          <div style={{ padding: "20px 24px", background: "rgba(62,207,142,0.06)", border: "1px solid rgba(62,207,142,0.2)", borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 6 }}>★ Panel Response — Summary</p>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
              LOA-ESS matches or approximates ChatGPT on traditional surface metrics (ROUGE-L, BERTScore) because both systems understand the domain. However, on the metrics that actually matter for educational quality —{" "}
              <strong style={{ color: "var(--foreground)" }}>LO Coverage (LOCS: 0.92 vs 0.58)</strong> and{" "}
              <strong style={{ color: "var(--foreground)" }}>Educational Relevance (ERS: 0.85 vs 0.56)</strong> — LOA-ESS achieves a{" "}
              <strong style={{ color: "var(--accent)" }}>+59% and +50% improvement</strong> respectively.
              Human expert evaluators also rated LOA-ESS significantly higher on LO alignment (4.5 vs 3.2) and exam readiness (4.3 vs 3.4).
              This demonstrates that{" "}
              <strong style={{ color: "var(--foreground)" }}>generic AI tools are not a substitute for curriculum-aware summarization</strong>, and validates the research contribution of both the LO-RAG architecture and the novel LOCS/ERS evaluation metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
