'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { modulesApi, documentsApi } from '../../../lib/summarizer-api';
import styles from './materials.module.css';

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#f59e0b' },
  processing: { label: 'Processing', color: '#0ea5e9' },
  completed:  { label: 'Processed',  color: '#0f766e' },
  failed:     { label: 'Failed',     color: '#ef4444' },
};

export default function MaterialsPage() {
  const [modules, setModules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadType, setUploadType] = useState('lecture_slide');
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef();

  const fetchAll = async () => {
    try {
      const mods = await modulesApi.list();
      setModules(mods);
      if (mods.length > 0) {
        const allDocs = await Promise.all(mods.map((m) => documentsApi.listByModule(m.id)));
        setDocs(allDocs.flat());
        if (!uploadModuleId && mods[0]) setUploadModuleId(mods[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

  const filtered = docs.filter((d) => {
    const mod = moduleMap[d.module_id];
    const matchModule = selectedModule === 'all' || d.module_id === selectedModule;
    const matchSearch =
      (d.original_filename || '').toLowerCase().includes(search.toLowerCase()) ||
      (mod?.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (mod?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchModule && matchSearch;
  });

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadModuleId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await documentsApi.upload(uploadModuleId, file, uploadType);
      await fetchAll();
      setShowUpload(false);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.delete(docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Study Materials</h1>
            <p className={styles.pageSubtitle}>
              Your uploaded lecture files — PDFs, PowerPoints, and their processing status.
            </p>
          </div>
          <button className={styles.btnUpload} onClick={() => setShowUpload(true)}>
            <span>+</span> Upload New
          </button>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className={styles.modalOverlay} onClick={() => setShowUpload(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Upload Document</h2>

              <label className={styles.formLabel}>Module</label>
              <select
                className={styles.formSelect}
                value={uploadModuleId}
                onChange={(e) => setUploadModuleId(e.target.value)}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                ))}
              </select>

              <label className={styles.formLabel}>Document Type</label>
              <select
                className={styles.formSelect}
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                <option value="lecture_slide">Lecture Slides (PDF/PPTX)</option>
                <option value="lecture_note">Lecture Notes (PDF)</option>
                <option value="module_outline">Module Outline</option>
              </select>

              <label className={styles.formLabel}>File (PDF or PPTX)</label>
              <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt" className={styles.fileInput} />

              {uploadError && <div className={styles.uploadError}>{uploadError}</div>}

              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={() => setShowUpload(false)}>Cancel</button>
                <button className={styles.btnConfirm} onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={styles.controlsRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search files, modules..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
          >
            <option value="all">All Modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.code}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.stateCenter}>
            <div className={styles.spinner} />
            <p>Loading materials…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className={styles.stateCenter}>
            <div className={styles.emptyIcon}>📁</div>
            <p className={styles.emptyText}>No documents found.</p>
            <p className={styles.emptyHint}>Upload a lecture file to get started.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className={styles.grid}>
            {filtered.map((doc) => {
              const mod = moduleMap[doc.module_id];
              const isPdf = doc.mime_type?.includes('pdf') || doc.original_filename?.endsWith('.pdf');
              const s = STATUS_META[doc.processing_status] || STATUS_META.pending;
              return (
                <div key={doc.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.fileIcon}>{isPdf ? '📄' : '📽️'}</div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(doc.id)}
                      title="Delete"
                    >⋯</button>
                  </div>
                  <h3 className={styles.fileName} title={doc.original_filename}>
                    {doc.original_filename}
                  </h3>
                  {mod && (
                    <div className={styles.fileSubject}>
                      <span className={styles.modCode}>{mod.code}</span> {mod.name}
                    </div>
                  )}
                  <div className={styles.cardBottom}>
                    <div className={styles.fileMeta}>
                      {isPdf ? 'PDF' : 'PPTX'} · {doc.document_type?.replace(/_/g, ' ')}
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{ color: s.color }}
                    >
                      {s.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
