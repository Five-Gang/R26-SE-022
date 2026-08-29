'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Study', path: '/study', icon: '📚' },
    { name: 'Focus Monitor', path: '/focus-monitor', icon: '🎯' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Rewards', path: '/rewards', icon: '🏆' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  // Attention & Fatigue Trend over weekly study sessions
  const focusFatigueData = [
    { session: 'Mon AM', focus: 82, fatigue: 18, blinkRate: 18 },
    { session: 'Mon PM', focus: 74, fatigue: 32, blinkRate: 24 },
    { session: 'Tue AM', focus: 88, fatigue: 14, blinkRate: 16 },
    { session: 'Wed PM', focus: 65, fatigue: 45, blinkRate: 32 },
    { session: 'Thu AM', focus: 91, fatigue: 12, blinkRate: 15 },
    { session: 'Fri AM', focus: 86, fatigue: 20, blinkRate: 19 },
    { session: 'Sat PM', focus: 78, fatigue: 28, blinkRate: 22 },
  ];

  // Real Emotion & Cognitive State Distribution (% of total study time)
  const emotionDistribution = [
    { name: 'Focused / Flow', value: 58, color: '#0F766E' },
    { name: 'Neutral / Absorbing', value: 24, color: '#3B82F6' },
    { name: 'Confused / Processing', value: 11, color: '#F59E0B' },
    { name: 'Fatigued / Bored', value: 7, color: '#EF4444' },
  ];

  // Hourly Average Focus Score
  const hourlyFocusData = [
    { hour: '8 AM', score: 85 },
    { hour: '10 AM', score: 92 },
    { hour: '12 PM', score: 78 },
    { hour: '2 PM', score: 68 },
    { hour: '4 PM', score: 74 },
    { hour: '7 PM', score: 88 },
    { hour: '9 PM', score: 81 },
  ];

  return (
    <div className={styles.container}>
      
      {/* Sidebar Navigation */}
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

      {/* Main Analytics Content */}
      <main className={styles.main}>
        
        <div className={styles.headerBlock}>
          <div>
            <h1 className={styles.pageTitle}>Focus & Cognitive Analytics</h1>
            <p className={styles.pageSubtitle}>
              Detailed reports derived from real-time facial landmark and eye-behavior monitoring.
            </p>
          </div>
          <Link href="/focus-monitor" style={{ textDecoration: 'none' }}>
            <button style={{ backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📹</span> Live Focus Monitor
            </button>
          </Link>
        </div>

        {/* Top Metric Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>🎯</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>83.4%</div>
              <div className={styles.statLabel}>Avg Attention Index</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>⚡</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>Low (21%)</div>
              <div className={styles.statLabel}>Avg Cognitive Fatigue</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>👁️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>18.5 /min</div>
              <div className={styles.statLabel}>Optimal Blink Rate</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className={styles.chartsGrid}>
          
          {/* Chart 1: Focus vs Fatigue Over Sessions */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Focus Level vs. Cognitive Fatigue Trends</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={focusFatigueData} margin={{ top: 10, right: 20, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} />
                  <Legend wrapperStyle={{ paddingTop: '15px' }} />
                  <Line type="monotone" dataKey="focus" name="Attention Score (%)" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="fatigue" name="Fatigue Level (%)" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Emotion & Cognitive State Breakdown */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Mental State Time Distribution</h2>
            <div style={{ display: 'flex', alignItems: 'center', height: 280 }}>
              <div style={{ width: '55%', height: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={emotionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                      {emotionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                {emotionDistribution.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.color, flexShrink: 0 }}></div>
                    <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{item.name}</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: Peak Focus Time of Day */}
          <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
            <h2 className={styles.chartTitle}>Peak Attention Scores by Time of Day</h2>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={hourlyFocusData} margin={{ top: 10, right: 20, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  <Bar dataKey="score" name="Average Focus Score" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
