'use client';

import React, { useEffect, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { modulesApi, documentsApi } from '../../../lib/summarizer-api';
import styles from './materials.module.css';

const STATUS_META = {
  pending: { label: 'Pending', color: '#f59e0b' },
  processing: { label: 'Processing', color: '#0ea5e9' },
  completed: { label: 'Processed', color: '#0f766e' },
  failed: { label: 'Failed', color: '#ef4444' },
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

  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/v1/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load materials');
        return response.json();
      })
      .then((result) => setMaterials((result.materials || []).map((material) => ({
        ...material,
        date: material.date ? new Date(material.date).toLocaleDateString() : 'Recently added',
        icon: '📄',
      }))))
      .catch(() => setError('Your materials could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className={styles.grid}>
          {filteredMaterials.map(mat => (
            <div key={mat.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.fileIcon}>{mat.icon}</div>
                <div className={styles.moreBtn}>⋮</div>
              </div>
              <h3 className={styles.fileName}>{mat.name}</h3>
              <div className={styles.fileSubject}>{mat.subject}</div>

              <div className={styles.cardBottom}>
                <div className={styles.fileMeta}>{mat.date} · {mat.type}</div>
                <div className={styles.statusBadge}>{mat.status}</div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
