'use client';

import React from 'react';
import styles from './consent.module.css';

export default function FocusConsentPage() {
  return (
    <div className={styles.overlayContainer}>
      <div className={styles.modal}>
        
        <div className={styles.iconWrapper}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.3"/>
            <circle cx="12" cy="12" r="5" stroke="#F472B6" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="#F472B6"/>
            <path d="M14.5 9.5L19 5" stroke="#0F766E" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 5L17 4.5L19.5 7L19 5Z" fill="#0F766E"/>
          </svg>
        </div>

        <h2 className={styles.heading}>Enable Focus Monitoring?</h2>
        
        <p className={styles.description}>
          AuraLearn can monitor your focus and emotional state using your webcam — helping detect when you need a break or change of pace.
        </p>

        <div className={styles.benefitsList}>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>🔒</div>
            <div className={styles.benefitContent}>
              <span className={styles.benefitTitle}>Privacy first</span>
              <span className={styles.benefitDesc}>Data stays on your device. Nothing is uploaded.</span>
            </div>
          </div>
          
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>📊</div>
            <div className={styles.benefitContent}>
              <span className={styles.benefitTitle}>Improves reminders</span>
              <span className={styles.benefitDesc}>Reminders adapt to your real-time focus level.</span>
            </div>
          </div>

          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>🎓</div>
            <div className={styles.benefitContent}>
              <span className={styles.benefitTitle}>Aids research</span>
              <span className={styles.benefitDesc}>Helps the SLIIT R26-SE-022 research project.</span>
            </div>
          </div>
        </div>

        <button className={styles.btnAccept}>
          ✓ Enable Focus Monitoring
        </button>
        
        <button className={styles.btnDecline}>
          No thanks, continue without
        </button>

      </div>
    </div>
  );
}
