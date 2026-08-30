'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { modulesApi, documentsApi } from '../../../lib/summarizer-api';
import styles from './study.module.css';

export default function StudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preModule = searchParams.get('module');

  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(preModule || '');
  const [docType, setDocType] = useState('lecture_slide');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    modulesApi.list().then((mods) => {
      setModules(mods);
      if (!selectedModule && mods.length > 0) setSelectedModule(mods[0].id);
    }).catch(() => {});
  }, []);

  const upload = async (file) => {
    if (!file) return;
    if (!selectedModule) { setError('Please select a module first.'); return; }
    setError(null);
    setUploading(true);
    try {
      const doc = await documentsApi.upload(selectedModule, file, docType);
      router.push(`/study/processing?doc=${doc.id}`);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const onFileChange = (e) => upload(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadCard}>
        <h1 className={styles.heading}>What are you studying today?</h1>
        <p className={styles.subheading}>
          Upload your lecture slide or PDF and we'll generate an AI summary, flashcards, and quiz in seconds.
        </p>

        {/* Module + type selectors */}
        <div className={styles.selectRow}>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Module</label>
            <select
              className={styles.selectInput}
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              {modules.length === 0 && <option value="">Loading modules…</option>}
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Document Type</label>
            <select
              className={styles.selectInput}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="lecture_slide">Lecture Slides</option>
              <option value="lecture_note">Lecture Notes</option>
              <option value="module_outline">Module Outline</option>
            </select>
          </div>
        </div>

        {/* Dropzone */}
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${uploading ? styles.uploading : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt" hidden onChange={onFileChange} />
          <div className={styles.iconWrapper}>
            {uploading ? (
              <div className={styles.spinner} />
            ) : (
              <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="currentColor" opacity="0.4"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                <path d="M8 13H16M8 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
              </svg>
            )}
          </div>
          <h3 className={styles.dropTitle}>
            {uploading ? 'Uploading your file…' : dragOver ? 'Drop it here!' : 'Drop your lecture file here'}
          </h3>
          <p className={styles.dropSubtitle}>PDF, PPTX · up to 50 MB</p>
          {!uploading && <button className={styles.browseBtn}>Browse files</button>}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}
      </div>

      {/* Demo / recent modules */}
      {modules.length > 0 && (
        <>
          <div className={styles.divider}>Or pick a module to generate from uploaded slides</div>
          <div className={styles.demoList}>
            {modules.slice(0, 3).map((m) => (
              <div key={m.id} className={styles.demoCard}>
                <div className={styles.demoCardLeft}>
                  <div className={styles.demoIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#D8B4E2"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.demoTitle}>{m.code} — {m.name}</div>
                    <div className={styles.demoSubtitle}>{m.department || 'Module'} · {m.credits || '—'} credits</div>
                  </div>
                </div>
                <button
                  className={styles.useBtn}
                  onClick={() => router.push(`/study/generate?module=${m.id}`)}
                >
                  Generate →
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
