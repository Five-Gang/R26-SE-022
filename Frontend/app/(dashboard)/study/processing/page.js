'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { documentsApi } from '../../../../lib/summarizer-api';
import styles from './processing.module.css';

const STEPS = [
  { key: 'extracting',  label: 'Extracting lecture content' },
  { key: 'chunking',    label: 'Chunking & embedding text' },
  { key: 'indexing',    label: 'Indexing into vector store' },
  { key: 'ready',       label: 'Ready to generate summary' },
];

export default function ProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get('doc');
  const moduleId = searchParams.get('module');

  const [status, setStatus] = useState('pending'); // pending | processing | completed | failed
  const [chunks, setChunks] = useState(0);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    // First fetch: get filename
    documentsApi.get(docId)
      .then((doc) => setFilename(doc.original_filename || 'Your file'))
      .catch(() => {});

    const poll = async () => {
      try {
        const s = await documentsApi.getStatus(docId);
        setStatus(s.processing_status);
        setChunks(s.chunks_created || 0);

        // Advance step indicator based on chunks
        if (s.chunks_created > 20) setStepIndex(3);
        else if (s.chunks_created > 10) setStepIndex(2);
        else if (s.chunks_created > 0) setStepIndex(1);
        else if (s.processing_status === 'processing') setStepIndex(1);

        if (s.processing_status === 'completed') {
          clearInterval(intervalRef.current);
          setTimeout(() => {
            router.push(`/study/generate?doc=${docId}${moduleId ? `&module=${moduleId}` : ''}`);
          }, 800);
        }
        if (s.processing_status === 'failed') {
          clearInterval(intervalRef.current);
          setError(s.processing_error || 'Processing failed. Please try uploading again.');
        }
      } catch (err) {
        setError(err.message);
        clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2500);
    return () => clearInterval(intervalRef.current);
  }, [docId]);

  const getStepState = (idx) => {
    if (status === 'completed') return 'completed';
    if (idx < stepIndex) return 'completed';
    if (idx === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className={styles.container}>
      <div className={styles.processingCard}>
        <div className={styles.topIcon}>
          <svg className={styles.brainIcon} viewBox="0 0 24 24" fill="none">
            <path d="M16 11.5C16 11.5 17 11 17 9.5C17 8 16 7 14 7C12 7 11.5 8 11.5 8C11.5 8 11 7 9 7C7 7 6 8 6 9.5C6 11 7 11.5 7 11.5C7 11.5 5 12 5 14C5 16.5 7 17 8.5 17C10 17 11.5 16 11.5 16C11.5 16 13 17 14.5 17C16 17 18 16.5 18 14C18 12 16 11.5 16 11.5Z" fill="url(#paint0_linear)"/>
            <defs>
              <linearGradient id="paint0_linear" x1="11.5" y1="7" x2="11.5" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F472B6"/>
                <stop offset="1" stopColor="#38BDF8"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.heading}>
          {status === 'completed' ? 'Processing complete!' : 'Processing your lecture…'}
        </h1>
        <p className={styles.subheading}>{filename}</p>

        {chunks > 0 && (
          <div className={styles.chunksHint}>
            {chunks} text chunks extracted so far
          </div>
        )}

        <div className={styles.progressList}>
          {STEPS.map((step, idx) => {
            const state = getStepState(idx);
            return (
              <div key={step.key} className={styles.progressItem}>
                {state === 'completed' && (
                  <>
                    <div className={styles.iconCompleted}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className={styles.textCompleted}>{step.label}</div>
                  </>
                )}
                {state === 'active' && (
                  <>
                    <div className={styles.iconActive}><div className={styles.spinner}/></div>
                    <div className={styles.contentActive}>
                      <div className={styles.titleActive}>{step.label}</div>
                    </div>
                  </>
                )}
                {state === 'pending' && (
                  <>
                    <div className={styles.iconPending}><div className={styles.dotPending}/></div>
                    <div className={styles.textPending}>{step.label}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className={styles.errorBox}>
            ⚠️ {error}
            <button className={styles.retryBtn} onClick={() => router.push('/study')}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
