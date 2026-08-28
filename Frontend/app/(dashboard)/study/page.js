'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './study.module.css';

export default function StudyPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.uploadCard}>
        <h1 className={styles.heading}>What are you studying today?</h1>
        <p className={styles.subheading}>Upload your lecture and we&apos;ll build a personalised study plan in seconds.</p>

        <div className={styles.dropzone}>
          <div className={styles.iconWrapper}>
            <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="currentColor" opacity="0.4"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <path d="M8 13H16M8 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            </svg>
          </div>
          <h3 className={styles.dropTitle}>Drop your lecture file here</h3>
          <p className={styles.dropSubtitle}>PDF, PPTX · up to 50 MB</p>
          <button className={styles.browseBtn} onClick={() => router.push('/study/processing')}>Browse files</button>
        </div>
      </div>

      <div className={styles.divider}>
        Or start with a demo lecture
      </div>

      <div className={styles.demoList}>
        <div className={styles.demoCard}>
          <div className={styles.demoCardLeft}>
            <div className={styles.demoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#D8B4E2"/>
              </svg>
            </div>
            <div>
              <div className={styles.demoTitle}>Lecture 3 — Integration Methods.pdf</div>
              <div className={styles.demoSubtitle}>Demo · 24 slides</div>
            </div>
          </div>
          <button className={styles.useBtn} onClick={() => router.push('/study/processing')}>Use this →</button>
        </div>
      </div>
    </div>
  );
}
