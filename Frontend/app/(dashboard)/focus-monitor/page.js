'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
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

  // Determine Emotion Badge Style
  const stateBadgeClass = 
    focusData.emotion === 'Focused' ? styles.tagFocused :
    focusData.emotion === 'Bored' ? styles.tagBored :
    focusData.emotion === 'Confused' ? styles.tagConfused : styles.tagNeutral;

  // Safe percentage mapping
  const emotionProbData = [
    { name: 'Focused', value: focusData.probs?.Focused ?? 0, color: '#0F766E' },
    { name: 'Neutral', value: focusData.probs?.Neutral ?? 0, color: '#3B82F6' },
    { name: 'Confused', value: focusData.probs?.Confused ?? 0, color: '#F59E0B' },
    { name: 'Bored / Fatigue', value: focusData.probs?.Bored ?? 0, color: '#EF4444' },
  ];

  // If timeline is empty at start, provide a clean initial baseline point
  const chartTimelineData = (focusData.timeline && focusData.timeline.length > 0)
    ? focusData.timeline
    : [{ time: '00:00', attention: focusData.attentionScore || 85, fatigue: focusData.fatiguePct || 15 }];

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
              Real-time cognitive engagement, fatigue detection, and landmark telemetry (SLIIT R26-SE-022)
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
                    <span>📹</span> Live Facial Landmark Stream
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
                    <div className={styles.liveDot}></div> Background AI Stream
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

              {/* Right Column: Professional Cognitive Engagement & Real-Time Area Chart */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span>📈</span> Live Engagement & Attention Trend
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Continuously Synced
                  </span>
                </div>

                {/* State Banner with Clear Meaning */}
                <div className={styles.stateBanner}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>CURRENT STATE</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{focusData.emotion} State</div>
                  </div>
                  <span className={`${styles.stateTag} ${stateBadgeClass}`}>
                    ● {focusData.attentionScore >= 75 ? 'Optimal Flow' : focusData.attentionScore >= 50 ? 'Moderate Alertness' : 'Attention Dip'}
                  </span>
                </div>

                {/* Professional Glowing Area Gradient Chart */}
                <div style={{ width: '100%', height: 180, marginBottom: '1rem' }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartTimelineData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="attentionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="fatigueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`]} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                      <Area type="monotone" dataKey="attention" name="Attention Level (%)" stroke="#0F766E" strokeWidth={2.5} fillOpacity={1} fill="url(#attentionGradient)" />
                      <Area type="monotone" dataKey="fatigue" name="Fatigue Index (%)" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#fatigueGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 4 Professional Cognitive Telemetry Micro-Cards */}
                <div className={styles.cognitiveGrid}>
                  <div className={styles.cognitiveCard}>
                    <span className={styles.cogLabel}>Gaze Target</span>
                    <span className={styles.cogValue}>
                      {focusData.gazeStatus === "Looking Away" ? "👀 Away" : "🎯 Screen Center"}
                    </span>
                    <span className={styles.cogDesc}>Direct line of sight</span>
                  </div>

                  <div className={styles.cognitiveCard}>
                    <span className={styles.cogLabel}>Eye Openness (EAR)</span>
                    <span className={styles.cogValue}>
                      👁️ {focusData.ear ? focusData.ear.toFixed(2) : "0.25"}
                    </span>
                    <span className={styles.cogDesc}>Threshold: &gt; 0.165</span>
                  </div>

                  <div className={styles.cognitiveCard}>
                    <span className={styles.cogLabel}>Cognitive Flow</span>
                    <span className={styles.cogValue}>
                      {focusData.probs?.Focused ?? 0}%
                    </span>
                    <span className={styles.cogDesc}>High focus probability</span>
                  </div>

                  <div className={styles.cognitiveCard}>
                    <span className={styles.cogLabel}>Confusion / Strain</span>
                    <span className={styles.cogValue}>
                      {focusData.probs?.Confused ?? 0}%
                    </span>
                    <span className={styles.cogDesc}>Facial brow furrowing</span>
                  </div>
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
