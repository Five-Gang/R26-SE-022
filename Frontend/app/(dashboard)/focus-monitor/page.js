'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useFocus } from '../../../context/FocusContext';
import styles from './focus.module.css';

export default function FocusMonitorPage() {
  const { 
    isMonitoring, 
    sessionSeconds, 
    focusData, 
    stopMonitoring,
    setShowConsentModal,
    videoRef
  } = useFocus();

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
                    />
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

              {/* Right Column: Cognitive Telemetry Cards */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span>🧠</span> Live Cognitive Telemetry
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Continuously Synced
                  </span>
                </div>

                {/* 4 Cognitive Telemetry Micro-Cards */}
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

    </div>
  );

}
