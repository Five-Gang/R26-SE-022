'use client';

import React from 'react';
import styles from './complete.module.css';
import Link from 'next/link';

export default function SessionCompletePage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={styles.icon}>🎉</div>
        
        <h1 className={styles.heading}>Session Complete!</h1>
        <p className={styles.subheading}>
           Great work on Integration Methods — you&apos;re building strong recall.
        </p>

        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${styles.statGreen}`}>
            <div className={styles.statValue}>7 / 8</div>
            <div className={styles.statLabel}>Quiz Score</div>
          </div>
          
          <div className={`${styles.statCard} ${styles.statBlue}`}>
            <div className={styles.statValue}>18</div>
            <div className={styles.statLabel}>Cards Reviewed</div>
          </div>
          
          <div className={`${styles.statCard} ${styles.statOrange}`}>
            <div className={styles.statValue}>28 min</div>
            <div className={styles.statLabel}>Time Studied</div>
          </div>
        </div>

        <div className={styles.alertBox}>
          <div className={styles.alertTitleRow}>
            <span>🤖</span> AI Reminder scheduled
          </div>
          <div className={styles.alertBody}>
            Next review: <strong>Tomorrow at 7:00 PM</strong> · Spaced-repetition optimised for long-term retention.
          </div>
        </div>

        <div className={styles.actionsRow}>
          <Link href="/study/quiz" className={styles.btnOutline}>Review Mistakes</Link>
          <Link href="/dashboard" className={styles.btnPrimary}>
            Go to Dashboard →
          </Link>
        </div>

      </div>
    </div>
  );
}
