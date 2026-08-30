'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import styles from './analytics.module.css';

// Default baseline sessions
const DEFAULT_SESSIONS = [
  { id: 1, label: 'Session 1 (08:30)', timestamp: '2026-08-25T08:30:00Z', durationSeconds: 1200, focus: 88, fatigue: 15, blinkRate: 16, dominantEmotion: 'Focused' },
  { id: 2, label: 'Session 2 (10:15)', timestamp: '2026-08-26T10:15:00Z', durationSeconds: 1800, focus: 92, fatigue: 12, blinkRate: 14, dominantEmotion: 'Focused' },
  { id: 3, label: 'Session 3 (13:45)', timestamp: '2026-08-27T13:45:00Z', durationSeconds: 900, focus: 76, fatigue: 28, blinkRate: 22, dominantEmotion: 'Neutral' },
  { id: 4, label: 'Session 4 (15:30)', timestamp: '2026-08-28T15:30:00Z', durationSeconds: 1500, focus: 84, fatigue: 18, blinkRate: 17, dominantEmotion: 'Focused' },
  { id: 5, label: 'Session 5 (17:00)', timestamp: '2026-08-29T17:00:00Z', durationSeconds: 1350, focus: 90, fatigue: 14, blinkRate: 15, dominantEmotion: 'Focused' },
];

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

  // Dynamic state
  const [rawSessions, setRawSessions] = useState(DEFAULT_SESSIONS);
  const [sessionData, setSessionData] = useState(DEFAULT_SESSIONS.map(s => ({ session: s.label, focus: s.focus, fatigue: s.fatigue, blinkRate: s.blinkRate })));
  
  const [avgMetrics, setAvgMetrics] = useState({
    avgAttention: 86.0,
    avgFatigue: 17.4,
    avgBlinkRate: 16.8,
    totalMinutes: 112,
    totalSessionsCount: 5
  });

  const [emotionDistribution, setEmotionDistribution] = useState([
    { name: 'Focused / Flow', value: 65, color: '#0F766E' },
    { name: 'Neutral / Absorbing', value: 20, color: '#3B82F6' },
    { name: 'Confused / Processing', value: 10, color: '#F59E0B' },
    { name: 'Fatigued / Bored', value: 5, color: '#EF4444' },
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
  const [streakDays, setStreakDays] = useState(1);
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const DAILY_TARGET_MINS = 45; // Recommended optimal daily focused study target

  // Load and calculate analytics dynamically from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auralearn_focus_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRawSessions(parsed);

          // Format line chart data
          const formatted = parsed.map((s, idx) => ({
            session: s.label || `Session ${idx + 1}`,
            focus: s.avgAttention || 85,
            fatigue: s.fatiguePct || 20,
            blinkRate: s.blinkRate || 18,
          }));
          setSessionData(formatted);

          // Calculate aggregate metrics
          const sumAtt = parsed.reduce((acc, s) => acc + (s.avgAttention || 85), 0);
          const sumFat = parsed.reduce((acc, s) => acc + (s.fatiguePct || 20), 0);
          const sumBlink = parsed.reduce((acc, s) => acc + (s.blinkRate || 18), 0);
          const totalSecs = parsed.reduce((acc, s) => acc + (s.durationSeconds || 60), 0);

          setAvgMetrics({
            avgAttention: Number((sumAtt / parsed.length).toFixed(1)),
            avgFatigue: Number((sumFat / parsed.length).toFixed(1)),
            avgBlinkRate: Number((sumBlink / parsed.length).toFixed(1)),
            totalMinutes: Math.max(1, Math.round(totalSecs / 60)),
            totalSessionsCount: parsed.length
          });

          // 1. Calculate Real Consecutive Day Streak from actual timestamps
          const uniqueDates = [...new Set(parsed.map(s => {
            const d = s.timestamp ? new Date(s.timestamp) : new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }))].sort().reverse();

          let currentStreak = 0;
          const todayStr = new Date().toISOString().split('T')[0];
          
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
          const todaySessions = parsed.filter(s => {
            if (!s.timestamp) return true;
            const d = new Date(s.timestamp);
            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const todayLocal = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
            return localDateStr === todayLocal;
          });

          const todaySecs = todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 60), 0);
          // If total today is between 10s and 60s, show 1 min so it reflects immediately
          const todayMins = todaySecs > 10 && todaySecs < 60 ? 1 : Math.round(todaySecs / 60);
          setTodayFocusMinutes(todayMins);

          // Aggregate emotion distribution
          let totalFocused = 0, totalNeutral = 0, totalConfused = 0, totalBored = 0;
          parsed.forEach(s => {
            totalFocused += (s.probs?.Focused ?? 70);
            totalNeutral += (s.probs?.Neutral ?? 15);
            totalConfused += (s.probs?.Confused ?? 10);
            totalBored += (s.probs?.Bored ?? 5);
          });
          const grandTotal = (totalFocused + totalNeutral + totalConfused + totalBored) || 1;

          setEmotionDistribution([
            { name: 'Focused / Flow', value: Math.round((totalFocused / grandTotal) * 100), color: '#0F766E' },
            { name: 'Neutral / Absorbing', value: Math.round((totalNeutral / grandTotal) * 100), color: '#3B82F6' },
            { name: 'Confused / Processing', value: Math.round((totalConfused / grandTotal) * 100), color: '#F59E0B' },
            { name: 'Fatigued / Bored', value: Math.round((totalBored / grandTotal) * 100), color: '#EF4444' },
          ]);

          // Compute Hourly Peak Attention strictly from ACTUAL student recorded sessions
          const timeBuckets = {
            '8 AM': { total: 0, count: 0 },
            '10 AM': { total: 0, count: 0 },
            '12 PM': { total: 0, count: 0 },
            '2 PM': { total: 0, count: 0 },
            '4 PM': { total: 0, count: 0 },
            '7 PM': { total: 0, count: 0 },
            '9 PM': { total: 0, count: 0 },
          };

          parsed.forEach(s => {
            const date = s.timestamp ? new Date(s.timestamp) : new Date();
            const hour = date.getHours();
            const att = s.avgAttention || s.focus || 0;

            if (hour >= 6 && hour < 9) { timeBuckets['8 AM'].total += att; timeBuckets['8 AM'].count++; }
            else if (hour >= 9 && hour < 11) { timeBuckets['10 AM'].total += att; timeBuckets['10 AM'].count++; }
            else if (hour >= 11 && hour < 13) { timeBuckets['12 PM'].total += att; timeBuckets['12 PM'].count++; }
            else if (hour >= 13 && hour < 15) { timeBuckets['2 PM'].total += att; timeBuckets['2 PM'].count++; }
            else if (hour >= 15 && hour < 18) { timeBuckets['4 PM'].total += att; timeBuckets['4 PM'].count++; }
            else if (hour >= 18 && hour < 21) { timeBuckets['7 PM'].total += att; timeBuckets['7 PM'].count++; }
            else { timeBuckets['9 PM'].total += att; timeBuckets['9 PM'].count++; }
          });

          // Strictly return actual average if sessions exist in that time slot, otherwise 0
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
        }
      }
    } catch (e) {
      console.error("Error reading analytics from localStorage:", e);
    }
  }, []);

  const clearHistory = () => {
    if (confirm("Clear your recorded Focus Monitor session history?")) {
      localStorage.removeItem('auralearn_focus_sessions');
      setRawSessions(DEFAULT_SESSIONS);
      setSessionData(DEFAULT_SESSIONS.map(s => ({ session: s.label, focus: s.focus, fatigue: s.fatigue, blinkRate: s.blinkRate })));
      setAvgMetrics({
        avgAttention: 86.0,
        avgFatigue: 17.4,
        avgBlinkRate: 16.8,
        totalMinutes: 112,
        totalSessionsCount: 5
      });
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '< 1 min';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // PRINTABLE TEACHER / PARENT COGNITIVE REPORT GENERATOR
  const handleDownloadTeacherReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to generate the Teacher Cognitive Report.");
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AuraLearn - Student Cognitive Attention & Focus Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 40px; }
          .header { border-bottom: 2px solid #0F766E; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 700; color: #0F766E; margin: 0; }
          .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
          .meta { font-size: 12px; color: #475569; text-align: right; }
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
            <div><strong>Student ID:</strong> ST-9842 (Kasun M.)</div>
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
            <div class="metric-val">${avgMetrics.avgBlinkRate} /min</div>
            <div class="metric-lbl">Avg Alertness (BPM)</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgMetrics.totalSessionsCount}</div>
            <div class="metric-lbl">Recorded Sessions</div>
          </div>
        </div>

        <div class="section-title">Cognitive Engagement Summary</div>
        <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
          Student demonstrated a dominant <strong>Focused / Flow</strong> state during <strong>${emotionDistribution[0].value}%</strong> of total monitored study time. Eye Aspect Ratio (EAR) telemetry indicates optimal alertness with balanced cognitive strain.
        </p>

        <div class="section-title">Detailed Study Session History Logs</div>
        <table>
          <thead>
            <tr>
              <th>Session Label</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Avg Attention</th>
              <th>Fatigue Index</th>
              <th>Blink Rate</th>
              <th>Dominant Mental State</th>
            </tr>
          </thead>
          <tbody>
            ${rawSessions.slice().reverse().map(s => `
              <tr>
                <td><strong>${s.label || 'Study Session'}</strong></td>
                <td>${s.timestamp ? new Date(s.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today'}</td>
                <td>${formatDuration(s.durationSeconds)}</td>
                <td><strong>${s.avgAttention || s.focus || 85}%</strong></td>
                <td>${s.fatigueLevel || `${s.fatigue || 15}%`}</td>
                <td>${s.blinkRate || 18} /min</td>
                <td><span class="badge ${s.dominantEmotion === 'Focused' ? 'badge-focused' : 'badge-neutral'}">${s.dominantEmotion || 'Focused'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Confidential Teacher Cognitive Assessment Report · AuraLearn Real-Time Vision Analytics Engine · Verified On-Device
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
              Continuous longitudinal history tracking of student attention, fatigue, and eye behavior across multiple daily sessions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className={styles.btnExport}
              onClick={handleDownloadTeacherReport}
              title="Download clean Teacher / Parent cognitive report"
            >
              <span>📄</span> Export Teacher Report (PDF)
            </button>
            <button 
              onClick={clearHistory}
              style={{ backgroundColor: 'transparent', color: '#64748B', border: '1px solid #CBD5E1', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Reset History
            </button>
            <Link href="/focus-monitor" style={{ textDecoration: 'none' }}>
              <button style={{ backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📹</span> Launch Session
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
              Continuous longitudinal tracking across all monitored study sessions and materials.
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
              <div className={styles.statLabel}>Optimal Blink Rate</div>
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

        {/* 3. Charts Grid */}
        <div className={styles.chartsGrid}>
          
          {/* Chart 1: Focus vs Fatigue Over Sessions */}
          <div className={styles.chartCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={styles.chartTitle}>Focus Level vs. Fatigue Trends Over Sessions</h2>
              <span style={{ fontSize: '0.8rem', color: '#0F766E', fontWeight: 600 }}>
                ● Synced with Focus Monitor
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
                ● Real Session Time Distribution
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
              Showing {rawSessions.length} sessions
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
                  <th>Blink Rate</th>
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
                        <strong style={{ color: '#0F766E' }}>{session.avgAttention || session.focus || 85}%</strong>
                      </td>
                      <td>{session.fatigueLevel || `${session.fatigue || 15}%`}</td>
                      <td>{session.blinkRate || 18} /min</td>
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

      </main>
    </div>
  );
}
