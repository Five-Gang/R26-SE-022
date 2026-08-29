'use client';

import React from 'react';
import styles from './processing.module.css';

export default function ProcessingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.processingCard}>
        <div className={styles.topIcon}>
          <svg className={styles.brainIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 11.5C16 11.5 17 11 17 9.5C17 8 16 7 14 7C12 7 11.5 8 11.5 8C11.5 8 11 7 9 7C7 7 6 8 6 9.5C6 11 7 11.5 7 11.5C7 11.5 5 12 5 14C5 16.5 7 17 8.5 17C10 17 11.5 16 11.5 16C11.5 16 13 17 14.5 17C16 17 18 16.5 18 14C18 12 16 11.5 16 11.5Z" fill="url(#paint0_linear)"/>
            <path d="M12 8C12 8 12 9 12 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
            <path d="M12 14C12 14 12 15 12 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
            <path d="M15 11C15 11 16 12 16 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
            <path d="M8 11C8 11 7 12 7 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
            <defs>
              <linearGradient id="paint0_linear" x1="11.5" y1="7" x2="11.5" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F472B6" />
                <stop offset="1" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.heading}>Building your study plan...</h1>
        <p className={styles.subheading}>Lecture 3 — Integration Methods.pdf · 24 slides</p>

        <div className={styles.progressList}>
          
          {/* Completed Step 1 */}
          <div className={styles.progressItem}>
            <div className={styles.iconCompleted}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.textCompleted}>Extracting lecture content</div>
          </div>

          {/* Completed Step 2 */}
          <div className={styles.progressItem}>
            <div className={styles.iconCompleted}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.textCompleted}>Generating AI summary</div>
          </div>

          {/* Completed Step 3 */}
          <div className={styles.progressItem}>
            <div className={styles.iconCompleted}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.textCompleted}>Creating flashcard deck</div>
          </div>

          {/* Active Step 4 */}
          <div className={styles.progressItem}>
            <div className={styles.iconActive}>
              <div className={styles.spinner}></div>
            </div>
            <div className={styles.contentActive}>
              <div className={styles.titleActive}>Building quiz questions</div>
              <div className={styles.progressRow}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill}></div>
                </div>
                <div className={styles.progressText}>68%</div>
              </div>
            </div>
          </div>

          {/* Pending Step 5 */}
          <div className={styles.progressItem}>
            <div className={styles.iconPending}>
              <div className={styles.dotPending}></div>
            </div>
            <div className={styles.textPending}>Scheduling adaptive reminders</div>
          </div>

        </div>
      </div>
    </div>
  );
}
