"use client";
import styles from "./ConsentScreen.module.css";

export default function ConsentScreen({ onStart }) {
  return (
    <section className={styles.consent}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#cGrad)" strokeWidth="3" opacity="0.3"/>
            <circle cx="32" cy="32" r="20" stroke="url(#cGrad)" strokeWidth="2.5"/>
            <circle cx="24" cy="28" r="3" fill="url(#cGrad)"/>
            <circle cx="40" cy="28" r="3" fill="url(#cGrad)"/>
            <path d="M23 40c2.5 3.5 5.5 5 9 5s6.5-1.5 9-5" stroke="url(#cGrad)" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="cGrad" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1>Affect &amp; Attention-Aware<br/>Emotion Detection</h1>
        <p className={styles.subtitle}>
          Lightweight, privacy-preserving emotion monitoring for your study sessions
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🔒</span>
            <div>
              <strong>Zero Image Storage</strong>
              <p>Images are analyzed in-memory and immediately discarded</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>⚡</span>
            <div>
              <strong>Lightweight Processing</strong>
              <p>~30 frames/min with minimal CPU usage via MediaPipe</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🧠</span>
            <div>
              <strong>5 Learning-Relevant Emotions</strong>
              <p>Focused, Confused, Frustrated, Bored, Neutral</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>👁️</span>
            <div>
              <strong>Eye Behavior Analysis</strong>
              <p>Eye Aspect Ratio (EAR) for fatigue &amp; attention detection</p>
            </div>
          </div>
        </div>

        <button className={styles.btn} onClick={onStart}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="4" fill="currentColor"/>
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Enable Webcam &amp; Start Session
        </button>
        <p className={styles.note}>
          By clicking, you consent to webcam access for emotion detection. No images are stored.
        </p>
      </div>
    </section>
  );
}
