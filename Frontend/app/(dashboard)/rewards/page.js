'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './rewards.module.css';

export default function RewardsPage() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Study', path: '/study', icon: '📚' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Reminders', path: '/study/queue', icon: '⏰' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Rewards', path: '/rewards', icon: '🏆' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const badges = [
    { id: 1, icon: '🔥', title: '3-Day Streak', desc: 'Studied for 3 consecutive days.', unlocked: true },
    { id: 2, icon: '🎯', title: 'Focus Master', desc: 'Maintained 80%+ focus for an hour.', unlocked: true },
    { id: 3, icon: '📚', title: 'Bookworm', desc: 'Processed 5+ lecture materials.', unlocked: true },
    { id: 4, icon: '🦉', title: 'Night Owl', desc: 'Completed a session after 10 PM.', unlocked: false },
    { id: 5, icon: '🧠', title: 'Memory Champ', desc: 'Got 100% on a spaced repetition quiz.', unlocked: false },
    { id: 6, icon: '💎', title: '7-Day Streak', desc: 'Studied for a full week straight.', unlocked: false },
  ];

  const days = [
    { name: 'Mon', active: true },
    { name: 'Tue', active: true },
    { name: 'Wed', active: true },
    { name: 'Thu', active: false },
    { name: 'Fri', active: false },
    { name: 'Sat', active: false },
    { name: 'Sun', active: false },
  ];

  return (
    <div className={styles.container}>
      
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

      <main className={styles.main}>
        
        <h1 className={styles.pageTitle}>Rewards & Achievements</h1>
        <p className={styles.pageSubtitle}>Track your progress and unlock badges as you study.</p>

        {/* Hero Section */}
        <div className={styles.heroCard}>
          <div className={styles.levelInfo}>
            <div className={styles.levelLabel}>Current Level</div>
            <div className={styles.levelTitle}>Level 5 Scholar</div>
            <div className={styles.progressContainer}>
              <div className={styles.progressStats}>
                <span>1,250 XP</span>
                <span>2,000 XP (Next Level)</span>
              </div>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: '62.5%' }}></div>
              </div>
            </div>
          </div>
          <div className={styles.streakBox}>
            <div className={styles.streakIcon}>🔥</div>
            <div className={styles.streakValue}>3 Days</div>
            <div className={styles.streakLabel}>Current Streak</div>
          </div>
        </div>

        {/* Badges Section */}
        <h2 className={styles.sectionTitle}>Your Badges</h2>
        <div className={styles.badgesGrid}>
          {badges.map(badge => (
            <div key={badge.id} className={`${styles.badgeCard} ${badge.unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.badgeIcon}>{badge.icon}</div>
              <h3 className={styles.badgeTitle}>{badge.title}</h3>
              <p className={styles.badgeDesc}>{badge.desc}</p>
            </div>
          ))}
        </div>

        {/* Weekly Tracker */}
        <div className={styles.trackerCard}>
          <h2 className={styles.sectionTitle}>This Week's Consistency</h2>
          <div className={styles.daysGrid}>
            {days.map(day => (
              <div key={day.name} className={styles.dayItem}>
                <span className={styles.dayLabel}>{day.name}</span>
                <div className={`${styles.dayCircle} ${day.active ? styles.active : ''}`}>
                  {day.active ? '✓' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
