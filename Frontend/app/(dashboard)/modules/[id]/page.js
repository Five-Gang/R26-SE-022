'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { modulesApi, documentsApi } from '../../../../lib/summarizer-api';
import styles from './module-detail.module.css';

const BLOOM_COLORS = {
  Remember: '#6366f1', Understand: '#0ea5e9', Apply: '#0f766e',
  Analyze: '#f59e0b', Evaluate: '#ef4444', Create: '#a855f7',
};

const STATUS_CONFIG = {
  pending:    { label: 'Queued',     color: '#f59e0b', bg: '#fffbeb', icon: '⏳', pulse: true },
  processing: { label: 'Processing', color: '#0ea5e9', bg: '#f0f9ff', icon: '🔄', pulse: true },
  completed:  { label: 'Ready',      color: '#0f766e', bg: '#f0fdf4', icon: '✅', pulse: false },
  failed:     { label: 'Failed',     color: '#ef4444', bg: '#fff5f5', icon: '❌', pulse: false },
};

export default function ModuleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [mod, setMod] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  // Outline upload state
  const [outlineUploading, setOutlineUploading] = useState(false);
  const [outlineDragOver, setOutlineDragOver] = useState(false);
  const [outlineError, setOutlineError] = useState(null);
  const [outlineSuccess, setOutlineSuccess] = useState(null);
  const outlineInputRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([modulesApi.get(id), documentsApi.listByModule(id)])
      .then(([modData, docsData]) => { setMod(modData); setDocs(docsData); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Poll processing status for pending/processing docs
  useEffect(() => {
    const hasPending = docs.some(d => ['pending','processing'].includes(d.processing_status));
    if (!hasPending) return;
    const timer = setInterval(async () => {
      try {
        const updated = await documentsApi.listByModule(id);
        setDocs(updated);
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [docs, id]);

  const doUpload = useCallback(async (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.pptx', '.ppt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('Only PDF or PPTX files are allowed.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(file.name);
    try {
      await documentsApi.upload(id, file, 'lecture_slide');
      const updated = await documentsApi.listByModule(id);
      setDocs(updated);
      setUploadSuccess(`"${file.name}" uploaded! Processing started.`);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [id]);

  const doOutlineUpload = useCallback(async (file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.pdf','.docx','.doc','.txt'].includes(ext)) {
      setOutlineError('Upload a DOCX, PDF or TXT module outline file.');
      return;
    }
    setOutlineUploading(true);
    setOutlineError(null);
    setOutlineSuccess(null);
    try {
      await documentsApi.upload(id, file, 'module_outline');
      setOutlineSuccess('Outline uploaded! AI is extracting weeks and learning outcomes…');
      // Reload module data after a short wait
      setTimeout(async () => {
        try {
          const [modData, docsData] = await Promise.all([modulesApi.get(id), documentsApi.listByModule(id)]);
          setMod(modData);
          setDocs(docsData);
        } catch {}
      }, 3000);
    } catch (err) {
      setOutlineError(err.message);
    } finally {
      setOutlineUploading(false);
      if (outlineInputRef.current) outlineInputRef.current.value = '';
    }
  }, [id]);

  const handleOutlineInput = (e) => doOutlineUpload(e.target.files?.[0]);
  const handleOutlineDrop = (e) => { e.preventDefault(); setOutlineDragOver(false); doOutlineUpload(e.dataTransfer.files?.[0]); };

  const handleFileInput = (e) => doUpload(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    doUpload(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async (docId) => {
    if (!confirm('Delete this lecture?')) return;
    try {
      await documentsApi.delete(docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
  };

  if (loading) return (
    <div className={styles.stateCenter}>
      <div className={styles.spinner} />
      <p>Loading module…</p>
    </div>
  );

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>⚠️ {error}</div>
    </div>
  );

  if (!mod) return null;

  const los = mod.learning_outcomes || [];
  const weeks = mod.weeks || [];
  const completedDocs = docs.filter(d => d.processing_status === 'completed');
  const pendingDocs = docs.filter(d => ['pending','processing'].includes(d.processing_status));
  const failedDocs = docs.filter(d => d.processing_status === 'failed');

  return (
    <div className={styles.page}>
      <Link href="/modules" className={styles.back}>← All Modules</Link>

      {/* ── Module Header ── */}
      <div className={styles.moduleHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerBadges}>
            <span className={styles.codeBadge}>{mod.code}</span>
            {mod.department && <span className={styles.deptBadge}>{mod.department}</span>}
            {mod.year && <span className={styles.metaBadge}>Year {mod.year}</span>}
            {mod.semester && <span className={styles.metaBadge}>Sem {mod.semester}</span>}
          </div>
          <h1 className={styles.moduleName}>{mod.name}</h1>
          {mod.description && <p className={styles.moduleDesc}>{mod.description}</p>}
        </div>
      </div>

      {/* ── Module Outline Upload ── */}
      {!mod.outline_processed || los.length === 0 ? (
        <div className={styles.outlineSection}>
          <div className={styles.outlineHeader}>
            <div className={styles.outlineIcon}>📋</div>
            <div>
              <h2 className={styles.outlineTitle}>Set Up Module Outline</h2>
              <p className={styles.outlineDesc}>
                Upload your module outline document (DOCX or PDF) — AI will automatically extract
                weekly topics and learning outcomes with Bloom's taxonomy classification.
              </p>
            </div>
          </div>

          <div className={styles.outlineHowTo}>
            <div className={styles.howToStep}><span className={styles.howToNum}>1</span><span>Upload your module outline / course spec DOCX or PDF</span></div>
            <div className={styles.howToArrow}>→</div>
            <div className={styles.howToStep}><span className={styles.howToNum}>2</span><span>AI extracts weeks, topics &amp; learning outcomes</span></div>
            <div className={styles.howToArrow}>→</div>
            <div className={styles.howToStep}><span className={styles.howToNum}>3</span><span>Upload lecture slides → generate AI content</span></div>
          </div>

          <div
            className={`${styles.outlineDropZone} ${outlineDragOver ? styles.dropZoneActive : ''} ${outlineUploading ? styles.dropZoneUploading : ''}`}
            onDrop={handleOutlineDrop}
            onDragOver={(e) => { e.preventDefault(); setOutlineDragOver(true); }}
            onDragLeave={() => setOutlineDragOver(false)}
            onClick={() => !outlineUploading && outlineInputRef.current?.click()}
          >
            <input ref={outlineInputRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={handleOutlineInput} disabled={outlineUploading} />
            {outlineUploading ? (
              <div className={styles.uploadingState}>
                <div className={styles.uploadSpinner} />
                <span className={styles.uploadingLabel}>Processing outline…</span>
              </div>
            ) : (
              <div className={styles.dropZoneInner}>
                <div className={styles.dropIcon}>{outlineDragOver ? '📥' : '📄'}</div>
                <div className={styles.dropTitle}>Drop module outline file here</div>
                <div className={styles.dropSubtitle}>or click to browse · DOCX, PDF, TXT</div>
              </div>
            )}
          </div>
          {outlineError && <div className={styles.uploadFeedback} data-type="error">❌ {outlineError}</div>}
          {outlineSuccess && <div className={styles.uploadFeedback} data-type="success">✅ {outlineSuccess}</div>}
        </div>
      ) : (
        <div className={styles.outlineBanner}>
          <span className={styles.outlineBannerIcon}>✅</span>
          <div>
            <div className={styles.outlineBannerTitle}>Module outline loaded</div>
            <div className={styles.outlineBannerDesc}>{weeks.length} weeks · {los.length} learning outcomes</div>
          </div>
          <label className={styles.outlineReuploadBtn}>
            Re-upload outline
            <input type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={handleOutlineInput} />
          </label>
        </div>
      )}

      {/* ── Stats Strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{los.length}</span>
          <span className={styles.statLabel}>Learning Outcomes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{weeks.length}</span>
          <span className={styles.statLabel}>Weeks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{completedDocs.length}</span>
          <span className={styles.statLabel}>Lectures Ready</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{pendingDocs.length}</span>
          <span className={styles.statLabel}>Processing</span>
        </div>
      </div>

      {/* ── Upload Lecture Section ── */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadSectionHeader}>
          <div>
            <h2 className={styles.uploadSectionTitle}>📂 Lecture Materials</h2>
            <p className={styles.uploadSectionDesc}>
              Upload your lecture slides or PDFs — AI will extract, chunk and index them for generation
            </p>
          </div>
          {completedDocs.length > 0 && (
            <span className={styles.readyPill}>
              ✅ {completedDocs.length} lecture{completedDocs.length !== 1 ? 's' : ''} ready
            </span>
          )}
        </div>

        {/* Drag-and-drop zone */}
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''} ${uploading ? styles.dropZoneUploading : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.ppt"
            hidden
            onChange={handleFileInput}
            disabled={uploading}
          />
          {uploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.uploadSpinner} />
              <div className={styles.uploadingText}>
                <span className={styles.uploadingLabel}>Uploading…</span>
                <span className={styles.uploadingFile}>{uploadProgress}</span>
              </div>
            </div>
          ) : (
            <div className={styles.dropZoneInner}>
              <div className={styles.dropIcon}>
                {dragOver ? '📥' : '☁️'}
              </div>
              <div className={styles.dropTitle}>
                {dragOver ? 'Drop to upload' : 'Drag & drop your lecture file'}
              </div>
              <div className={styles.dropSubtitle}>or click to browse</div>
              <div className={styles.dropFormats}>PDF · PPTX · PPT &nbsp;·&nbsp; Max 50 MB</div>
            </div>
          )}
        </div>

        {/* Upload feedback */}
        {uploadError && (
          <div className={styles.uploadFeedback} data-type="error">
            ❌ {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className={styles.uploadFeedback} data-type="success">
            ✅ {uploadSuccess}
          </div>
        )}

        {/* Document list */}
        {docs.length > 0 && (
          <div className={styles.docList}>
            {docs.map((doc) => {
              const s = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.pending;
              return (
                <div key={doc.id} className={styles.docRow}>
                  <span className={styles.docIcon}>
                    {doc.mime_type?.includes('pdf') ? '📄' : '📽️'}
                  </span>
                  <div className={styles.docInfo}>
                    <div className={styles.docName}>{doc.original_filename}</div>
                    <div className={styles.docMeta}>
                      {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                      {' · '}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${s.pulse ? styles.statusPulse : ''}`}
                    style={{ color: s.color, background: s.bg }}
                  >
                    {s.icon} {s.label}
                  </span>
                  {doc.processing_status === 'failed' && (
                    <button
                      className={styles.btnRetry}
                      onClick={async () => {
                        await fetch(`http://localhost:8001/api/v1/documents/${doc.id}/reprocess`, { method: 'POST' });
                        const updated = await documentsApi.listByModule(id);
                        setDocs(updated);
                      }}
                      title="Retry processing"
                    >
                      🔄 Retry
                    </button>
                  )}
                  <button
                    className={styles.btnDelete}
                    onClick={() => handleDelete(doc.id)}
                    title="Delete"
                  >🗑</button>
                </div>
              );
            })}
          </div>
        )}

        {docs.length === 0 && !uploading && (
          <div className={styles.noDocsHint}>
            No lectures uploaded yet — upload one above to enable AI generation
          </div>
        )}
      </div>

      {/* ── Generate Study Material Section ── */}
      <div className={styles.generateSection}>
        <h2 className={styles.generateTitle}>⚡ Generate Study Material</h2>
        <p className={styles.generateSubtitle}>
          {completedDocs.length === 0
            ? 'Upload and process a lecture above first, then generate'
            : 'Click below to generate from your processed lectures'}
        </p>
        <div className={styles.generateCards}>
          {[
            { type: 'summary',    icon: '📝', label: 'AI Summary',  desc: 'LO-aligned notes with citations' },
            { type: 'flashcards', icon: '🃏', label: 'Flashcards',  desc: "Spaced-repetition cards by Bloom's level" },
            { type: 'quiz',       icon: '🧠', label: 'Quiz',        desc: 'MCQ & short-answer mapped to LOs' },
          ].map(({ type, icon, label, desc }) => (
            <button
              key={type}
              className={`${styles.genCard} ${completedDocs.length === 0 ? styles.genCardDisabled : ''}`}
              onClick={() => completedDocs.length > 0 && router.push(`/study/generate?module=${id}&type=${type}`)}
              title={completedDocs.length === 0 ? 'Upload a lecture first' : ''}
            >
              <span className={styles.genIcon}>{icon}</span>
              <span className={styles.genLabel}>{label}</span>
              <span className={styles.genDesc}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {['overview', 'learning-outcomes'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📋 Weekly Overview'}
            {tab === 'learning-outcomes' && '🎯 Learning Outcomes'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          {weeks.length === 0 ? (
            <div className={styles.empty}>No weekly outline added yet.</div>
          ) : (
            <div className={styles.weekTable}>
              <div className={styles.weekTableHead}>
                <span>Week</span><span>Topic</span><span>Subtopics</span>
              </div>
              {weeks.map((w) => (
                <div key={w.id} className={styles.weekRow}>
                  <span className={styles.weekNum}>W{w.week_number}</span>
                  <span className={styles.weekTopic}>{w.topic}</span>
                  <span className={styles.weekSubs}>{(w.subtopics || []).join(' · ') || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Learning Outcomes Tab ── */}
      {activeTab === 'learning-outcomes' && (
        <div className={styles.tabContent}>
          {los.length === 0 ? (
            <div className={styles.empty}>No learning outcomes found.</div>
          ) : (
            <div className={styles.loList}>
              {los.map((lo) => (
                <div key={lo.id} className={styles.loCard}>
                  <div className={styles.loHeader}>
                    <span className={styles.loCode}>{lo.lo_code}</span>
                    <span
                      className={styles.bloomBadge}
                      style={{
                        background: `${BLOOM_COLORS[lo.bloom_level]}20`,
                        color: BLOOM_COLORS[lo.bloom_level],
                        borderColor: `${BLOOM_COLORS[lo.bloom_level]}50`,
                      }}
                    >{lo.bloom_level}</span>
                    {lo.bloom_verb && <span className={styles.verbBadge}>{lo.bloom_verb}</span>}
                  </div>
                  <p className={styles.loText}>{lo.text}</p>
                  {lo.topic_keywords?.length > 0 && (
                    <div className={styles.keywords}>
                      {lo.topic_keywords.map((kw) => (
                        <span key={kw} className={styles.keyword}>{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
