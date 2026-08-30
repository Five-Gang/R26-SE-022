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
    { name: 'Focus Monitor', path: '/focus-monitor', icon: '🎯' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Reminders', path: '/study/queue', icon: '⏰' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Rewards', path: '/rewards', icon: '🏆' },
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 className={styles.pageTitle}>Welcome back, Mihiraj!</h1>
            <p className={styles.pageSubtitle}>Ready for today&apos;s session? You have 3 tasks pending.</p>
          </div>

          {/* Gamification Widget on Dashboard */}
          <Link href="/rewards" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--color-surface)', padding: '0.75rem 1.5rem', borderRadius: '30px', border: '1px solid var(--color-border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🔥</span>
                <span style={{ fontWeight: '700', color: '#B45309' }}>3 Days</span>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', color: '#1D4ED8' }}>✨</span>
                <span style={{ fontWeight: '700', color: '#1E3A8A' }}>Level 5</span>
              </div>
            </div>
          </Link>
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
                <Link href="/study/session/summary" className={styles.reviewLink}>
                  Review →
                </Link>
              </div>

              <div className={styles.sessionRow}>
                <div className={`${styles.scoreBadge} ${styles.scoreGreen}`}>91%</div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTitle}>Data Structures</div>
                  <div className={styles.sessionMeta}>CS2041 · 2 days ago</div>
                </div>
                <Link href="/study/session/summary" className={styles.reviewLink}>
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
