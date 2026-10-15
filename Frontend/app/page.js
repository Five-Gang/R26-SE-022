'use client';

import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoMark}>AL</div>
            AuraLearn
          </Link>

          <div className={styles.navLinks}>
            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link href="/modules"   className={styles.navLink}>Modules</Link>
            <Link href="/study"     className={styles.navLink}>Study</Link>
            <Link href="/login"     className={styles.navLink}>Sign In</Link>
            <Link href="/signup"    className={styles.navCta}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          R26-SE-022 · AI Research Platform
        </div>

        <h1 className={styles.title}>
          Learn smarter with<br />
          <span className={styles.highlight}>AI that adapts</span><br />
          to your mind
        </h1>

        <p className={styles.subtitle}>
          AuraLearn combines real-time emotion detection, hallucination-safe AI tutoring,
          and spaced repetition to build a personalised study environment that evolves with you.
        </p>

        <div className={styles.buttonGroup}>
          <Link href="/signup"    className={styles.btnPrimary}>Start Learning Free →</Link>
          <Link href="/dashboard" className={styles.btnSecondary}>View Dashboard</Link>
        </div>

        {/* Stats */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>4</span>
            <span className={styles.statLabel}>AI Services</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>26</span>
            <span className={styles.statLabel}>Routes</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>RAG</span>
            <span className={styles.statLabel}>Powered Tutor</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>SM-2</span>
            <span className={styles.statLabel}>Spaced Repetition</span>
          </div>
        </div>
      </header>

      {/* ── Features ───────────────────────────────── */}
      <section className={styles.featuresSection}>
        <p className={styles.sectionLabel}>Core Capabilities</p>
        <h2 className={styles.sectionTitle}>Everything you need to excel</h2>
        <p className={styles.sectionSubtitle}>
          Four intelligent microservices working together, seamlessly.
        </p>

        <div className={styles.featuresGrid}>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>📄</div>
            <h3 className={styles.featureTitle}>AI Summarisation</h3>
            <p className={styles.featureDesc}>
              Automatically convert lengthy PDF and PPTX lectures into concise,
              high-yield flashcards ready for instant review.
            </p>
            <span className={`${styles.featureTag} ${styles.tagBlue}`}>port 8000</span>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>🤖</div>
            <h3 className={styles.featureTitle}>Hallucination-Safe Tutor</h3>
            <p className={styles.featureDesc}>
              Ask questions safely. Our RAG-based AI tutor grounds every answer
              strictly in your uploaded study materials.
            </p>
            <span className={`${styles.featureTag} ${styles.tagPurple}`}>port 8002</span>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}>🎯</div>
            <h3 className={styles.featureTitle}>Emotion Detection</h3>
            <p className={styles.featureDesc}>
              Real-time webcam analysis tracks your focus and fatigue levels,
              dynamically adjusting your session to optimise retention.
            </p>
            <span className={`${styles.featureTag} ${styles.tagPink}`}>port 8004</span>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconTeal}`}>⏰</div>
            <h3 className={styles.featureTitle}>Adaptive Reminders</h3>
            <p className={styles.featureDesc}>
              SM-2 spaced repetition algorithms schedule your reviews at the
              precise moment for maximum long-term memory consolidation.
            </p>
            <span className={`${styles.featureTag} ${styles.tagTeal}`}>port 8001</span>
          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className={styles.footer}>
        © 2026 AuraLearn · R26-SE-022 · Five-Gang Research Project
      </footer>

    </div>
  );
}
