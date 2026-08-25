'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Study', path: '/study', icon: '📚' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Reminders', path: '/reminders', icon: '⏰' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div className={styles.container}>
      
      {/* Sidebar specific to main layout areas */}
      <aside className={styles.sidebar}>
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
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        
        <div className={styles.header}>
          <h1 className={styles.greeting}>Good evening, Mihiraj 👋</h1>
          <p className={styles.subgreeting}>You have 2 topics due for review today.</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statBlue}`}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statValue}>12</div>
            <div className={styles.statLabel}>Topics studied</div>
          </div>
          <div className={`${styles.statCard} ${styles.statGreen}`}>
            <div className={styles.statIcon}>🃏</div>
            <div className={styles.statValue}>148</div>
            <div className={styles.statLabel}>Cards reviewed</div>
          </div>
          <div className={`${styles.statCard} ${styles.statOrange}`}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statValue}>84%</div>
            <div className={styles.statLabel}>Avg quiz score</div>
          </div>
          <div className={`${styles.statCard} ${styles.statPink}`}>
            <div className={styles.statIcon}>⏱️</div>
            <div className={styles.statValue}>4.2h</div>
            <div className={styles.statLabel}>Study time this week</div>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          
          {/* Recent Study Sessions */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Study Sessions</h2>
            <div className={styles.sessionList}>
              
              <div className={styles.sessionRow}>
                <div className={`${styles.scoreBadge} ${styles.scoreGreen}`}>87%</div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>Integration Methods</div>
                  <div className={styles.sessionMeta}>CS3042 · Today</div>
                </div>
                <Link href="/study/session/summary" className={styles.reviewLink}>
                  Review →
                </Link>
              </div>

              <div className={styles.sessionRow}>
                <div className={`${styles.scoreBadge} ${styles.scoreYellow}`}>72%</div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>Cell Division</div>
                  <div className={styles.sessionMeta}>BIO2012 · Yesterday</div>
                </div>
                <Link href="#" className={styles.reviewLink}>
                  Review →
                </Link>
              </div>

              <div className={styles.sessionRow}>
                <div className={`${styles.scoreBadge} ${styles.scoreGreen}`}>91%</div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>Data Structures</div>
                  <div className={styles.sessionMeta}>CS2041 · 2 days ago</div>
                </div>
                <Link href="#" className={styles.reviewLink}>
                  Review →
                </Link>
              </div>

            </div>
          </div>

          {/* Upcoming Reminders */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upcoming Reminders</h2>
            <div className={styles.reminderList}>
              
              <div className={styles.reminderRow}>
                <div className={styles.reminderTitle}>Integration Methods</div>
                <div className={styles.reminderTime}>
                  <span>⏰</span> Tonight 7:00 PM
                </div>
                <div className={styles.reminderPriority}>High priority</div>
              </div>

              <div className={styles.reminderRow}>
                <div className={styles.reminderTitle}>Cell Division</div>
                <div className={styles.reminderTime}>
                  <span>⏰</span> Tomorrow 9:00 AM
                </div>
                <div className={styles.reminderPriority}>Medium</div>
              </div>

              <div className={styles.reminderRow}>
                <div className={styles.reminderTitle}>Data Structures</div>
                <div className={styles.reminderTime}>
                  <span>⏰</span> Tomorrow 4:00 PM
                </div>
                <div className={styles.reminderPriority}>Low</div>
              </div>

            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
