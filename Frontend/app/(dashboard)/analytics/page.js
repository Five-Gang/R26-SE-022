'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { useSession } from '../../../components/auth/SessionGuard';
import styles from './analytics.module.css';

// Sample baseline dataset for demo/preview mode
const DEMO_SESSIONS = [
  { id: 1, label: 'Session 1 (08:30)', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), durationSeconds: 1200, avgAttention: 88, fatiguePct: 15, fatigueLevel: 'Low', blinkRate: 16, dominantEmotion: 'Focused', probs: { Focused: 80, Neutral: 15, Confused: 5, Bored: 0 } },
  { id: 2, label: 'Session 2 (10:15)', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), durationSeconds: 1800, avgAttention: 92, fatiguePct: 12, fatigueLevel: 'Low', blinkRate: 14, dominantEmotion: 'Focused', probs: { Focused: 85, Neutral: 10, Confused: 5, Bored: 0 } },
  { id: 3, label: 'Session 3 (13:45)', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), durationSeconds: 900, avgAttention: 76, fatiguePct: 28, fatigueLevel: 'Low', blinkRate: 22, dominantEmotion: 'Neutral', probs: { Focused: 50, Neutral: 35, Confused: 10, Bored: 5 } },
  { id: 4, label: 'Session 4 (15:30)', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), durationSeconds: 1500, avgAttention: 84, fatiguePct: 18, fatigueLevel: 'Low', blinkRate: 17, dominantEmotion: 'Focused', probs: { Focused: 75, Neutral: 15, Confused: 10, Bored: 0 } },
  { id: 5, label: 'Session 5 (17:00)', timestamp: new Date().toISOString(), durationSeconds: 1350, avgAttention: 90, fatiguePct: 14, fatigueLevel: 'Low', blinkRate: 15, dominantEmotion: 'Focused', probs: { Focused: 88, Neutral: 10, Confused: 2, Bored: 0 } },
];

