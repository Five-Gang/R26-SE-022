'use client';

import React from 'react';
import styles from './architecture.module.css';

export default function ArchitecturePage() {
  return (
    <div className={styles.container}>
      
      <div className={styles.headerBlock}>
        <h1 className={styles.pageTitle}>System Architecture Map</h1>
        <p className={styles.pageSubtitle}>AuraLearn R26-SE-022 · 4-module research pipeline</p>
      </div>

      <div className={styles.modulesGrid}>
        
        {/* Module 1 */}
        <div className={styles.moduleCard}>
          <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>📄</div>
          <h2 className={`${styles.moduleTitle} ${styles.textBlue}`}>Lecture Summarisation</h2>
          <div className={styles.studentId}>IT22187178 - T.G.K.G Vijithapala</div>
          <ul className={`${styles.featureList} ${styles.bulletBlue}`}>
            <li className={styles.featureItem}>BART/T5 Transformer</li>
            <li className={styles.featureItem}>Importance ranking</li>
            <li className={styles.featureItem}>KEY/MEDIUM/LOW tags</li>
            <li className={styles.featureItem}>Flashcard generation</li>
          </ul>
        </div>

        {/* Module 2 */}
        <div className={styles.moduleCard}>
          <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>🤖</div>
          <h2 className={`${styles.moduleTitle} ${styles.textPurple}`}>Hallucination-Safe Tutor</h2>
          <div className={styles.studentId}>IT22120120 - I.H. Sonal Dilmith</div>
          <ul className={`${styles.featureList} ${styles.bulletPurple}`}>
            <li className={styles.featureItem}>Sentence-BERT encoder</li>
            <li className={styles.featureItem}>FAISS vector search</li>
            <li className={styles.featureItem}>Top-k retrieval</li>
            <li className={styles.featureItem}>Uncertainty scoring</li>
          </ul>
        </div>

        {/* Module 3 */}
        <div className={styles.moduleCard}>
          <div className={`${styles.iconWrapper} ${styles.iconRed}`}>🎯</div>
          <h2 className={`${styles.moduleTitle} ${styles.textRed}`}>Emotion Detection</h2>
          <div className={styles.studentId}>IT22224552 - K.K.G.Y. Mihiraj</div>
          <ul className={`${styles.featureList} ${styles.bulletRed}`}>
            <li className={styles.featureItem}>MediaPipe Face Mesh</li>
            <li className={styles.featureItem}>468 landmark points</li>
            <li className={styles.featureItem}>EAR blink analysis</li>
            <li className={styles.featureItem}>5-class classifier</li>
          </ul>
        </div>

        {/* Module 4 */}
        <div className={styles.moduleCard}>
          <div className={`${styles.iconWrapper} ${styles.iconTeal}`}>⏰</div>
          <h2 className={`${styles.moduleTitle} ${styles.textTeal}`}>Adaptive Reminders</h2>
          <div className={styles.studentId}>IT22XXXXXX - ARS Module</div>
          <ul className={`${styles.featureList} ${styles.bulletTeal}`}>
            <li className={styles.featureItem}>SM-2 spaced rep</li>
            <li className={styles.featureItem}>Emotion feed input</li>
            <li className={styles.featureItem}>Time-aware scheduling</li>
            <li className={styles.featureItem}>Push notifications</li>
          </ul>
        </div>

      </div>

      {/* Bottom Banner */}
      <div className={styles.dataFlowBanner}>
        <span className={styles.flowLabel}>Data Flow:</span>
        <div className={styles.flowContainer}>
          <div className={styles.flowBadge}>Upload PDF/PPTX</div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowBadge}>Summarise + Flashcards</div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowBadge}>Study Session</div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowBadge}>Emotion Monitor</div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowBadge}>Adaptive Scheduler</div>
          <span className={styles.flowArrow}>→</span>
          <div className={styles.flowBadge}>Smart Reminder</div>
        </div>
      </div>

    </div>
  );
}
