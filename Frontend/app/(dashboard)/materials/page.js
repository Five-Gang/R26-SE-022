'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './materials.module.css';

const STATUS_META = {
  pending: { label: 'Pending', color: '#f59e0b' },
  processing: { label: 'Processing', color: '#0ea5e9' },
  completed: { label: 'Processed', color: '#0f766e' },
  failed: { label: 'Failed', color: '#ef4444' },
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadType, setUploadType] = useState('lecture_slide');
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef();

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  useEffect(() => {
    const token = window.localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    Promise.all([
      fetch(`${API}/api/v1/materials`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/v1/modules`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([matRes, modRes]) => {
        if (!matRes.ok) throw new Error('Unable to load materials');
        const matData = await matRes.json();
        const modData = modRes.ok ? await modRes.json() : { modules: [] };

        setMaterials((matData.materials || []).map((m) => ({
          ...m,
          date: m.date ? new Date(m.date).toLocaleDateString() : 'Recently added',
          icon: '📄',
        })));
        setModules(modData.modules || []);
        if (modData.modules?.length) setUploadModuleId(modData.modules[0]?.id || '');
      })
      .catch(() => setError('Your materials could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    const token = window.localStorage.getItem('access_token');
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadModuleId) { setUploadError('Please select a module and file.'); return; }

    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('module_id', uploadModuleId);
    form.append('document_type', uploadType);

    try {
      const res = await fetch(`${API}/api/v1/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      setShowUpload(false);
      // Refresh materials list
      const matRes = await fetch(`${API}/api/v1/materials`, { headers: { Authorization: `Bearer ${token}` } });
      const matData = await matRes.json();
      setMaterials((matData.materials || []).map((m) => ({
        ...m,
        date: m.date ? new Date(m.date).toLocaleDateString() : 'Recently added',
        icon: '📄',
      })));
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.subject || '').toLowerCase().includes(search.toLowerCase());
    const matchesModule = selectedModule === 'all' || m.module_id === selectedModule;
    return matchesSearch && matchesModule;
  });

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

        {loading && <p className={styles.statusMsg}>Loading materials…</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}

        {!loading && !error && filteredMaterials.length === 0 && (
          <div className={styles.emptyState}>
            <p>No materials yet. Upload your first lecture file to get started!</p>
          </div>
        )}

        <div className={styles.grid}>
          {filteredMaterials.map((mat) => {
            const status = STATUS_META[mat.status] || { label: mat.status, color: '#94a3b8' };
            return (
              <div key={mat.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.fileIcon}>{mat.icon}</div>
                  <div className={styles.moreBtn}>⋮</div>
                </div>
                <h3 className={styles.fileName}>{mat.name}</h3>
                <div className={styles.fileSubject}>{mat.subject || mat.module_name || '—'}</div>
                <div className={styles.cardBottom}>
                  <div className={styles.fileMeta}>{mat.date} · {mat.type || mat.document_type}</div>
                  <div className={styles.statusBadge} style={{ color: status.color }}>{status.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