export default function AnalyticsPage() {
  const pathname = usePathname();
  const { student } = useSession();

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

  // Dynamic user session state
  const [rawSessions, setRawSessions] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  
  const [avgMetrics, setAvgMetrics] = useState({
    avgAttention: 0,
    avgFatigue: 0,
    avgBlinkRate: 0,
    totalMinutes: 0,
    totalSessionsCount: 0
  });

  const [emotionDistribution, setEmotionDistribution] = useState([
    { name: 'Focused / Flow', value: 0, color: '#0F766E' },
    { name: 'Neutral / Absorbing', value: 0, color: '#3B82F6' },
    { name: 'Confused / Processing', value: 0, color: '#F59E0B' },
    { name: 'Fatigued / Bored', value: 0, color: '#EF4444' },
  ]);

  const [hourlyData, setHourlyData] = useState([
    { hour: '8 AM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '10 AM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '12 PM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '2 PM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '4 PM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '7 PM', score: 0, count: 0, status: 'No sessions yet' },
    { hour: '9 PM', score: 0, count: 0, status: 'No sessions yet' },
  ]);

  // Dynamic Self-Regulation & Streak State
  const [streakDays, setStreakDays] = useState(0);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);

  // Recalculate all metrics from a given array of sessions
  const processSessionMetrics = useCallback((sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      setRawSessions([]);
      setSessionData([]);
      setAvgMetrics({
        avgAttention: 0,
        avgFatigue: 0,
        avgBlinkRate: 0,
        totalMinutes: 0,
        totalSessionsCount: 0
      });
      setStreakDays(0);
      setTodayFocusMinutes(0);
      setEmotionDistribution([
        { name: 'Focused / Flow', value: 0, color: '#0F766E' },
        { name: 'Neutral / Absorbing', value: 0, color: '#3B82F6' },
        { name: 'Confused / Processing', value: 0, color: '#F59E0B' },
        { name: 'Fatigued / Bored', value: 0, color: '#EF4444' },
      ]);
      setHourlyData([
        { hour: '8 AM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '10 AM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '12 PM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '2 PM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '4 PM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '7 PM', score: 0, count: 0, status: 'No sessions yet' },
        { hour: '9 PM', score: 0, count: 0, status: 'No sessions yet' },
      ]);
      return;
    }

    setRawSessions(sessions);

    // Format line chart data
    const formatted = sessions.map((s, idx) => ({
      session: s.label || `Session ${idx + 1}`,
      focus: s.avgAttention ?? s.focus ?? 0,
      fatigue: s.fatiguePct ?? s.fatigue ?? 0,
      blinkRate: s.blinkRate ?? 0,
    }));
    setSessionData(formatted);

    // Calculate aggregate metrics
    const sumAtt = sessions.reduce((acc, s) => acc + (s.avgAttention ?? s.focus ?? 0), 0);
    const sumFat = sessions.reduce((acc, s) => acc + (s.fatiguePct ?? s.fatigue ?? 0), 0);
    const sumBlink = sessions.reduce((acc, s) => acc + (s.blinkRate ?? 0), 0);
    const totalSecs = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

    setAvgMetrics({
      avgAttention: Number((sumAtt / sessions.length).toFixed(1)),
      avgFatigue: Number((sumFat / sessions.length).toFixed(1)),
      avgBlinkRate: Number((sumBlink / sessions.length).toFixed(1)),
      totalMinutes: Math.max(1, Math.round(totalSecs / 60)),
      totalSessionsCount: sessions.length
    });

    // 1. Calculate Real Consecutive Day Streak from actual timestamps
    const uniqueDates = [...new Set(sessions.map(s => {
      const d = s.timestamp ? new Date(s.timestamp) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }))].sort().reverse();

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      currentStreak = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const d1 = new Date(uniqueDates[i]);
        const d2 = new Date(uniqueDates[i + 1]);
        const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    setStreakDays(currentStreak);

    // 2. Calculate Today's Total Monitored Study Flow (Minutes or Duration)
    const todayLocal = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const todaySessions = sessions.filter(s => {
      if (!s.timestamp) return false;
      const d = new Date(s.timestamp);
      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDateStr === todayLocal;
    });

    const todaySecs = todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const todayMins = todaySecs > 10 && todaySecs < 60 ? 1 : Math.round(todaySecs / 60);
    setTodayFocusMinutes(todayMins);

    // 3. Aggregate emotion distribution
    let totalFocused = 0, totalNeutral = 0, totalConfused = 0, totalBored = 0;
    sessions.forEach(s => {
      totalFocused += (s.probs?.Focused ?? (s.dominantEmotion === 'Focused' ? 75 : 20));
      totalNeutral += (s.probs?.Neutral ?? (s.dominantEmotion === 'Neutral' ? 60 : 15));
      totalConfused += (s.probs?.Confused ?? (s.dominantEmotion === 'Confused' ? 60 : 5));
      totalBored += (s.probs?.Bored ?? (s.dominantEmotion === 'Bored' ? 70 : 5));
    });
    const grandTotal = (totalFocused + totalNeutral + totalConfused + totalBored) || 1;

    setEmotionDistribution([
      { name: 'Focused / Flow', value: Math.round((totalFocused / grandTotal) * 100), color: '#0F766E' },
      { name: 'Neutral / Absorbing', value: Math.round((totalNeutral / grandTotal) * 100), color: '#3B82F6' },
      { name: 'Confused / Processing', value: Math.round((totalConfused / grandTotal) * 100), color: '#F59E0B' },
      { name: 'Fatigued / Bored', value: Math.round((totalBored / grandTotal) * 100), color: '#EF4444' },
    ]);

    // 4. Compute Hourly Peak Attention strictly from ACTUAL student recorded sessions
    const timeBuckets = {
      '8 AM': { total: 0, count: 0 },
      '10 AM': { total: 0, count: 0 },
      '12 PM': { total: 0, count: 0 },
      '2 PM': { total: 0, count: 0 },
      '4 PM': { total: 0, count: 0 },
      '7 PM': { total: 0, count: 0 },
      '9 PM': { total: 0, count: 0 },
    };

    sessions.forEach(s => {
      const date = s.timestamp ? new Date(s.timestamp) : new Date();
      const hour = date.getHours();
      const att = s.avgAttention ?? s.focus ?? 0;

      if (hour >= 6 && hour < 9) { timeBuckets['8 AM'].total += att; timeBuckets['8 AM'].count++; }
      else if (hour >= 9 && hour < 11) { timeBuckets['10 AM'].total += att; timeBuckets['10 AM'].count++; }
      else if (hour >= 11 && hour < 13) { timeBuckets['12 PM'].total += att; timeBuckets['12 PM'].count++; }
      else if (hour >= 13 && hour < 15) { timeBuckets['2 PM'].total += att; timeBuckets['2 PM'].count++; }
      else if (hour >= 15 && hour < 18) { timeBuckets['4 PM'].total += att; timeBuckets['4 PM'].count++; }
      else if (hour >= 18 && hour < 21) { timeBuckets['7 PM'].total += att; timeBuckets['7 PM'].count++; }
      else { timeBuckets['9 PM'].total += att; timeBuckets['9 PM'].count++; }
    });

    const dynamicHourly = Object.keys(timeBuckets).map(slot => {
      const bucket = timeBuckets[slot];
      const avg = bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0;
      return {
        hour: slot,
        score: avg,
        count: bucket.count,
        status: bucket.count > 0 ? `${bucket.count} session(s)` : 'No sessions yet'
      };
    });

    setHourlyData(dynamicHourly);
  }, []);

  // Load and calculate analytics dynamically from localStorage on mount & listen for real-time changes
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem('auralearn_focus_sessions');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            processSessionMetrics(parsed);
            return;
          }
        }
        processSessionMetrics([]);
      } catch (e) {
        console.error("Error reading analytics from localStorage:", e);
        processSessionMetrics([]);
      }
    };

    loadFromStorage();

    // Listen for storage changes and custom focus session save events
    window.addEventListener('focusSessionSaved', loadFromStorage);
    window.addEventListener('storage', loadFromStorage);

    return () => {
      window.removeEventListener('focusSessionSaved', loadFromStorage);
      window.removeEventListener('storage', loadFromStorage);
    };
  }, [processSessionMetrics]);

  // Load Demo Data for demonstration/evaluation
  const loadDemoData = () => {
    localStorage.setItem('auralearn_focus_sessions', JSON.stringify(DEMO_SESSIONS));
    processSessionMetrics(DEMO_SESSIONS);
  };

  // Clear session history
  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your personalized focus session history?")) {
      localStorage.removeItem('auralearn_focus_sessions');
      processSessionMetrics([]);
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '< 1 min';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // PRINTABLE PERSONALIZED TEACHER / PARENT COGNITIVE REPORT GENERATOR
  const handleDownloadTeacherReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to generate the Teacher Cognitive Report.");
      return;
    }

    const studentDisplayName = student?.name || 'Student';
    const studentIdentifier = student?.student_id || student?.email || 'ST-USER';
    const focusPercentage = emotionDistribution[0]?.value || 0;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AuraLearn - Cognitive Attention Report for ${studentDisplayName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 40px; }
          .header { border-bottom: 2px solid #0F766E; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 700; color: #0F766E; margin: 0; }
          .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
          .meta { font-size: 12px; color: #475569; text-align: right; line-height: 1.6; }
          .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .metric-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-val { font-size: 22px; font-weight: 700; color: #0F766E; }
          .metric-lbl { font-size: 11px; color: #64748B; text-transform: uppercase; margin-top: 4px; }
          .section-title { font-size: 15px; font-weight: 700; color: #1E293B; margin-bottom: 12px; border-left: 4px solid #0F766E; padding-left: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #F1F5F9; text-align: left; padding: 10px; border-bottom: 1px solid #CBD5E1; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
          .badge { padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 11px; display: inline-block; }
          .badge-focused { background: #DCFCE7; color: #16A34A; }
          .badge-neutral { background: #EFF6FF; color: #2563EB; }
          .badge-confused { background: #FEF3C7; color: #D97706; }
          .badge-bored { background: #FEE2E2; color: #DC2626; }
          .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 11px; color: #94A3B8; text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">AuraLearn · Student Cognitive & Attention Report</div>
            <div class="subtitle">SLIIT R26-SE-022 Research Project · Affect & Attention Aware Emotion Detection</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
            <div><strong>Student Name:</strong> ${studentDisplayName}</div>
            <div><strong>Student ID / Email:</strong> ${studentIdentifier}</div>
          </div>
        </div>

        <div class="summary-box">
          <div class="metric-card">
            <div class="metric-val">${avgMetrics.avgAttention}%</div>
            <div class="metric-lbl">Avg Attention Score</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgMetrics.avgFatigue}%</div>
            <div class="metric-lbl">Avg Cognitive Fatigue</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgMetrics.totalMinutes}m</div>
            <div class="metric-lbl">Total Study Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgMetrics.totalSessionsCount}</div>
            <div class="metric-lbl">Recorded Sessions</div>
          </div>
        </div>

        <div class="section-title">Cognitive Engagement Summary</div>
        <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
          ${studentDisplayName} has recorded <strong>${avgMetrics.totalSessionsCount}</strong> monitored study sessions (${avgMetrics.totalMinutes} total minutes). 
          During active sessions, the dominant state was <strong>Focused / Flow</strong> for <strong>${focusPercentage}%</strong> of monitored time.
        </p>

        <div class="section-title">Detailed Study Session History Logs</div>
        ${rawSessions.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Session Label</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Avg Attention</th>
                <th>Fatigue Index</th>
                <th>Dominant Mental State</th>
              </tr>
            </thead>
            <tbody>
              ${rawSessions.slice().reverse().map(s => `
                <tr>
                  <td><strong>${s.label || 'Study Session'}</strong></td>
                  <td>${s.timestamp ? new Date(s.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today'}</td>
                  <td>${formatDuration(s.durationSeconds)}</td>
                  <td><strong>${s.avgAttention ?? s.focus ?? 0}%</strong></td>
                  <td>${s.fatigueLevel || `${s.fatiguePct ?? s.fatigue ?? 0}%`}</td>
                  <td><span class="badge ${s.dominantEmotion === 'Focused' ? 'badge-focused' : s.dominantEmotion === 'Confused' ? 'badge-confused' : s.dominantEmotion === 'Bored' ? 'badge-bored' : 'badge-neutral'}">${s.dominantEmotion || 'Focused'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p style="font-size: 13px; color: #64748B; font-style: italic;">No session history recorded yet for this student.</p>
        `}

        <div class="footer">
          Confidential Student Cognitive Assessment Report · AuraLearn Real-Time Vision Analytics Engine · Verified On-Device
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const studentName = student?.name || 'Student';

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
              Personalized longitudinal attention tracking and cognitive telemetry for <strong>{studentName}</strong>.
            </p>
          </div>
          <div className={styles.headerActions}>
            {rawSessions.length > 0 && (
              <button 
                className={styles.btnExport}
                onClick={handleDownloadTeacherReport}
                title="Download clean Teacher / Parent cognitive report"
              >
                <span>📄</span> Export Teacher Report (PDF)
              </button>
            )}
            {rawSessions.length > 0 ? (
              <button 
                onClick={clearHistory}
                style={{ backgroundColor: 'transparent', color: '#64748B', border: '1px solid #CBD5E1', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                title="Clear all recorded session data"
              >
                Reset History
              </button>
            ) : (
              <button 
                onClick={loadDemoData}
                style={{ backgroundColor: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                title="Load sample baseline sessions for evaluation"
              >
                Load Sample Data
              </button>
            )}
            <Link href="/focus-monitor" style={{ textDecoration: 'none' }}>
              <button style={{ backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📹</span> Launch Focus Monitor
              </button>
            </Link>
          </div>
        </div>

        {/* 1. Dynamic Focus Activity & Streak Banner */}
        <div className={styles.goalBanner}>
          <div className={styles.goalInfo}>
            <div className={styles.goalTitle}>
              <span>🔥</span> Active Focus & Cognitive Streak
            </div>
            <div className={styles.goalDesc}>
              Personalized continuous tracking across all study sessions for {studentName}.
            </div>
          </div>

          <div className={styles.goalMetrics}>
            <div className={styles.streakBadge}>
              <span>⚡</span> {streakDays} Day{streakDays === 1 ? '' : 's'} Continuous Streak
            </div>
            <div className={styles.streakBadge} style={{ background: 'rgba(255, 255, 255, 0.15)' }}>
              <span>⏱️</span> Today&apos;s Focus: {todayFocusMinutes} min{todayFocusMinutes === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* 2. Top 4 Key Metric Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>🎯</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgMetrics.avgAttention}%</div>
              <div className={styles.statLabel}>Avg Attention Score ({avgMetrics.totalSessionsCount} Sessions)</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>⚡</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgMetrics.avgFatigue}%</div>
              <div className={styles.statLabel}>Avg Cognitive Fatigue</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>👁️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgMetrics.avgBlinkRate} /min</div>
              <div className={styles.statLabel}>Average Blink Rate</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconAmber}`}>⏱️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{avgMetrics.totalMinutes}m</div>
              <div className={styles.statLabel}>Total Monitored Time</div>
            </div>
          </div>
        </div>

        {/* 3. Empty State or Active Data Visualizations */}
        {rawSessions.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>📊</div>
            <h2 className={styles.emptyTitle}>No Focus Sessions Recorded Yet</h2>
            <p className={styles.emptyDesc}>
              Welcome, <strong>{studentName}</strong>! Start a study session with the webcam-powered Focus Monitor active to automatically track your real-time attention, blink rates, and fatigue patterns.
            </p>
            <div className={styles.emptyActions}>
              <Link href="/focus-monitor" className={styles.btnPrimary}>
                <span>📹</span> Start Focus Session
              </Link>
              <button onClick={loadDemoData} className={styles.btnSecondary}>
                Load Baseline Sample Data
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Charts Grid */}
            <div className={styles.chartsGrid}>
              
              {/* Chart 1: Focus vs Fatigue Over Sessions */}
              <div className={styles.chartCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className={styles.chartTitle}>Focus Level vs. Fatigue Trends Over Sessions</h2>
                  <span style={{ fontSize: '0.8rem', color: '#0F766E', fontWeight: 600 }}>
                    ● Synced with Your Live Sessions
                  </span>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={sessionData} margin={{ top: 10, right: 20, bottom: 5, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} formatter={(val) => [`${val}%`]} />
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
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} formatter={(v) => [`${v}%`]} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className={styles.chartTitle}>Peak Attention Scores by Time of Day</h2>
                  <span style={{ fontSize: '0.8rem', color: '#0EA5E9', fontWeight: 600 }}>
                    ● Based on Recorded Session Timestamps
                  </span>
                </div>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={hourlyData} margin={{ top: 10, right: 20, bottom: 5, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} unit="%" />
                      <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} formatter={(v) => [`${v}%`]} />
                      <Bar dataKey="score" name="Average Focus Score" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* 4. Complete Session History Log Table */}
            <div className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <h2 className={styles.chartTitle}>Recorded Session History Logs</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Showing {rawSessions.length} recorded session{rawSessions.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Session Label</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Avg Attention</th>
                      <th>Fatigue Level</th>
                      <th>Dominant State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawSessions.slice().reverse().map((session, index) => {
                      const dateStr = session.timestamp ? new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today';
                      const badgeClass = session.dominantEmotion === 'Focused' ? styles.badgeFocused : session.dominantEmotion === 'Bored' ? styles.badgeBored : session.dominantEmotion === 'Confused' ? styles.badgeConfused : styles.badgeNeutral;

                      return (
                        <tr key={session.id || index}>
                          <td style={{ fontWeight: 600 }}>{session.label || `Session ${index + 1}`}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{dateStr}</td>
                          <td>{formatDuration(session.durationSeconds)}</td>
                          <td>
                            <strong style={{ color: '#0F766E' }}>{session.avgAttention ?? session.focus ?? 0}%</strong>
                          </td>
                          <td>{session.fatigueLevel || `${session.fatiguePct ?? session.fatigue ?? 0}%`}</td>
                          <td>
                            <span className={`${styles.badge} ${badgeClass}`}>
                              ● {session.dominantEmotion || 'Focused'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
