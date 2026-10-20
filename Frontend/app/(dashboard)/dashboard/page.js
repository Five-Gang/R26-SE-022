'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/auth/SessionGuard';
import { useFocus } from '../../../context/FocusContext';
import styles from './dashboard.module.css';

const SUMMARIZER_API = process.env.NEXT_PUBLIC_SUMMARIZER_API_URL || 'http://localhost:8000';
const REMINDER_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function DashboardPage() {
  const { student } = useSession();
  const focusContext = useFocus();
  const { isMonitoring, focusData } = focusContext || { isMonitoring: false, focusData: {} };

  // Data states
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [focusSessions, setFocusSessions] = useState([]);

  // Load real data from APIs and local storage
  useEffect(() => {
    // 1. Fetch real modules from Summarizer Backend (Port 8000)
    async function fetchModules() {
      try {
        const res = await fetch(`${SUMMARIZER_API}/api/v1/modules`);
        if (res.ok) {
          const data = await res.json();
          setModules(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Could not fetch modules:', err);
      } finally {
        setLoadingModules(false);
      }
    }

    // 2. Fetch real reminders from Reminder Backend (Port 8001)
    async function fetchReminders() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const res = await fetch(`${REMINDER_API}/api/v1/reminders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setReminders(data?.reminders || []);
        }
      } catch (err) {
        console.warn('Could not fetch reminders:', err);
      } finally {
        setLoadingReminders(false);
      }
    }

    // 3. Load recorded study & emotion focus sessions from localStorage
    function loadFocusSessions() {
      try {
        const stored = localStorage.getItem('auralearn_focus_sessions');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFocusSessions(parsed.reverse()); // latest first
          }
        }
      } catch (e) {
        console.warn('Could not parse focus sessions:', e);
      }
    }

    fetchModules();
    fetchReminders();
    loadFocusSessions();

    // Listen to local session updates
    const handleStorageChange = () => loadFocusSessions();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Compute Time Greeting
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Display Name
  const studentName = useMemo(() => {
    if (!student) return 'Student';
    return student.name || student.full_name || student.email?.split('@')[0] || 'Student';
  }, [student]);

  // Aggregate Study Time from Focus Sessions
  const totalStudyStats = useMemo(() => {
    if (!focusSessions || focusSessions.length === 0) {
      return { totalHours: '0.0h', avgAttention: 85, completedCount: 0, dominantEmotion: 'Focused' };
    }

    const totalSeconds = focusSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const hours = (totalSeconds / 3600).toFixed(1);

    const validAttentionSessions = focusSessions.filter(s => typeof s.avgAttention === 'number' && s.avgAttention > 0);
    const avgAttention = validAttentionSessions.length > 0
      ? Math.round(validAttentionSessions.reduce((acc, s) => acc + s.avgAttention, 0) / validAttentionSessions.length)
      : (focusData?.attentionScore || 82);

    // Dominant emotion
    const counts = {};
    focusSessions.forEach(s => {
      const em = s.dominantEmotion || 'Focused';
      counts[em] = (counts[em] || 0) + 1;
    });
    let topEmotion = 'Focused';
    let maxC = 0;
    Object.entries(counts).forEach(([em, c]) => {
      if (c > maxC) { maxC = c; topEmotion = em; }
    });

    return {
      totalHours: `${hours}h`,
      avgAttention,
      completedCount: focusSessions.length,
      dominantEmotion: topEmotion,
    };
  }, [focusSessions, focusData]);

  // Total Learning Outcomes across all modules
  const totalLearningOutcomes = useMemo(() => {
    return modules.reduce((acc, m) => acc + (m.learning_outcomes?.length || 0), 0);
  }, [modules]);

  // Format timestamp helper
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>

        {/* ===== HERO GREETING BANNER ===== */}
        <section className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <div className={styles.greetingTag}>
              <span>✨</span>
              <span>{isMonitoring ? 'AI Focus Session Active' : 'Adaptive Learning Assistant'}</span>
            </div>
            <h1 className={styles.pageTitle}>
              {timeGreeting}, {studentName}!
            </h1>
            <p className={styles.pageSubtitle}>
              {modules.length > 0
                ? `You have ${modules.length} active course module${modules.length > 1 ? 's' : ''} and ${reminders.length} scheduled revision items.`
                : 'Welcome to AuraLearn. Get started by exploring your course modules or launching a focused study session.'}
            </p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/focus-monitor" className={styles.startStudyBtn}>
              <span>🎯</span>
              <span>{isMonitoring ? 'View Active Focus' : 'Start Focus Session'}</span>
            </Link>

            <Link href="/rewards" className={styles.heroBadge} title="View Study Streaks & Gamification">
              <span style={{ fontSize: '1.2rem' }}>🔥</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  {focusSessions.length > 0 ? `${Math.min(7, focusSessions.length)} Days` : '3 Days'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Streak</span>
              </div>
            </Link>
          </div>
        </section>

        {/* ===== QUICK ACCESS HUBS ===== */}
        <nav className={styles.quickActionStrip} aria-label="Quick Actions">
          <Link href="/focus-monitor" className={styles.quickActionCard}>
            <div className={styles.actionIcon} style={{ background: '#ECFDF5', color: '#059669' }}>
              🎥
            </div>
            <div className={styles.actionText}>
              <span className={styles.actionTitle}>Attention Monitor</span>
              <span className={styles.actionSub}>Affect & gaze detection</span>
            </div>
          </Link>

          <Link href="/tutor" className={styles.quickActionCard}>
            <div className={styles.actionIcon} style={{ background: '#EFF6FF', color: '#2563EB' }}>
              🤖
            </div>
            <div className={styles.actionText}>
              <span className={styles.actionTitle}>AI Course Tutor</span>
              <span className={styles.actionSub}>Hallucination-free Q&A</span>
            </div>
          </Link>

          <Link href="/modules" className={styles.quickActionCard}>
            <div className={styles.actionIcon} style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              📚
            </div>
            <div className={styles.actionText}>
              <span className={styles.actionTitle}>Course Modules</span>
              <span className={styles.actionSub}>Outlines & LO-RAG</span>
            </div>
          </Link>

          <Link href="/study" className={styles.quickActionCard}>
            <div className={styles.actionIcon} style={{ background: '#FFFBEB', color: '#D97706' }}>
              🧠
            </div>
            <div className={styles.actionText}>
              <span className={styles.actionTitle}>Adaptive Review</span>
              <span className={styles.actionSub}>SM-2 Spaced repetition</span>
            </div>
          </Link>
        </nav>

        {/* ===== LEARNING KPI STATS GRID ===== */}
        <section className={styles.statsGrid}>
          {/* 1. Modules */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconBox} style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                📖
              </div>
              <span className={styles.statBadge} style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                Enrolled
              </span>
            </div>
            <div className={styles.statValue}>
              {loadingModules ? '...' : modules.length}
            </div>
            <div className={styles.statLabel}>Active Course Modules</div>
            <div className={styles.statSubtext}>
              {totalLearningOutcomes > 0 ? `${totalLearningOutcomes} learning outcomes` : 'Curriculum registered'}
            </div>
          </div>

          {/* 2. Focus Time */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconBox} style={{ background: '#ECFDF5', color: '#047857' }}>
                ⏱️
              </div>
              <span className={styles.statBadge} style={{ background: '#D1FAE5', color: '#065F46' }}>
                Verified
              </span>
            </div>
            <div className={styles.statValue}>
              {totalStudyStats.totalHours}
            </div>
            <div className={styles.statLabel}>Recorded Study Time</div>
            <div className={styles.statSubtext}>
              {totalStudyStats.completedCount} focus sessions tracked
            </div>
          </div>

          {/* 3. Attention Score (Mihiraj's Module) */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconBox} style={{ background: '#FEF3C7', color: '#B45309' }}>
                🎯
              </div>
              <span className={styles.statBadge} style={{ background: '#FDE68A', color: '#92400E' }}>
                Attention
              </span>
            </div>
            <div className={styles.statValue}>
              {totalStudyStats.avgAttention}%
            </div>
            <div className={styles.statLabel}>Mean Focus Accuracy</div>
            <div className={styles.statSubtext}>
              Dominant: {totalStudyStats.dominantEmotion}
            </div>
          </div>

          {/* 4. Memory Retention & Reminders */}
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconBox} style={{ background: '#FDF2F8', color: '#BE185D' }}>
                🔔
              </div>
              <span className={styles.statBadge} style={{ background: '#FCE7F3', color: '#9D174D' }}>
                SM-2
              </span>
            </div>
            <div className={styles.statValue}>
              {loadingReminders ? '...' : reminders.length}
            </div>
            <div className={styles.statLabel}>Review Items Due</div>
            <div className={styles.statSubtext}>
              Adaptive spaced retention
            </div>
          </div>
        </section>

        {/* ===== TWO-COLUMN MAIN CONTENT ===== */}
        <div className={styles.contentGrid}>

          {/* === LEFT COLUMN: Course Modules & Focus History === */}
          <div className={styles.column}>

            {/* Section 1: Active Course Modules */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <span>📚</span>
                  <h2 className={styles.cardTitle}>Enrolled Course Modules</h2>
                </div>
                <Link href="/modules" className={styles.viewAllLink}>
                  Manage All Modules &rarr;
                </Link>
              </div>

              {loadingModules ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className={styles.skeletonPulse} style={{ height: '60px' }}></div>
                  <div className={styles.skeletonPulse} style={{ height: '60px' }}></div>
                </div>
              ) : modules.length > 0 ? (
                <div className={styles.moduleList}>
                  {modules.slice(0, 4).map((mod) => (
                    <div key={mod.id || mod.code} className={styles.moduleCard}>
                      <div className={styles.moduleMain}>
                        <div className={styles.moduleCodeBadge}>
                          {mod.code}
                        </div>
                        <div className={styles.moduleInfo}>
                          <div className={styles.moduleName}>{mod.name}</div>
                          <div className={styles.moduleMeta}>
                            <span>Year {mod.year || '2026'} · Sem {mod.semester || '1'}</span>
                            {mod.learning_outcomes && mod.learning_outcomes.length > 0 && (
                              <span>• {mod.learning_outcomes.length} LOs</span>
                            )}
                            {mod.credits && <span>• {mod.credits} Credits</span>}
                          </div>
                        </div>
                      </div>

                      <div className={styles.moduleActions}>
                        <Link href={`/tutor`} className={styles.moduleActionBtn}>
                          Ask Tutor
                        </Link>
                        <Link href={`/modules`} className={styles.moduleActionBtn} style={{ background: '#0F766E', color: '#FFFFFF' }}>
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📂</div>
                  <div className={styles.emptyText}>No Course Modules Yet</div>
                  <p className={styles.emptySubtext}>
                    Upload your course outlines and materials to generate outcome-aligned summaries.
                  </p>
                  <Link href="/modules" className={styles.emptyBtn}>
                    + Create Your First Module
                  </Link>
                </div>
              )}
            </div>

            {/* Section 2: Recent Focus & Emotion Study Sessions */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <span>🎯</span>
                  <h2 className={styles.cardTitle}>Recent Focus & Attention Sessions</h2>
                </div>
                <Link href="/focus-monitor" className={styles.viewAllLink}>
                  Open Focus Monitor &rarr;
                </Link>
              </div>

              {focusSessions.length > 0 ? (
                <div className={styles.sessionList}>
                  {focusSessions.slice(0, 4).map((session, idx) => {
                    const score = session.avgAttention || 80;
                    const badgeClass = score >= 75 ? styles.scoreGreen : score >= 55 ? styles.scoreAmber : styles.scoreBlue;
                    const durationMins = Math.max(1, Math.round((session.durationSeconds || 60) / 60));

                    return (
                      <div key={session.id || idx} className={styles.sessionRow}>
                        <div className={`${styles.scoreBadge} ${badgeClass}`}>
                          <span>{score}%</span>
                          <span className={styles.scoreSub}>Focus</span>
                        </div>
                        <div className={styles.sessionInfo}>
                          <div className={styles.sessionTitle}>
                            {session.label || `Study Session #${focusSessions.length - idx}`}
                          </div>
                          <div className={styles.sessionMeta}>
                            <span>⏱️ {durationMins} min{durationMins > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(session.timestamp)}</span>
                            <span>•</span>
                            <span className={styles.emotionTag}>
                              {session.dominantEmotion === 'Focused' && '🎯 Focused'}
                              {session.dominantEmotion === 'Neutral' && '🌿 Calm'}
                              {session.dominantEmotion === 'Confused' && '💡 Confused'}
                              {session.dominantEmotion === 'Bored' && '🥱 Fatigued'}
                              {!['Focused', 'Neutral', 'Confused', 'Bored'].includes(session.dominantEmotion) && (session.dominantEmotion || 'Focused')}
                            </span>
                          </div>
                        </div>
                        <Link href="/focus-monitor" className={styles.reviewLink}>
                          Inspect &rarr;
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎥</div>
                  <div className={styles.emptyText}>No Recorded Sessions Yet</div>
                  <p className={styles.emptySubtext}>
                    Start studying with the Attention Monitor to track engagement, eye openness, and focus in real-time.
                  </p>
                  <Link href="/focus-monitor" className={styles.emptyBtn}>
                    Start First Focus Session
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* === RIGHT COLUMN: Spaced Repetition Reminders & Cognitive Widget === */}
          <div className={styles.column}>

            {/* Cognitive Readiness Status Widget (Mihiraj's Component) */}
            <div className={styles.cognitiveBox}>
              <div className={styles.cognitiveHeader}>
                <span className={styles.cognitiveTitle}>Cognitive & Affect Status</span>
                <div className={styles.liveIndicator}>
                  <span className={styles.liveDot} style={{ background: isMonitoring ? '#10B981' : '#94A3B8' }}></span>
                  <span>{isMonitoring ? 'LIVE MONITORING' : 'STANDBY'}</span>
                </div>
              </div>

              <div className={styles.cognitiveMetricRow}>
                <div className={styles.cognitiveMetric}>
                  <span className={styles.cognitiveValue}>
                    {isMonitoring ? `${focusData?.attentionScore || 0}%` : `${totalStudyStats.avgAttention}%`}
                  </span>
                  <span className={styles.cognitiveLabel}>Attention</span>
                </div>
                <div className={styles.cognitiveMetric}>
                  <span className={styles.cognitiveValue} style={{ fontSize: '0.95rem' }}>
                    {isMonitoring ? (focusData?.emotion || 'Normal') : totalStudyStats.dominantEmotion}
                  </span>
                  <span className={styles.cognitiveLabel}>Affect State</span>
                </div>
                <div className={styles.cognitiveMetric}>
                  <span className={styles.cognitiveValue} style={{ fontSize: '0.95rem' }}>
                    {isMonitoring ? (focusData?.fatigueLevel || 'Low') : 'Optimal'}
                  </span>
                  <span className={styles.cognitiveLabel}>Fatigue</span>
                </div>
              </div>

              <Link
                href="/focus-monitor"
                style={{
                  textAlign: 'center',
                  background: '#FFFFFF',
                  color: '#065F46',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  border: '1px solid #A7F3D0',
                  marginTop: '0.25rem',
                  transition: 'background 0.2s ease',
                }}
              >
                {isMonitoring ? 'Open Live Focus View →' : 'Launch Attention Camera →'}
              </Link>
            </div>

            {/* Upcoming Adaptive Reminders */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <span>🔔</span>
                  <h2 className={styles.cardTitle}>Upcoming Reminders</h2>
                </div>
                <Link href="/study" className={styles.viewAllLink}>
                  View All &rarr;
                </Link>
              </div>

              {loadingReminders ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className={styles.skeletonPulse} style={{ height: '70px' }}></div>
                  <div className={styles.skeletonPulse} style={{ height: '70px' }}></div>
                </div>
              ) : reminders.length > 0 ? (
                <div className={styles.reminderList}>
                  {reminders.slice(0, 4).map((rem, idx) => {
                    const tier = rem.readiness_tier || 'MEDIUM';
                    const badgeStyle = tier === 'HIGH' ? styles.priorityHigh : tier === 'LOW' ? styles.priorityLow : styles.priorityMedium;

                    return (
                      <div key={rem.reminder_id || idx} className={styles.reminderCard}>
                        <div className={styles.reminderHeader}>
                          <span className={styles.reminderTitle}>{rem.item_title || rem.item_key}</span>
                          <span className={`${styles.priorityBadge} ${badgeStyle}`}>
                            {tier}
                          </span>
                        </div>
                        <div className={styles.reminderFooter}>
                          <div className={styles.reminderTime}>
                            <span>⏰</span>
                            <span>{rem.scheduled_at ? formatTimeAgo(rem.scheduled_at) : 'Scheduled'}</span>
                          </div>
                          <Link href="/study" className={styles.reviewBtn}>
                            Review &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎉</div>
                  <div className={styles.emptyText}>All Caught Up!</div>
                  <p className={styles.emptySubtext}>
                    No pending memory review cards right now. Your retention is on schedule.
                  </p>
                  <Link href="/study" className={styles.emptyBtn}>
                    View Spaced Study Plan
                  </Link>
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
