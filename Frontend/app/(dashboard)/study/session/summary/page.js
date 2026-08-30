'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { summariesApi } from '../../../../../lib/summarizer-api';
import styles from './summary.module.css';

const BLOOM_COLORS = {
  Remember: '#6366f1', Understand: '#0ea5e9', Apply: '#0f766e',
  Analyze: '#f59e0b', Evaluate: '#ef4444', Create: '#a855f7',
};

export default function SummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryId, setSummaryId] = useState(null);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    const id = searchParams.get('summary') || searchParams.get('id');
    if (!id) {
      setLoading(false);
      return;
    }
    setSummaryId(id);

    const fetchSummary = async () => {
      try {
        const data = await summariesApi.get(id);
        setSummary(data);
        // Simulate streaming render of summary text
        const text = data.summary_text || data.content || '';
        if (text) {
          setStreaming(true);
          let i = 0;
          const step = () => {
            i += 12;
            setDisplayedContent(text.slice(0, i));
            if (i < text.length) {
              requestAnimationFrame(step);
            } else {
              setDisplayedContent(text);
              setStreaming(false);
            }
          };
          requestAnimationFrame(step);
        }
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [searchParams]);

  const submitRating = async (stars) => {
    setRating(stars);
    try {
      await summariesApi.rate(summaryId, stars);
      setRated(true);
    } catch { }
  };

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingInner}>
        <div className={styles.loadingDots}>
          <span /><span /><span />
        </div>
        <p className={styles.loadingText}>Loading your AI summary…</p>
      </div>
    </div>
  );

  if (!summary) return (
    <div className={styles.loadingScreen}>
      <p style={{ color: '#666' }}>Summary not found.</p>
    </div>
  );

  const los = summary.learning_outcomes_covered || [];
  const citations = summary.citations || [];
  const meta = summary.metadata || {};

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← Back
        </button>
        <div className={styles.topBarCenter}>
          <span className={styles.topBadge}>📝 AI Summary</span>
          <span className={styles.topModel}>
            {meta.model ? `gemini-3.6-flash` : 'Gemini'} · {meta.generation_time_ms ? `${(meta.generation_time_ms / 1000).toFixed(1)}s` : ''}
          </span>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnOutline}>Save Notes</button>
          <button className={styles.btnPrimary} onClick={() => router.push('/study/quiz')}>Start Quiz →</button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Main chat-style column */}
        <div className={styles.mainCol} ref={contentRef}>

          {/* AI message bubble */}
          <div className={styles.aiBubble}>
            <div className={styles.aiAvatar}>
              <span>✦</span>
            </div>
            <div className={styles.aiContent}>
              <div className={styles.aiLabel}>LOA-ESS AI</div>
              <div className={styles.markdownBody}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
                    h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
                    h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
                    h4: ({ children }) => <h4 className={styles.mdH4}>{children}</h4>,
                    p: ({ children }) => <p className={styles.mdP}>{children}</p>,
                    ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
                    ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
                    li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
                    strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
                    em: ({ children }) => <em className={styles.mdEm}>{children}</em>,
                    blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
                    code: ({ inline, children }) =>
                      inline
                        ? <code className={styles.mdInlineCode}>{children}</code>
                        : <pre className={styles.mdPre}><code>{children}</code></pre>,
                    hr: () => <hr className={styles.mdHr} />,
                    table: ({ children }) => <div className={styles.mdTableWrap}><table className={styles.mdTable}>{children}</table></div>,
                    th: ({ children }) => <th className={styles.mdTh}>{children}</th>,
                    td: ({ children }) => <td className={styles.mdTd}>{children}</td>,
                  }}
                >
                  {displayedContent}
                </ReactMarkdown>
                {streaming && <span className={styles.cursor}>▌</span>}
              </div>
            </div>
          </div>

          {/* Citations */}
          {!streaming && citations.length > 0 && (
            <div className={styles.citationsSection}>
              <div className={styles.citHeader}>📎 Sources from your lecture</div>
              <div className={styles.citGrid}>
                {citations.map((c, i) => (
                  <div key={i} className={styles.citCard}>
                    <div className={styles.citNum}>[{i + 1}]</div>
                    <div className={styles.citBody}>
                      <div className={styles.citText}>{c.text}</div>
                      <div className={styles.citSource}>{c.source}{c.location ? ` · ${c.location}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          {!streaming && (
            <div className={styles.ratingRow}>
              <span className={styles.ratingLabel}>Was this helpful?</span>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className={`${styles.star} ${s <= rating ? styles.starFilled : ''}`}
                    onClick={() => submitRating(s)}
                    disabled={rated}
                  >★</button>
                ))}
              </div>
              {rated && <span className={styles.ratedMsg}>Thanks! 🙌</span>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sideCol}>
          {/* LO Coverage */}
          {los.length > 0 && (
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>🎯 Learning Outcome Coverage</div>
              <div className={styles.loList}>
                {los.map((lo) => (
                  <div key={lo.lo_code} className={styles.loItem}>
                    <div className={styles.loHeader}>
                      <span className={styles.loCode}>{lo.lo_code}</span>
                      <span
                        className={styles.bloomTag}
                        style={{
                          background: `${BLOOM_COLORS[lo.bloom_level]}18`,
                          color: BLOOM_COLORS[lo.bloom_level],
                          borderColor: `${BLOOM_COLORS[lo.bloom_level]}40`,
                        }}
                      >
                        {lo.bloom_level}
                      </span>
                      <span className={styles.loPercent}>
                        {Math.round((lo.coverage_score || 0) * 100)}%
                      </span>
                    </div>
                    <div className={styles.loBarTrack}>
                      <div
                        className={styles.loBarFill}
                        style={{
                          width: `${Math.round((lo.coverage_score || 0) * 100)}%`,
                          background: BLOOM_COLORS[lo.bloom_level] || '#0f766e',
                        }}
                      />
                    </div>
                    {lo.lo_text && <p className={styles.loText}>{lo.lo_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>⚡ Quick Actions</div>
            <div className={styles.quickActions}>
              <button
                className={styles.qaBtn}
                onClick={() => router.push(`/study/generate?module=${summary.module_id}&type=flashcards`)}
              >
                🃏 Generate Flashcards
              </button>
              <button
                className={styles.qaBtn}
                onClick={() => router.push(`/study/generate?module=${summary.module_id}&type=quiz`)}
              >
                🧠 Generate Quiz
              </button>
              <button
                className={styles.qaBtn}
                onClick={() => router.push(`/study/generate?module=${summary.module_id}`)}
              >
                🔄 New Summary
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>📊 Stats</div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statVal}>{meta.chunks_used || 0}</div>
                <div className={styles.statLbl}>Chunks used</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>{meta.output_tokens || 0}</div>
                <div className={styles.statLbl}>Tokens</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>{meta.generation_time_ms ? `${(meta.generation_time_ms / 1000).toFixed(1)}s` : '—'}</div>
                <div className={styles.statLbl}>Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
