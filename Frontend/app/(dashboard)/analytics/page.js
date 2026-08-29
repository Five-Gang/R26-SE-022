'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Study', path: '/study', icon: '📚' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Reminders', path: '/study/queue', icon: '⏰' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const emotionData = [
    { day: 'Mon', focus: 75, fatigue: 30 },
    { day: 'Tue', focus: 82, fatigue: 25 },
    { day: 'Wed', focus: 68, fatigue: 55 },
    { day: 'Thu', focus: 89, fatigue: 20 },
    { day: 'Fri', focus: 95, fatigue: 15 },
    { day: 'Sat', focus: 85, fatigue: 35 },
    { day: 'Sun', focus: 90, fatigue: 20 },
  ];

  const subjectData = [
    { name: 'CS3042', hours: 12 },
    { name: 'BIO2012', hours: 8 },
    { name: 'CS2041', hours: 15 },
    { name: 'PHY101', hours: 5 },
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
        
        <div className={styles.headerBlock}>
          <h1 className={styles.pageTitle}>Detailed Analytics</h1>
          <p className={styles.pageSubtitle}>Track your learning performance and emotional state over time.</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>🎯</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>83%</div>
              <div className={styles.statLabel}>Avg Focus Score</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>⏱️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>40h</div>
              <div className={styles.statLabel}>Total Study Time</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>🎓</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>1,204</div>
              <div className={styles.statLabel}>Cards Mastered</div>
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Focus & Fatigue Trends (This Week)</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={emotionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="focus" name="Focus Level (%)" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="fatigue" name="Fatigue Level (%)" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Study Time by Subject</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={subjectData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="hours" name="Hours Studied" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
