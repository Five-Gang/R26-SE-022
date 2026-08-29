'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useFocus } from '../../../context/FocusContext';
import styles from './focus.module.css';

export default function FocusMonitorPage() {
  const pathname = usePathname();
  const { 
    isMonitoring, 
    sessionSeconds, 
    focusData, 
    startMonitoring, 
    stopMonitoring,
    showConsentModal,
    setShowConsentModal,
    videoRef
  } = useFocus();

  const [localVideoConnected, setLocalVideoConnected] = useState(false);

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

  const handleConfirmStart = async () => {
    setShowConsentModal(false);
    await startMonitoring();
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe percentage mapping
  const emotionProbData = [
    { name: 'Focused', value: focusData.probs?.Focused ?? 0, color: '#0F766E' },
    { name: 'Neutral', value: focusData.probs?.Neutral ?? 0, color: '#3B82F6' },
    { name: 'Confused', value: focusData.probs?.Confused ?? 0, color: '#F59E0B' },
    { name: 'Bored / Fatigue', value: focusData.probs?.Bored ?? 0, color: '#EF4444' },
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

      {/* Main Workspace */}
      <main className={styles.main}>
        
        {/* Header Title */}
        <div className={styles.headerBlock}>
          <div>
            <h1 className={styles.pageTitle}>Focus & Attention Monitor</h1>
            <p className={styles.pageSubtitle}>
              Real-time privacy-preserving student engagement and fatigue detection (SLIIT R26-SE-022)
            </p>
          </div>
          <div className={styles.privacyBadge}>
            <span>🔒</span> Persistent Background AI Active
          </div>
        </div>

        {/* 1. PRE-START STATE: Overview & Explanation Card */}
        {!isMonitoring && (
          <div className={styles.overviewCard}>
            <div className={styles.overviewHeader}>
              <div className={styles.overviewIconWrap}>🎯</div>
              <div>
                <h2 className={styles.overviewTitle}>How Background Focus Monitoring Works</h2>
                <p className={styles.overviewDesc}>
                  When you activate monitoring, AuraLearn operates quietly in the background while you study Flashcards, Quizzes, or Materials across the entire platform.
                </p>
              </div>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>🌐</div>
                <div>
                  <div className={styles.featureName}>Full-App Continuity</div>
                  <div className={styles.featureDetails}>Navigate to Study, AI Tutor, or Materials without interrupting your live focus tracking.</div>
                </div>
              </div>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>💾</div>
                <div>
                  <div className={styles.featureName}>Auto-Save on Exit</div>
                  <div className={styles.featureDetails}>If you close your browser or navigate away, your session metrics are automatically saved into Analytics.</div>
                </div>
              </div>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>🔒</div>
                <div>
                  <div className={styles.featureName}>100% In-Memory Privacy</div>
                  <div className={styles.featureDetails}>Frames are processed in real-time. No video files or photos are ever saved or uploaded.</div>
                </div>
              </div>
            </div>

            <div className={styles.startBtnWrap}>
              <button className={styles.startBtn} onClick={() => setShowConsentModal(true)}>
                <span>📹</span> Launch Background Monitor
              </button>
              <Link href="/analytics" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                View Focus Analytics →
              </Link>
            </div>
          </div>
        )}

        {/* 2. ACTIVE MONITORING STATE */}
        {isMonitoring && (
          <>
            {/* Top 4 Active Metric Cards */}
            <div className={styles.activeStatsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconTeal}`}>🎯</div>
                <div>
                  <div className={styles.statValue}>{focusData.attentionScore || 0}%</div>
                  <div className={styles.statLabel}>Current Attention Score</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconBlue}`}>🧠</div>
                <div>
                  <div className={styles.statValue}>{focusData.emotion}</div>
                  <div className={styles.statLabel}>Detected Mental State</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconAmber}`}>⚡</div>
                <div>
                  <div className={styles.statValue}>{focusData.fatigueLevel}</div>
                  <div className={styles.statLabel}>Fatigue / Alertness</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconPurple}`}>👁️</div>
                <div>
                  <div className={styles.statValue}>{focusData.totalBlinks ?? 0}</div>
                  <div className={styles.statLabel}>Blinks Detected ({focusData.blinkRate ?? 0} /min)</div>
                </div>
              </div>
            </div>

            {/* Main Center Stage: Live Feed + Charts */}
            <div className={styles.monitoringGrid}>
              
              {/* Left Column: Live Camera Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span>📹</span> Live Landmark Feed
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                    Active Background AI
                  </span>
                </div>

                <div className={styles.videoContainer}>
                  {/* Real-time Video Stream (Refers to persistent video in Provider) */}
                  <video 
                    ref={(el) => {
                      if (el && videoRef.current && videoRef.current.srcObject && el.srcObject !== videoRef.current.srcObject) {
                        el.srcObject = videoRef.current.srcObject;
                        el.play().catch(() => {});
                      }
                    }} 
                    className={styles.videoElement} 
                    autoPlay 
                    playsInline 
                    muted 
                  />
                  
                  {/* Live Status Indicators */}
                  <div className={styles.liveBadge}>
                    <div className={styles.liveDot}></div> Background Live Stream
                  </div>
                  
                  <div className={styles.sessionTimerBadge}>
                    ⏱️ {formatTimer(sessionSeconds)}
                  </div>

                  {/* GREEN FACE BOUNDING BOX OVERLAY */}
                  {focusData.boundingBox && (
                    <div 
                      style={{
                        position: "absolute",
                        border: "2.5px solid #22c55e",
                        borderRadius: "10px",
                        top: `${focusData.boundingBox.yMin * 100}%`,
                        left: `${(1 - focusData.boundingBox.xMax) * 100}%`,
                        width: `${(focusData.boundingBox.xMax - focusData.boundingBox.xMin) * 100}%`,
                        height: `${(focusData.boundingBox.yMax - focusData.boundingBox.yMin) * 100}%`,
                        boxShadow: "0 0 18px rgba(34, 197, 94, 0.6)",
                        pointerEvents: "none",
                        transition: "all 0.15s ease-out",
                        zIndex: 10
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '0px',
                        backgroundColor: '#22c55e',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px'
                      }}>
                        {focusData.emotion} ({Math.round(focusData.confidence || 0)}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.videoControls}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    EAR: <strong>{focusData.ear?.toFixed(2) || "0.22"}</strong> · Gaze: <strong style={{ color: '#0F766E' }}>{focusData.gazeStatus || "Direct Screen Focus"}</strong>
                  </span>
                  <button className={styles.stopBtn} onClick={stopMonitoring}>
                    ⏹️ Stop Monitoring
                  </button>
                </div>
              </div>

              {/* Right Column: Live Attention Trend & Mental States */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span>📈</span> Attention & Fatigue Trend
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Updates continuously
                  </span>
                </div>

                {/* Timeline Line Chart with Clear Legend */}
                <div style={{ width: '100%', height: 210, marginBottom: '1.25rem' }}>
                  <ResponsiveContainer>
                    <LineChart data={focusData.timeline} margin={{ top: 10, right: 15, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`]} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                      <Line type="monotone" dataKey="attention" name="Attention Score (%)" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="fatigue" name="Fatigue Level (%)" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Model Confidence Breakdown (0% - 100%) */}
                <div className={styles.cardTitle} style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>
                  <span>📊</span> Model Emotion Probabilities (0 - 100%)
                </div>

                <div className={styles.metricsList}>
                  {emotionProbData.map((item) => (
                    <div key={item.name} className={styles.metricRow}>
                      <div className={styles.metricMeta}>
                        <span>{item.name}</span>
                        <strong style={{ color: 'var(--color-primary)' }}>{item.value}%</strong>
                      </div>
                      <div className={styles.progressTrack}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </>
        )}

      </main>

      {/* 3. POPUP MODAL: Interactive Consent / Confirmation Dialog */}
      {showConsentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}>👁️</div>
              <h2 className={styles.modalTitle}>Enable Background Focus Monitoring?</h2>
              <p className={styles.modalSubtitle}>
                AuraLearn will monitor your eye behavior, alertness, and focus in the background while you study anywhere in the app.
              </p>
            </div>

            <div className={styles.modalPoints}>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>Persistent Background Tracking:</strong> Continues running smoothly as you switch between study pages.</span>
              </div>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>Auto-Save on Tab Close:</strong> If you exit or close the browser, your session is automatically logged.</span>
              </div>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>100% In-Memory Privacy:</strong> No photos or recordings are ever saved or uploaded.</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnConfirm} onClick={handleConfirmStart}>
                Allow & Start Session
              </button>
              <button className={styles.btnCancel} onClick={() => setShowConsentModal(false)}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
