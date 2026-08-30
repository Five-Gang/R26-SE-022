'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './tutor.module.css';

const TUTOR_API      = process.env.NEXT_PUBLIC_TUTOR_API_URL      || 'http://localhost:8002';
const SUMMARIZER_API = process.env.NEXT_PUBLIC_SUMMARIZER_API_URL  || 'http://localhost:8000';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchModuleDetails(moduleId) {
  try {
    const res = await fetch(`${SUMMARIZER_API}/api/v1/modules/${moduleId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchModuleSummaries(moduleId, limit = 5) {
  try {
    const res = await fetch(
      `${SUMMARIZER_API}/api/v1/summaries?module_id=${moduleId}&output_type=summary&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Build context string to inject into the tutor backend.
 * ONLY returns content when actual AI summaries exist — skeleton metadata
 * (LOs/weeks alone) is not enough to answer content questions and would
 * produce misleading HIGH confidence scores with empty answers.
 */
function buildModuleContext(moduleDetails, summaries) {
  if (!moduleDetails) return '';

  const validSummaries = summaries.filter(
    s => s.content_format === 'markdown' && s.content && s.content.length > 50
  );

  // Gate: only inject context when real lecture summaries are available.
  // Without them the LLM has no substance to answer from.
  if (validSummaries.length === 0) return '';

  const lines = [];
  lines.push('=== MODULE CONTEXT ===');
  lines.push(`Module: ${moduleDetails.name} (${moduleDetails.code})`);
  if (moduleDetails.description) lines.push(`Description: ${moduleDetails.description}`);
  if (moduleDetails.lecturer) lines.push(`Lecturer: ${moduleDetails.lecturer}`);

  const los = moduleDetails.learning_outcomes || [];
  if (los.length > 0) {
    lines.push('\nLEARNING OUTCOMES:');
    los.forEach(lo => {
      lines.push(`* [${lo.lo_code}] (${lo.bloom_level}) ${lo.text}`);
    });
  }

  const weeks = moduleDetails.weeks || [];
  if (weeks.length > 0) {
    lines.push('\nWEEKLY LECTURE TOPICS:');
    weeks.forEach(w => {
      const subs = (w.subtopics || []).join(', ');
      lines.push(`* Week ${w.week_number}: ${w.topic}${subs ? ' -- ' + subs : ''}`);
    });
  }

  lines.push('\nLECTURE SUMMARIES (from AI Summarizer):');
  validSummaries.forEach((s, i) => {
    const week = s.week_number ? ` (Week ${s.week_number})` : '';
    const snippet = s.content.length > 800 ? s.content.slice(0, 800) + '...' : s.content;
    lines.push(`\n--- Summary ${i + 1}${week} ---\n${snippet}`);
  });

  lines.push('\n=== END MODULE CONTEXT ===');
  return lines.join('\n');
}

// ─── Confidence Badge ──────────────────────────────────────────────────────
function ConfidenceBadge({ level, score }) {
  const cfg = {
    HIGH:   { label: 'Direct Answer',        cls: styles.confHigh   },
    MEDIUM: { label: 'Guided Hint',           cls: styles.confMedium },
    LOW:    { label: 'Clarification Needed',  cls: styles.confLow    },
  }[level?.toUpperCase()] || { label: 'Processing', cls: styles.confMedium };

  return (
    <div className={styles.confidenceRow}>
      <span className={`${styles.confBadge} ${cfg.cls}`}>{cfg.label}</span>
      {score != null && (
        <div className={styles.confBarWrap}>
          <div className={styles.confBar}>
            <div className={`${styles.confBarFill} ${cfg.cls}`} style={{ width: `${Math.round(score * 100)}%` }} />
          </div>
          <span className={styles.confScore}>{Math.round(score * 100)}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Source Card ────────────────────────────────────────────────────────────
function SourceCard({ src, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.sourceCard} onClick={() => setExpanded(v => !v)}>
      <div className={styles.sourceCardHeader}>
        <span className={styles.sourceNum}>[{index + 1}]</span>
        <span className={styles.sourceFile}>📄 {src.filename || 'Course Document'}</span>
        {src.similarity > 0 && (
          <span className={styles.sourceSim}>{Math.round(src.similarity * 100)}% match</span>
        )}
        <span className={styles.sourceToggle}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && src.content && (
        <div className={styles.sourcePreview}>{src.content}</div>
      )}
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────
function Message({ msg, onFeedback }) {
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  if (msg.role === 'user') {
    return (
      <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
        <div className={`${styles.avatar} ${styles.avatarUser}`}>YOU</div>
        <div className={`${styles.messageBubble} ${styles.bubbleUser}`}>{msg.content}</div>
      </div>
    );
  }

  return (
    <div className={styles.messageRow}>
      <div className={`${styles.avatar} ${styles.avatarAI}`}><span>✦</span></div>
      <div className={`${styles.messageBubble} ${styles.bubbleAI}`}>
        {msg.confidence_level && (
          <ConfidenceBadge level={msg.confidence_level} score={msg.confidence_score} />
        )}
        <div className={styles.aiText}>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
        {msg.sources?.length > 0 && (
          <div className={styles.sourcesSection}>
            <div className={styles.sourcesLabel}>📚 Source Materials</div>
            {msg.sources.map((src, i) => <SourceCard key={i} src={src} index={i} />)}
          </div>
        )}
        {msg.log_id && (
          <div className={styles.feedbackRow}>
            {feedbackGiven ? (
              <span className={styles.feedbackThanks}>
                {feedbackGiven === 'thumbs_up' ? '👍 Thanks!' : '👎 Noted!'}
              </span>
            ) : (
              <>
                <span className={styles.feedbackLabel}>Was this helpful?</span>
                <button className={styles.thumbBtn} onClick={() => { setFeedbackGiven('thumbs_up'); onFeedback?.(msg.log_id, 'thumbs_up'); }}>👍</button>
                <button className={styles.thumbBtn} onClick={() => { setFeedbackGiven('thumbs_down'); onFeedback?.(msg.log_id, 'thumbs_down'); }}>👎</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className={styles.messageRow}>
      <div className={`${styles.avatar} ${styles.avatarAI}`}><span>✦</span></div>
      <div className={`${styles.messageBubble} ${styles.bubbleAI} ${styles.typingBubble}`}>
        <span className={styles.typingDot} /><span className={styles.typingDot} /><span className={styles.typingDot} />
      </div>
    </div>
  );
}

// ─── Lecture Materials Panel ───────────────────────────────────────────────
function LectureMaterialsPanel({ moduleDetails, summaries, loading }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className={styles.lecturePanel}>
        <div className={styles.lecturePanelHeader}>
          <span>📖 Loading lecture materials…</span>
          <span className={styles.lectureLoadingDot} />
        </div>
      </div>
    );
  }

  if (!moduleDetails) return null;

  const los = moduleDetails.learning_outcomes || [];
  const weeks = moduleDetails.weeks || [];
  const validSummaries = summaries.filter(s => s.content_format === 'markdown' && s.content);

  return (
    <div className={styles.lecturePanel}>
      <button className={styles.lecturePanelHeader} onClick={() => setExpanded(v => !v)}>
        <span>📖 Lecture Materials Loaded</span>
        <div className={styles.lecturePanelMeta}>
          <span className={styles.lecturePill}>{weeks.length} weeks</span>
          <span className={styles.lecturePill}>{los.length} LOs</span>
          {validSummaries.length > 0 && (
            <span className={styles.lecturePillGreen}>{validSummaries.length} summaries</span>
          )}
          <span className={styles.lectureChevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className={styles.lecturePanelBody}>
          {weeks.length > 0 && (
            <div className={styles.lectureSection}>
              <div className={styles.lectureSectionTitle}>Weekly Topics</div>
              {weeks.map(w => (
                <div key={w.week_number} className={styles.lectureWeekRow}>
                  <span className={styles.lectureWeekNum}>W{w.week_number}</span>
                  <span className={styles.lectureWeekTopic}>{w.topic}</span>
                </div>
              ))}
            </div>
          )}
          {los.length > 0 && (
            <div className={styles.lectureSection}>
              <div className={styles.lectureSectionTitle}>Learning Outcomes</div>
              {los.slice(0, 6).map(lo => (
                <div key={lo.id || lo.lo_code} className={styles.lectureLoRow}>
                  <span className={styles.lectureLoCode}>{lo.lo_code}</span>
                  <span className={styles.lectureLoText}>{lo.text}</span>
                </div>
              ))}
              {los.length > 6 && (
                <div className={styles.lectureMoreLos}>+{los.length - 6} more learning outcomes</div>
              )}
            </div>
          )}
          {validSummaries.length > 0 && (
            <div className={styles.lectureSection}>
              <div className={styles.lectureSectionTitle}>AI Summaries Available</div>
              {validSummaries.map((s, i) => (
                <div key={s.id || i} className={styles.lectureSummaryRow}>
                  <span className={styles.lectureSummaryIcon}>✨</span>
                  <span className={styles.lectureSummaryLabel}>
                    {s.week_number ? `Week ${s.week_number} Summary` : `Summary ${i + 1}`}
                    <span className={styles.lectureSummaryDate}>
                      {s.created_at ? ` · ${new Date(s.created_at).toLocaleDateString()}` : ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {validSummaries.length === 0 && weeks.length === 0 && los.length === 0 && (
            <div className={styles.lectureEmpty}>
              No lecture materials yet. Upload slides in the Modules page to enable AI-grounded answers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TutorPage() {
  const [messages, setMessages] = useState([{
    role: 'ai',
    content: `# Welcome to your AI Tutor 🎓\n\nI'm a **confidence-aware, hallucination-controlled** AI tutor grounded in your course materials.\n\nMy 3 adaptive response strategies:\n- ✅ **High Confidence** → Direct Answer grounded in your course materials\n- 💡 **Medium Confidence** → Guided Hint to steer your thinking\n- 🔍 **Low Confidence** → Clarification request when topic isn't covered\n\n**To get started:** Select a module from the sidebar and ask me anything!`,
  }]);

  const [input, setInput]                           = useState('');
  const [loading, setLoading]                       = useState(false);
  const [modules, setModules]                       = useState([]);
  const [selectedModule, setSelectedModule]         = useState(null);
  const [moduleDetails, setModuleDetails]           = useState(null);
  const [moduleSummaries, setModuleSummaries]       = useState([]);
  const [loadingMaterials, setLoadingMaterials]     = useState(false);
  const [backendOnline, setBackendOnline]           = useState(null);
  const [analytics, setAnalytics]                   = useState(null);
  const [showAnalytics, setShowAnalytics]           = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    fetch(`${TUTOR_API}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));

    fetch(`${SUMMARIZER_API}/api/v1/modules`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const loadModuleMaterials = async (mod) => {
    setLoadingMaterials(true);
    setModuleDetails(null);
    setModuleSummaries([]);
    const [details, summaries] = await Promise.all([
      fetchModuleDetails(mod.id),
      fetchModuleSummaries(mod.id, 5),
    ]);
    setModuleDetails(details);
    setModuleSummaries(summaries);
    setLoadingMaterials(false);
    return { details, summaries };
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      // Only inject module context when real AI summaries exist.
      // Without them, keep confidence at 0% so tutor honestly asks for materials.
      const hasSummaryContent = moduleSummaries.some(
        s => s.content_format === 'markdown' && s.content && s.content.length > 50
      );
      const moduleContext = hasSummaryContent
        ? buildModuleContext(moduleDetails, moduleSummaries)
        : null;

      const res = await fetch(`${TUTOR_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversation_history: conversationHistory,
          top_k: 5,
          enable_self_consistency: false,
          // Only set when actual lecture summaries are available
          module_context: moduleContext || null,
          module_name: selectedModule?.name || null,
          module_code: selectedModule?.code || null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setConversationHistory(data.conversation_history || []);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.response || 'No response received.',
        confidence_level: data.confidence?.level,
        confidence_score: data.confidence?.score,
        response_type:    data.response_type,
        sources:          data.sources || [],
        log_id:           data.log_id,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `⚠️ Could not reach the AI Tutor backend (port 8002).\n\n**Error:** ${err.message}`,
        confidence_level: 'LOW',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (logId, feedback) => {
    try {
      await fetch(`${TUTOR_API}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, feedback }),
      });
    } catch { /* silently fail */ }
  };

  const handleSelectModule = async (mod) => {
    setSelectedModule(mod);
    setConversationHistory([]);
    setMessages(prev => [...prev, {
      role: 'ai',
      content: `📘 Now tutoring: **${mod.name} (${mod.code})**\n\nFetching lecture materials from the summarizer…`,
      confidence_level: 'HIGH',
    }]);

    const { details, summaries } = await loadModuleMaterials(mod);
    const los = details?.learning_outcomes || [];
    const weeks = details?.weeks || [];
    const validSummaries = summaries.filter(s => s.content_format === 'markdown' && s.content);

    const materialsSummary = [
      weeks.length > 0 ? `📅 **${weeks.length} lecture weeks** loaded` : null,
      los.length > 0 ? `🎯 **${los.length} learning outcomes** mapped` : null,
      validSummaries.length > 0
        ? `✨ **${validSummaries.length} AI summaries** available as context`
        : `💡 No summaries yet — generate them in the **Modules** page for richer answers`,
    ].filter(Boolean).join('\n');

    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: 'ai',
        content: `📘 Now tutoring: **${mod.name} (${mod.code})**\n\n${materialsSummary}\n\nAsk me anything about this module!`,
        confidence_level: 'HIGH',
      };
      return updated;
    });
  };

  const startNewChat = () => {
    setMessages([{
      role: 'ai',
      content: '# New Conversation 🎓\n\nSelect a module and ask me anything!',
    }]);
    setConversationHistory([]);
    setSelectedModule(null);
    setModuleDetails(null);
    setModuleSummaries([]);
  };

  const loadAnalytics = async () => {
    if (!showAnalytics) {
      try {
        const res = await fetch(`${TUTOR_API}/api/analytics`);
        if (res.ok) setAnalytics(await res.json());
      } catch { /* silently fail */ }
    }
    setShowAnalytics(v => !v);
  };

  return (
    <div className={styles.container}>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <span className={styles.sidebarLogoIcon}>✦</span>
            <span>AI Tutor</span>
          </div>
          <button className={styles.newChatBtn} onClick={startNewChat}>+ New Chat</button>
        </div>

        <div className={styles.statusRow}>
          <span className={backendOnline === true ? styles.dotGreen : backendOnline === false ? styles.dotRed : styles.dotGray} />
          <span className={styles.statusLabel}>
            {backendOnline === true ? 'Tutor backend online' : backendOnline === false ? 'Backend offline' : 'Checking…'}
          </span>
        </div>

        {modules.length > 0 && (
          <div className={styles.sideSection}>
            <div className={styles.sideSectionTitle}>📚 Your Modules</div>
            <div className={styles.moduleList}>
              {modules.map(mod => (
                <button
                  key={mod.code}
                  className={`${styles.moduleBtn} ${selectedModule?.code === mod.code ? styles.moduleBtnActive : ''}`}
                  onClick={() => handleSelectModule(mod)}
                >
                  <span className={styles.moduleCode}>{mod.code}</span>
                  <span className={styles.moduleName}>{mod.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {modules.length === 0 && (
          <div className={styles.sideSection}>
            <div className={styles.sideSectionTitle}>📚 Your Modules</div>
            <div className={styles.noModulesHint}>
              No modules found. Create one in the{' '}
              <a href="/modules" className={styles.moduleLink}>Modules</a> page.
            </div>
          </div>
        )}

        <button className={styles.analyticsBtn} onClick={loadAnalytics}>
          📊 {showAnalytics ? 'Hide' : 'View'} Analytics
        </button>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────── */}
      <main className={styles.mainArea}>

        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <span className={styles.chatHeaderIcon}>🎓</span>
            <div>
              <div className={styles.chatHeaderTitle}>
                {selectedModule ? `${selectedModule.name} (${selectedModule.code})` : 'AI Tutor'}
              </div>
              <div className={styles.chatHeaderSub}>
                Hallucination-Controlled · Confidence-Aware · RAG-Grounded
              </div>
            </div>
          </div>
          <div className={styles.strategyPills}>
            <span className={styles.strategyPill} data-type="high">✅ High → Direct</span>
            <span className={styles.strategyPill} data-type="medium">💡 Medium → Hint</span>
            <span className={styles.strategyPill} data-type="low">🔍 Low → Clarify</span>
          </div>
        </div>

        {showAnalytics && analytics && (
          <div className={styles.analyticsPanel}>
            <div className={styles.analyticsPanelTitle}>📊 Research Analytics</div>
            <div className={styles.analyticsGrid}>
              {[
                { val: analytics.total_queries ?? 0,       lbl: 'Total Queries' },
                { val: analytics.avg_confidence_score != null ? `${Math.round(analytics.avg_confidence_score * 100)}%` : '—', lbl: 'Avg Confidence', color: '#10b981' },
                { val: analytics.hallucination_rate_pct != null ? `${analytics.hallucination_rate_pct.toFixed(1)}%` : '—',  lbl: 'Hallucination Rate', color: '#ef4444' },
                { val: analytics.avg_grounding_score != null ? `${Math.round(analytics.avg_grounding_score * 100)}%` : '—',  lbl: 'Grounding Score' },
              ].map(({ val, lbl, color }) => (
                <div key={lbl} className={styles.analyticsCard}>
                  <div className={styles.analyticsVal} style={color ? { color } : {}}>{val}</div>
                  <div className={styles.analyticsLbl}>{lbl}</div>
                </div>
              ))}
            </div>
            {analytics.response_type_distribution && (
              <div className={styles.distRow}>
                {Object.entries(analytics.response_type_distribution).map(([k, v]) => (
                  <span key={k} className={styles.distPill}>{k.replace(/_/g, ' ')}: <b>{v}</b></span>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedModule && (
          <LectureMaterialsPanel
            moduleDetails={moduleDetails}
            summaries={moduleSummaries}
            loading={loadingMaterials}
          />
        )}

        <div className={styles.chatArea}>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} onFeedback={submitFeedback} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <textarea
              className={styles.inputField}
              placeholder={selectedModule
                ? `Ask anything about ${selectedModule.name}… (Enter to send)`
                : 'Select a module first, then ask a question…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={1}
              disabled={loading}
            />
            <button className={styles.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className={styles.inputHint}>
            {selectedModule && moduleDetails
              ? `Context: ${moduleDetails.learning_outcomes?.length || 0} LOs · ${moduleDetails.weeks?.length || 0} weeks · ${moduleSummaries.filter(s => s.content_format === 'markdown').length} summaries loaded`
              : "Grounded in your module's lecture materials · Confidence-scored responses"}
          </div>
        </div>
      </main>
    </div>
  );
}
