'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './tutor.module.css';

const TUTOR_API = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'http://localhost:8002';

function ConfidenceBadge({ level }) {
  const map = {
    HIGH: { label: 'High Confidence', cls: styles.confHigh },
    MEDIUM: { label: 'Medium Confidence', cls: styles.confMedium },
    LOW: { label: 'Low Confidence', cls: styles.confLow },
  };
  const item = map[level?.toUpperCase()] || map.MEDIUM;
  return <span className={`${styles.confBadge} ${item.cls}`}>{item.label}</span>;
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
        <div className={`${styles.avatar} ${styles.avatarUser}`}>ME</div>
        <div className={`${styles.messageBubble} ${styles.bubbleUser}`}>{msg.content}</div>
      </div>
    );
  }
  return (
    <div className={styles.messageRow}>
      <div className={`${styles.avatar} ${styles.avatarAI}`}>AI</div>
      <div className={`${styles.messageBubble} ${styles.bubbleAI}`}>
        {msg.confidence_level && <ConfidenceBadge level={msg.confidence_level} />}
        <div className={styles.aiText}>{msg.content}</div>
        {msg.sources && msg.sources.length > 0 && (
          <div className={styles.sourcesSection}>
            <div className={styles.sourcesLabel}>📚 Sources</div>
            {msg.sources.map((src, i) => (
              <div key={i} className={styles.sourceItem}>
                <span className={styles.sourceFile}>{src.filename || 'Document'}</span>
                {src.chunk_preview && (
                  <span className={styles.sourcePreview}> — {src.chunk_preview.slice(0, 120)}...</span>
                )}
              </div>
            ))}
          </div>
        )}
        {msg.feedback_requested && (
          <div className={styles.feedbackRow}>
            <span className={styles.feedbackLabel}>Was this helpful?</span>
            <button
              className={styles.thumbBtn}
              onClick={() => msg.onFeedback && msg.onFeedback(msg.log_id, 'thumbs_up')}
            >👍</button>
            <button
              className={styles.thumbBtn}
              onClick={() => msg.onFeedback && msg.onFeedback(msg.log_id, 'thumbs_down')}
            >👎</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorPage() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Hello! I\'m your AI Tutor powered by hallucination-controlled RAG. Upload your study materials and ask me anything. I\'ll tell you how confident I am in each answer.',
      confidence_level: 'HIGH',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);
  const [sessions, setSessions] = useState([
    { id: 1, title: 'Current Session', time: 'Now', active: true },
  ]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    checkHealth();
    fetchMaterials();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${TUTOR_API}/health`, { signal: AbortSignal.timeout(3000) });
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${TUTOR_API}/api/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch {
      // backend may not be running
    }
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await fetch(`${TUTOR_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 5, use_self_consistency: false }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: data.answer || data.response || 'No response received.',
          confidence_level: data.confidence_level,
          sources: data.sources || [],
          log_id: data.log_id,
          feedback_requested: !!data.log_id,
          onFeedback: submitFeedback,
        },
      ]);

      // Update session title from first real question
      setSessions(prev =>
        prev.map(s =>
          s.active && s.title === 'Current Session'
            ? { ...s, title: query.length > 40 ? query.slice(0, 40) + '…' : query }
            : s
        )
      );
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `⚠️ Could not reach the AI Tutor backend. Make sure it's running on port 8002.\n\nError: ${err.message}`,
          confidence_level: 'LOW',
        },
      ]);
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
    } catch {
      // silently fail
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${TUTOR_API}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `✅ **${file.name}** uploaded and ingested successfully! ${data.chunks_added || ''} chunks added to the knowledge base. You can now ask questions about this material.`,
          confidence_level: 'HIGH',
        },
      ]);
      await fetchMaterials();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `❌ Failed to upload ${file.name}. Error: ${err.message}`,
          confidence_level: 'LOW',
        },
      ]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    const newId = Date.now();
    setSessions(prev => [
      { id: newId, title: 'New Session', time: 'Now', active: true },
      ...prev.map(s => ({ ...s, active: false })),
    ]);
    setMessages([
      {
        role: 'ai',
        content: 'Starting a new conversation. What would you like to learn today?',
        confidence_level: 'HIGH',
      },
    ]);
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <button className={styles.newChatBtn} onClick={startNewChat}>+ New conversation</button>

        {/* Backend status */}
        <div className={styles.statusRow}>
          <span className={backendOnline === true ? styles.dotGreen : backendOnline === false ? styles.dotRed : styles.dotGray} />
          <span className={styles.statusLabel}>
            {backendOnline === true ? 'Backend online' : backendOnline === false ? 'Backend offline' : 'Checking…'}
          </span>
        </div>

        {/* Materials */}
        {materials.length > 0 && (
          <div className={styles.materialsSection}>
            <div className={styles.historyHeader}>Knowledge Base</div>
            {materials.map((m, i) => (
              <div key={i} className={styles.materialItem}>
                <span className={styles.materialIcon}>📄</span>
                <span className={styles.materialName}>{m.filename || m}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.historyHeader}>Recent</div>
        <div className={styles.historyList}>
          {sessions.map(s => (
            <div
              key={s.id}
              className={`${styles.historyItem} ${s.active ? styles.active : ''}`}
              onClick={() => setSessions(prev => prev.map(x => ({ ...x, active: x.id === s.id })))}
            >
              <div className={styles.historyTitle}>{s.title}</div>
              <div className={styles.historyTime}>{s.time}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={styles.mainArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderTitle}>
            <span className={styles.chatHeaderIcon}>🎓</span>
            AI Tutor
            <span className={styles.chatHeaderSub}>Hallucination-Controlled RAG</span>
          </div>
          <div className={styles.chatHeaderActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '⏳ Uploading…' : '📎 Upload PDF'}
            </button>
          </div>
        </div>

        <div className={styles.chatArea}>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {loading && (
            <div className={styles.messageRow}>
              <div className={`${styles.avatar} ${styles.avatarAI}`}>AI</div>
              <div className={`${styles.messageBubble} ${styles.bubbleAI} ${styles.typingBubble}`}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <textarea
              className={styles.inputField}
              placeholder="Ask a question about your study materials… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className={styles.inputHint}>
            Responses are grounded in your uploaded PDFs with hallucination detection.
          </div>
        </div>
      </main>
    </div>
  );
}
