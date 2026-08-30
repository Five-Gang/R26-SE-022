"use client";

import React, { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(decimals);
}

function confColor(level) {
  if (level === "HIGH") return "var(--success)";
  if (level === "MEDIUM") return "var(--warning)";
  return "var(--danger)";
}

function responseIcon(type) {
  if (type === "direct_answer") return "✓";
  if (type === "guided_hint") return "◎";
  return "?";
}

function responseLabel(type) {
  if (type === "direct_answer") return "Direct";
  if (type === "guided_hint") return "Hint";
  return "Clarif.";
}

function formatTime(iso) {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return (iso || "").slice(11, 16);
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-icon" style={{ color: color || "var(--accent-primary)" }}>
        {icon}
      </div>
      <div className="analytics-stat-value" style={{ color: color || "var(--text-primary)" }}>
        {value}
      </div>
      <div className="analytics-stat-label">{label}</div>
      {sub && <div className="analytics-stat-sub">{sub}</div>}
    </div>
  );
}

function DistBar({ label, count = 0, total = 0, color }) {
  const p = pct(count, total);
  return (
    <div className="analytics-dist-row">
      <div className="analytics-dist-label">
        <span style={{ color }}>{label}</span>
        <span className="analytics-dist-count">{count}</span>
      </div>
      <div className="analytics-dist-track">
        <div
          className="analytics-dist-fill"
          style={{ width: `${p}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <span className="analytics-dist-pct">{p}%</span>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AnalyticsPanel({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError("Could not load analytics. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open, then refresh every 30 s while open
  useEffect(() => {
    if (!isOpen) return;
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchAnalytics]);

  if (!isOpen) return null;

  const cd = data?.confidence_distribution;
  const rd = data?.response_type_distribution;
  const al = data?.confidence_response_alignment;
  const fb = data?.user_feedback;
  const totalConf = cd ? (cd.HIGH || 0) + (cd.MEDIUM || 0) + (cd.LOW || 0) : 0;
  const totalResp = rd ? (rd.direct_answer || 0) + (rd.guided_hint || 0) + (rd.clarification_request || 0) : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="analytics-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="analytics-panel" id="analytics-panel" role="dialog" aria-label="Analytics Dashboard">
        {/* Header */}
        <div className="analytics-header">
          <div>
            <div className="analytics-title">Research Analytics</div>
            <div className="analytics-subtitle">Live evaluation metrics from all logged interactions</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="analytics-refresh-btn"
              onClick={fetchAnalytics}
              disabled={loading}
              id="analytics-refresh-btn"
              title="Refresh metrics"
            >
              {loading ? "⟳" : "↻"}
            </button>
            <button
              className="analytics-close-btn"
              onClick={onClose}
              id="analytics-close-btn"
              aria-label="Close analytics panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="analytics-body">
          {error && (
            <div className="analytics-error">{error}</div>
          )}

          {loading && !data && (
            <div className="analytics-loading">
              <span className="spinner" />
              Loading analytics...
            </div>
          )}

          {data?.message && (
            <div className="analytics-empty">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div>{data.message}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                Ask a question in the chat to start collecting data.
              </div>
            </div>
          )}

          {data && !data.message && (
            <>
              {/* ── Stat cards ─────────────────────────────────── */}
              <div className="analytics-section-title">Overview</div>
              <div className="analytics-stat-grid">
                <StatCard
                  icon="💬"
                  label="Total Queries"
                  value={String(data.total_queries || 0)}
                />
                <StatCard
                  icon="🎯"
                  label="Avg Confidence"
                  value={`${((data.avg_confidence_score || 0) * 100).toFixed(1)}%`}
                  color={
                    (data.avg_confidence_score || 0) >= 0.75
                      ? "var(--success)"
                      : (data.avg_confidence_score || 0) >= 0.45
                      ? "var(--warning)"
                      : "var(--danger)"
                  }
                />
                <StatCard
                  icon="⚠"
                  label="Hallucination Risk"
                  value={`${data.hallucination_rate_pct || 0}%`}
                  sub="LOW-conf responses"
                  color={(data.hallucination_rate_pct || 0) > 30 ? "var(--danger)" : "var(--success)"}
                />
                <StatCard
                  icon="👍"
                  label="User Satisfaction"
                  value={fb?.satisfaction_rate_pct != null ? `${fb.satisfaction_rate_pct}%` : "—"}
                  sub={fb?.total_rated ? `${fb.total_rated} rated` : "No feedback yet"}
                  color={
                    fb?.satisfaction_rate_pct != null
                      ? fb.satisfaction_rate_pct >= 70
                        ? "var(--success)"
                        : "var(--warning)"
                      : undefined
                  }
                />
              </div>

              {/* ── Signal scores ──────────────────────────────── */}
              <div className="analytics-section-title">Confidence Signals</div>
              <div className="analytics-signals">
                {[
                  { label: "Retrieval Confidence", value: data.avg_retrieval_confidence || 0, icon: "🔍" },
                  { label: "Grounding Score", value: data.avg_grounding_score || 0, icon: "📄" },
                  ...(data.avg_self_consistency != null
                    ? [{ label: "Self-Consistency", value: data.avg_self_consistency, icon: "🔄" }]
                    : []),
                ].map((sig) => (
                  <div className="analytics-signal-row" key={sig.label}>
                    <span className="analytics-signal-icon">{sig.icon}</span>
                    <span className="analytics-signal-label">{sig.label}</span>
                    <div className="analytics-signal-bar-wrap">
                      <div
                        className="analytics-signal-bar-fill"
                        style={{
                          width: `${(sig.value * 100).toFixed(0)}%`,
                          background:
                            sig.value >= 0.75
                              ? "var(--success)"
                              : sig.value >= 0.45
                              ? "var(--warning)"
                              : "var(--danger)",
                        }}
                      />
                    </div>
                    <span className="analytics-signal-pct">
                      {(sig.value * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Distributions ─────────────────────────────── */}
              <div className="analytics-two-col">
                <div>
                  <div className="analytics-section-title">Confidence Levels</div>
                  {cd && (
                    <div className="analytics-dist-group">
                      <DistBar label="HIGH" count={cd.HIGH || 0} total={totalConf} color="var(--success)" />
                      <DistBar label="MEDIUM" count={cd.MEDIUM || 0} total={totalConf} color="var(--warning)" />
                      <DistBar label="LOW" count={cd.LOW || 0} total={totalConf} color="var(--danger)" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="analytics-section-title">Response Types</div>
                  {rd && (
                    <div className="analytics-dist-group">
                      <DistBar
                        label="Direct Answer"
                        count={rd.direct_answer || 0}
                        total={totalResp}
                        color="var(--success)"
                      />
                      <DistBar
                        label="Guided Hint"
                        count={rd.guided_hint || 0}
                        total={totalResp}
                        color="var(--warning)"
                      />
                      <DistBar
                        label="Clarification"
                        count={rd.clarification_request || 0}
                        total={totalResp}
                        color="var(--danger)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Confidence-Response Alignment ─────────────── */}
              {al && (
                <>
                  <div className="analytics-section-title">
                    Confidence–Response Alignment
                    <span className="analytics-section-hint">% of each level that got the correct response mode</span>
                  </div>
                  <div className="analytics-alignment">
                    {[
                      { label: "HIGH → Direct Answer", value: al.high_confidence_correct_pct, color: "var(--success)" },
                      { label: "MEDIUM → Guided Hint", value: al.medium_confidence_correct_pct, color: "var(--warning)" },
                      { label: "LOW → Clarification", value: al.low_confidence_correct_pct, color: "var(--danger)" },
                    ].map((row) => (
                      <div className="analytics-alignment-row" key={row.label}>
                        <span className="analytics-alignment-label">{row.label}</span>
                        <span
                          className="analytics-alignment-value"
                          style={{ color: row.value != null && row.value >= 80 ? "var(--success)" : "var(--warning)" }}
                        >
                          {row.value != null ? `${row.value}%` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── User Feedback breakdown ────────────────────── */}
              {fb && (fb.total_rated || 0) > 0 && (
                <>
                  <div className="analytics-section-title">User Feedback</div>
                  <div className="analytics-feedback-row">
                    <div className="analytics-feedback-cell">
                      <span style={{ fontSize: 20 }}>👍</span>
                      <span className="analytics-feedback-num" style={{ color: "var(--success)" }}>
                        {fb.thumbs_up || 0}
                      </span>
                      <span className="analytics-feedback-sub">Helpful</span>
                    </div>
                    <div className="analytics-feedback-cell">
                      <span style={{ fontSize: 20 }}>👎</span>
                      <span className="analytics-feedback-num" style={{ color: "var(--warning)" }}>
                        {fb.thumbs_down || 0}
                      </span>
                      <span className="analytics-feedback-sub">Not helpful</span>
                    </div>
                    {fb.false_positive_rate_pct != null && (
                      <div className="analytics-feedback-cell">
                        <span style={{ fontSize: 20 }}>⚡</span>
                        <span
                          className="analytics-feedback-num"
                          style={{
                            color: fb.false_positive_rate_pct > 20 ? "var(--danger)" : "var(--success)",
                          }}
                        >
                          {fb.false_positive_rate_pct}%
                        </span>
                        <span className="analytics-feedback-sub">False positive rate</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Recent queries table ──────────────────────── */}
              {data.recent_queries && data.recent_queries.length > 0 && (
                <>
                  <div className="analytics-section-title">Recent Queries</div>
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Query</th>
                          <th>Type</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_queries.map((q, i) => (
                          <tr key={i}>
                            <td className="analytics-td-time">{formatTime(q.timestamp)}</td>
                            <td className="analytics-td-query" title={q.query}>
                              {(q.query || "").length > 50 ? q.query.slice(0, 50) + "…" : q.query}
                            </td>
                            <td>
                              <span
                                className="analytics-type-chip"
                                style={{
                                  color:
                                    q.response_type === "direct_answer"
                                      ? "var(--success)"
                                      : q.response_type === "guided_hint"
                                      ? "var(--warning)"
                                      : "var(--danger)",
                                }}
                              >
                                {responseIcon(q.response_type)} {responseLabel(q.response_type)}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  color: confColor(q.confidence_level),
                                  fontWeight: 600,
                                  fontSize: 12,
                                }}
                              >
                                {q.confidence_level} ({((q.confidence_score || 0) * 100).toFixed(0)}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Footer note ────────────────────────────────── */}
              <div className="analytics-footer">
                Auto-refreshes every 30 s · Data stored in{" "}
                <code>backend/data/auralearn_logs.db</code> ·{" "}
                <a
                  href={`${API_URL}/api/analytics`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  Raw JSON ↗
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
