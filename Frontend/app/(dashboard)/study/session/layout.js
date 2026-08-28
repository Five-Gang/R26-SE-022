'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

export default function SessionLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Summary', path: '/study/session/summary', icon: '📋' },
    { name: 'Quiz', path: '/study/quiz', icon: '❓' },
    { name: 'Flashcards', path: '/study/flashcards', icon: '🃏' },
    { name: 'Progress', path: '/dashboard', icon: '📊' },
  ];

  return (
    <div className={styles.container}>
      
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sessionInfo}>
          <div className={styles.sessionLabel}>Currently studying</div>
          <div className={styles.sessionTitle}>Integration Methods</div>
          <div className={styles.sessionMeta}>CS3042 · 24 slides</div>
          
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
            <div className={styles.progressText}>35% through session</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>

    </div>
  );
}
