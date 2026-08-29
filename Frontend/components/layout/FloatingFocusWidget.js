'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFocus } from '../../context/FocusContext';
import styles from './FloatingFocusWidget.module.css';

export default function FloatingFocusWidget() {
  const { isMonitoring, sessionSeconds, focusData, stopMonitoring } = useFocus();
  const pathname = usePathname();

  // Don't show floating widget if not monitoring or if student is already on the dedicated /focus-monitor page
  if (!isMonitoring || pathname === '/focus-monitor') {
    return null;
  }

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.floatingWidget}>
      <div className={styles.statusIndicator}>
        <span className={styles.dot}></span>
        <span className={styles.statusText}>Focus AI Live</span>
      </div>

      <div className={styles.scoreBadge}>
        🎯 {focusData.attentionScore}% Focus
      </div>

      <div className={styles.timer}>
        ⏱️ {formatTimer(sessionSeconds)}
      </div>

      <Link href="/focus-monitor" className={styles.btnView}>
        Full View
      </Link>

      <button className={styles.btnStop} onClick={stopMonitoring}>
        End Session
      </button>
    </div>
  );
}
