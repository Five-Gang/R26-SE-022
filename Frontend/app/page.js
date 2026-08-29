'use client';

import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1rem' }}>AL</span>
          AuraLearn
        </div>
        <div className={styles.navLinks}>
          <Link href="/emotion-demo" className={styles.navLink}>Emotion Demo</Link>
          <Link href="/login" className={styles.navLink}>Sign In</Link>
          <Link href="/signup" className={styles.btnPrimary} style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}>Get Started</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.badge}>R26-SE-022 Research Project</div>
        <h1 className={styles.title}>
          Master your studies with <span className={styles.highlight}>AI-driven</span> focus
        </h1>
        <p className={styles.subtitle}>
          AuraLearn combines advanced emotion detection, AI tutoring, and spaced repetition to build a personalised learning environment that adapts to your mental state.
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/signup" className={styles.btnPrimary}>Start Learning Free</Link>
          <Link href="/dashboard" className={styles.btnSecondary}>View Dashboard</Link>
        </div>
      </header>

      <section className={styles.featuresSection}>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>📄</div>
            <h3 className={styles.featureTitle}>AI Summarisation</h3>
            <p className={styles.featureDesc}>
              Automatically convert lengthy PDF and PPTX lectures into concise, high-yield flashcards.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>🤖</div>
            <h3 className={styles.featureTitle}>Hallucination-Safe Tutor</h3>
            <p className={styles.featureDesc}>
              Ask questions safely. Our AI tutor uses RAG to ensure answers are strictly based on your materials.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}>🎯</div>
            <h3 className={styles.featureTitle}>Emotion Detection</h3>
            <p className={styles.featureDesc}>
              Real-time webcam analysis tracks your focus and fatigue levels to optimise your study time.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconTeal}`}>⏰</div>
            <h3 className={styles.featureTitle}>Adaptive Reminders</h3>
            <p className={styles.featureDesc}>
              SM-2 spaced repetition algorithms schedule your reviews at the exact right moment for long-term retention.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
