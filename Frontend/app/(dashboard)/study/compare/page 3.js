'use client';

import React, { useState, useEffect } from 'react';
import { modulesApi, compareApi } from '../../../../lib/summarizer-api';
import styles from './compare.module.css';

export default function ComparePage() {
  const [modules, setModules] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    modulesApi.list().then((mods) => {
      setModules(mods);
      if (mods.length > 0) setSelectedModule(mods[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedModule) return;
    const mod = modules.find(m => m.id === selectedModule);
    setWeeks(mod?.weeks || []);
    setSelectedWeek('');
  }, [selectedModule, modules]);

  const run = async () => {
    if (!selectedModule || !query.trim()) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const payload = { module_id: selectedModule, query: query.trim() };
      if (selectedWeek) payload.week_number = parseInt(selectedWeek, 10);
      const res = await compareApi.run(payload);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text = '') =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className={styles.mdH2}>{line.slice(3)}</h3>;
      if (line.startsWith('# '))  return <h2 key={i} className={styles.mdH1}>{line.slice(2)}</h2>;
      if (line.startsWith('- ') || line.startsWith('* '))
        return <li key={i} className={styles.mdLi}>{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i}/>;
      return <p key={i} className={styles.mdP}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') }}
      />;
    });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>⚖️ Compare: Generic AI vs LOA-ESS</h1>
          <p className={styles.subtitle}>
            See how our curriculum-aware system outperforms a generic LLM on the same question.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className={styles.formCard}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Module</label>
            <select className={styles.formSelect} value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Week (optional)</label>
            <select className={styles.formSelect} value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
              <option value="">All weeks</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.week_number}>Week {w.week_number} — {w.topic}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Query / Topic</label>
          <textarea
            className={styles.queryInput}
            placeholder="e.g. Explain integration by parts and when to apply it…"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {error && <div className={styles.errorBox}>⚠️ {error}</div>}
        <button
          className={`${styles.btnRun} ${loading ? styles.running : ''}`}
          onClick={run}
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <><div className={styles.btnSpinner}/> Running comparison…</>
          ) : '▶ Run Comparison'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary banner */}
          <div className={styles.banner}>
            <div className={styles.bannerStat}>
              <span className={styles.bannerLabel}>LOA-ESS covered</span>
              <span className={styles.bannerVal} style={{ color: '#0f766e' }}>
                {result.loa_ess.lo_coverage}/{result.loa_ess.total_los} LOs
              </span>
            </div>
            <div className={styles.bannerDivider}>vs</div>
            <div className={styles.bannerStat}>
              <span className={styles.bannerLabel}>Generic AI covered</span>
              <span className={styles.bannerVal} style={{ color: '#dc2626' }}>
                {result.generic_ai.lo_coverage}/{result.generic_ai.total_los} LOs
              </span>
            </div>
            <div className={styles.bannerTime}>
              Total: {result.generation_time_ms}ms
            </div>
          </div>

          {/* Side by side */}
          <div className={styles.splitView}>
            {/* Generic AI */}
            <div className={styles.pane}>
              <div className={styles.paneHeader}>
                <div className={styles.paneTitle}>🤖 Generic AI</div>
                <div className={styles.paneSubtitle}>{result.generic_ai.model}</div>
                <div className={styles.paneMeta}>
                  <span>LOs: {result.generic_ai.lo_coverage}/{result.generic_ai.total_los}</span>
                  <span>Citations: {result.generic_ai.citations}</span>
                  <span>{result.generic_ai.tokens} tokens</span>
                  <span>{result.generic_ai.generation_time_ms}ms</span>
                </div>
              </div>
              <div className={styles.paneContent}>
                {renderMarkdown(result.generic_ai.content)}
              </div>
            </div>

            {/* LOA-ESS */}
            <div className={`${styles.pane} ${styles.paneHighlight}`}>
              <div className={styles.paneHeader}>
                <div className={styles.paneTitle}>🎯 LOA-ESS (Our System)</div>
                <div className={styles.paneSubtitle}>{result.loa_ess.model}</div>
                <div className={styles.paneMeta}>
                  <span>LOs: {result.loa_ess.lo_coverage}/{result.loa_ess.total_los}</span>
                  <span>Citations: {result.loa_ess.citations}</span>
                  <span>Chunks: {result.loa_ess.chunks_used}</span>
                  <span>{result.loa_ess.tokens} tokens</span>
                  <span>{result.loa_ess.generation_time_ms}ms</span>
                </div>
              </div>
              <div className={styles.paneContent}>
                {renderMarkdown(result.loa_ess.content)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
