'use client';

import React from 'react';
import styles from './flashcard.module.css';

export default function FlashcardsPage() {
  return (
    <div className={styles.container}>
      
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.pageTitle}>Flashcard Review</div>
        <div className={styles.cardMeta}>Card 5 / 18 · Integration Methods</div>
      </div>

      {/* Main Flashcard */}
      <div className={styles.flashcard}>
        <div className={styles.badge}>Question</div>
        
        <div className={styles.mainContent}>
          <h2 className={styles.question}>
            What does the LIATE rule define, and when is it applied in integration?
          </h2>
        </div>
        
        <div className={styles.hintText}>Tap to reveal answer</div>
      </div>

      {/* Rating Buttons */}
      <div className={styles.actionsContainer}>
        <button className={`${styles.actionBtn} ${styles.btnAgain}`}>
          <span>🤯</span> Again
        </button>
        <button className={`${styles.actionBtn} ${styles.btnHard}`}>
          <span>🤔</span> Hard
        </button>
        <button className={`${styles.actionBtn} ${styles.btnEasy}`}>
          <span>🤩</span> Easy
        </button>
      </div>

      {/* Progress Footer */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
        <div className={styles.progressStats}>
          5 reviewed · 13 remaining · Due for review: 2 cards tomorrow
        </div>
      </div>

    </div>
  );
}
