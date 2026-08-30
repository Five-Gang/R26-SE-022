'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { modulesApi, documentsApi } from '../../../lib/summarizer-api';
import styles from './modules.module.css';

const BLOOM_COLORS = {
  Remember: '#6366f1', Understand: '#0ea5e9', Apply: '#0f766e',
  Analyze: '#f59e0b', Evaluate: '#ef4444', Create: '#a855f7',
};

const CURRENT_YEAR = new Date().getFullYear();

// ── Create Module Modal ──────────────────────────────────────────────
function CreateModuleModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1 = Module info, 2 = Upload outline
  const [form, setForm] = useState({
    code: '', name: '', description: '', year: CURRENT_YEAR,
    semester: 1, credits: 4, department: '', lecturer: '',
  });
  const [createdMod, setCreatedMod] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [outlineFile, setOutlineFile] = useState(null);
  const [uploadingOutline, setUploadingOutline] = useState(false);
  const [outlineDone, setOutlineDone] = useState(false);
  const [outlineError, setOutlineError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const mod = await modulesApi.create({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        year: Number(form.year),
        semester: Number(form.semester),
        credits: Number(form.credits),
        department: form.department.trim() || undefined,
        lecturer: form.lecturer.trim() || undefined,
      });
      setCreatedMod(mod);
      setStep(2);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const doOutlineUpload = useCallback(async (file) => {
    if (!file || !createdMod) return;
    setOutlineFile(file);
    setUploadingOutline(true);
    setOutlineError(null);
    try {
      await documentsApi.upload(createdMod.id, file, 'module_outline');
      setOutlineDone(true);
    } catch (err) {
      setOutlineError(err.message);
    } finally {
      setUploadingOutline(false);
    }
  }, [createdMod]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    doOutlineUpload(e.dataTransfer.files?.[0]);
  };

  const handleFinish = () => {
    onCreated(createdMod);
    onClose();
  };

  const handleSkip = () => {
    onCreated(createdMod);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalSteps}>
            <div className={`${styles.modalStep} ${step >= 1 ? styles.modalStepActive : ''}`}>
              <span className={styles.modalStepNum}>1</span>
              <span>Module Details</span>
            </div>
            <div className={styles.modalStepLine} />
            <div className={`${styles.modalStep} ${step >= 2 ? styles.modalStepActive : ''}`}>
              <span className={styles.modalStepNum}>2</span>
              <span>Upload Outline</span>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* ── Step 1: Module Info ── */}
        {step === 1 && (
          <form onSubmit={handleCreateModule} className={styles.modalBody}>
            <h2 className={styles.modalTitle}>Create New Module</h2>
            <p className={styles.modalDesc}>Enter the basic module information to get started.</p>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Module Code <span className={styles.req}>*</span></label>
                <input className={styles.formInput} placeholder="e.g. SE4040"
                  value={form.code} onChange={e => set('code', e.target.value)} required maxLength={20} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Credits</label>
                <input className={styles.formInput} type="number" min={1} max={8}
                  value={form.credits} onChange={e => set('credits', e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.spanFull}`}>
                <label className={styles.formLabel}>Module Name <span className={styles.req}>*</span></label>
                <input className={styles.formInput} placeholder="e.g. Secure Software Development"
                  value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Year <span className={styles.req}>*</span></label>
                <input className={styles.formInput} type="number" min={2020} max={2035}
                  value={form.year} onChange={e => set('year', e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Semester <span className={styles.req}>*</span></label>
                <select className={styles.formInput} value={form.semester} onChange={e => set('semester', e.target.value)}>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Department</label>
                <input className={styles.formInput} placeholder="e.g. Software Engineering"
                  value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lecturer</label>
                <input className={styles.formInput} placeholder="e.g. Dr. Smith"
                  value={form.lecturer} onChange={e => set('lecturer', e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.spanFull}`}>
                <label className={styles.formLabel}>Description</label>
                <textarea className={`${styles.formInput} ${styles.formTextarea}`} rows={2}
                  placeholder="Brief module description (optional)"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
            </div>

            {createError && <div className={styles.formError}>❌ {createError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
              <button type="submit" className={styles.btnPrimary} disabled={creating}>
                {creating ? 'Creating…' : 'Next: Upload Outline →'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Upload Outline ── */}
        {step === 2 && (
          <div className={styles.modalBody}>
            <h2 className={styles.modalTitle}>Upload Module Outline</h2>
            <p className={styles.modalDesc}>
              Upload your module outline (DOCX / PDF / TXT). The AI will extract all weekly topics
              and learning outcomes automatically — this powers the entire AI generation system.
            </p>

            <div className={styles.moduleCreatedBadge}>
              ✅ <strong>{createdMod?.code}</strong> — {createdMod?.name}
            </div>

            {!outlineDone ? (
              <>
                <div
                  className={`${styles.outlineDropBig} ${dragOver ? styles.dropActive : ''} ${uploadingOutline ? styles.dropUploading : ''}`}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => !uploadingOutline && fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden
                    onChange={e => doOutlineUpload(e.target.files?.[0])} disabled={uploadingOutline} />
                  {uploadingOutline ? (
                    <div className={styles.uploadingState}>
                      <div className={styles.uploadSpinner} />
                      <div>
                        <div className={styles.uploadingLabel}>Uploading outline…</div>
                        <div className={styles.uploadingFile}>{outlineFile?.name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.dropInner}>
                      <div className={styles.dropBigIcon}>{dragOver ? '📥' : '📄'}</div>
                      <div className={styles.dropBigTitle}>Drop your module outline here</div>
                      <div className={styles.dropBigSub}>or click to browse · DOCX, PDF, TXT supported</div>
                      <div className={styles.dropBigFormats}>
                        The outline should contain weekly topics &amp; learning outcomes
                      </div>
                    </div>
                  )}
                </div>
                {outlineError && <div className={styles.formError}>❌ {outlineError}</div>}
                <div className={styles.modalActions}>
                  <button className={styles.btnSkip} onClick={handleSkip}>
                    Skip for now (add later)
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.outlineSuccessBox}>
                <div className={styles.successIcon}>✅</div>
                <div>
                  <div className={styles.successTitle}>Outline uploaded successfully!</div>
                  <div className={styles.successFile}>{outlineFile?.name}</div>
                  <div className={styles.successNote}>
                    AI is extracting weeks and learning outcomes in the background — this takes about 30 seconds.
                  </div>
                </div>
              </div>
            )}

            {outlineDone && (
              <div className={styles.modalActions}>
                <button className={styles.btnPrimary} onClick={handleFinish}>
                  Go to Module →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modules Page ────────────────────────────────────────────────
export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // module object to delete
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = () => modulesApi.list()
    .then(setModules)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = modules.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleModuleCreated = (mod) => {
    // Refresh list and navigate to the new module
    load();
    window.location.href = `/modules/${mod.id}`;
  };

  const handleDeleteModule = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await modulesApi.delete(confirmDelete.id);
      setModules(prev => prev.filter(m => m.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      {showCreate && (
        <CreateModuleModal
          onClose={() => setShowCreate(false)}
          onCreated={handleModuleCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => { setConfirmDelete(null); setDeleteError(null); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗑️</div>
                <h2 className={styles.modalTitle} style={{ margin: 0 }}>Delete Module?</h2>
              </div>
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.5rem' }}>
                This will permanently delete
              </p>
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                {confirmDelete.name}
              </p>
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                {confirmDelete.code} · All uploaded documents, summaries, and learning outcomes will be lost.
              </p>
              {deleteError && (
                <div className={styles.formError} style={{ marginBottom: '1rem' }}>❌ {deleteError}</div>
              )}
              <div className={styles.modalActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={handleDeleteModule}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>My Modules</h1>
          <p className={styles.subtitle}>
            Click a module to upload lecture slides and generate AI summaries, flashcards and quizzes.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input type="text" placeholder="Search modules…" className={styles.searchInput}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className={styles.btnAddModule} onClick={() => setShowCreate(true)}>
            + Add Module
          </button>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className={styles.stateCenter}>
          <div className={styles.spinner} />
          <p>Loading modules…</p>
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          <span>⚠️</span>
          <div>
            <strong>Could not reach summarizer backend</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <p className={styles.emptyText}>No modules yet</p>
          <p className={styles.emptyHint}>Click <strong>"+ Add Module"</strong> to create your first module and upload an outline.</p>
          <button className={styles.btnAddModuleEmpty} onClick={() => setShowCreate(true)}>
            + Add Your First Module
          </button>
        </div>
      )}

      {/* Module Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((mod) => (
            <div key={mod.id} className={styles.cardWrapper}>
              <Link href={`/modules/${mod.id}`} className={styles.card}>
                <div className={styles.cardBadges}>
                  <span className={styles.codeBadge}>{mod.code}</span>
                  {mod.department && <span className={styles.deptBadge}>{mod.department}</span>}
                  {mod.outline_processed
                    ? <span className={styles.outlineReadyBadge}>✅ Outline</span>
                    : <span className={styles.outlinePendingBadge}>📋 No outline</span>
                  }
                </div>

                <h3 className={styles.cardName}>{mod.name}</h3>

                <div className={styles.cardMeta}>
                  {mod.year && <span>Year {mod.year}</span>}
                  {mod.semester && <span>Sem {mod.semester}</span>}
                  {mod.credits && <span>{mod.credits} cr</span>}
                  {mod.lecturer && <span>👤 {mod.lecturer}</span>}
                </div>

                {/* LO dots */}
                {mod.learning_outcomes?.length > 0 && (
                  <div className={styles.loRow}>
                    <span className={styles.loLabel}>{mod.learning_outcomes.length} LOs</span>
                    {mod.learning_outcomes.slice(0, 6).map((lo) => (
                      <span key={lo.id} className={styles.loDot}
                        title={`${lo.lo_code}: ${lo.text}`}
                        style={{ background: BLOOM_COLORS[lo.bloom_level] || '#94a3b8' }} />
                    ))}
                    {mod.learning_outcomes.length > 6 && (
                      <span className={styles.loMore}>+{mod.learning_outcomes.length - 6}</span>
                    )}
                  </div>
                )}

                <div className={styles.cardArrow}>Open Module →</div>
              </Link>

              {/* Delete button — shown on hover via CSS */}
              <button
                className={styles.cardDeleteBtn}
                title={`Delete ${mod.name}`}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(mod); setDeleteError(null); }}
              >
                🗑️
              </button>
            </div>
          ))}

          {/* Add Module card */}
          <button className={styles.addCard} onClick={() => setShowCreate(true)}>
            <span className={styles.addCardIcon}>+</span>
            <span className={styles.addCardLabel}>Add New Module</span>
          </button>
        </div>
      )}
    </div>
  );
}
