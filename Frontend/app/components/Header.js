"use client";
import styles from "./Header.module.css";

export default function Header({ sessionTime, isRunning }) {
  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" stroke="url(#logoGrad)" strokeWidth="2.5"/>
              <circle cx="10" cy="11" r="2" fill="url(#logoGrad)"/>
              <circle cx="18" cy="11" r="2" fill="url(#logoGrad)"/>
              <path d="M9 18c1.5 2 3.5 3 5 3s3.5-1 5-3" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.logoText}>EmotiSense</span>
        </div>
        <nav className={styles.headerNav}>
          <div className={styles.privacyBadge}>
            <span className={styles.privacyDot}></span>
            <span>Privacy Protected</span>
          </div>
          {isRunning && (
            <div className={styles.timer}>{formatTime(sessionTime)}</div>
          )}
        </nav>
      </div>
    </header>
  );
}
