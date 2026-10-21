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
          Personalised learning, reimagined
        </div>

        <h1 className={styles.title}>
          Learn smarter with<br />
          <span className={styles.highlight}>AI that adapts</span><br />
          to your mind
        </h1>

        <p className={styles.subtitle}>
          AuraLearn brings your study materials, an intelligent tutor, and focus-aware
          support together in one calm, personalised learning space.
        </p>

        <div className={styles.buttonGroup}>
          <Link href="/signup"    className={styles.btnPrimary}>Start Learning Free →</Link>
          <Link href="/dashboard" className={styles.btnSecondary}>View Dashboard</Link>
        </div>

        {/* Stats */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>01</span>
            <span className={styles.statLabel}>Personal study space</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>24/7</span>
            <span className={styles.statLabel}>On-demand tutor</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>AI</span>
            <span className={styles.statLabel}>Study guidance</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>You</span>
            <span className={styles.statLabel}>At the centre</span>
          </div>
        </div>
      </header>

      {/* ── Features ───────────────────────────────── */}
      <section className={styles.featuresSection}>
        <p className={styles.sectionLabel}>Core Capabilities</p>
        <h2 className={styles.sectionTitle}>Everything you need to excel</h2>
        <p className={styles.sectionSubtitle}>
          A thoughtful toolkit that helps you understand more, stay focused, and remember longer.
        </p>

        <div className={styles.featuresGrid}>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>01</div>
            <h3 className={styles.featureTitle}>AI Summarisation</h3>
            <p className={styles.featureDesc}>
              Automatically convert lengthy PDF and PPTX lectures into concise,
              high-yield flashcards ready for instant review.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>02</div>
            <h3 className={styles.featureTitle}>Hallucination-Safe Tutor</h3>
            <p className={styles.featureDesc}>
              Ask questions confidently. Our AI tutor grounds every answer
              strictly in your uploaded study materials.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconRed}`}>03</div>
            <h3 className={styles.featureTitle}>Emotion Detection</h3>
            <p className={styles.featureDesc}>
              Real-time webcam analysis tracks your focus and fatigue levels,
              dynamically adjusting your session to optimise retention.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={`${styles.iconWrapper} ${styles.iconTeal}`}>04</div>
            <h3 className={styles.featureTitle}>Adaptive Reminders</h3>
            <p className={styles.featureDesc}>
              Smart spaced repetition schedules your reviews at the precise
              moment to help new knowledge stick.
            </p>
          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className={styles.footer}>
        © 2026 AuraLearn · Learn with clarity. Grow with confidence.
      </footer>

    </div>
  );
}
