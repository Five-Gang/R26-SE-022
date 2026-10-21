'use client';

import React from 'react';
import styles from './layout.module.css';

export default function SessionLayout({ children }) {
  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
