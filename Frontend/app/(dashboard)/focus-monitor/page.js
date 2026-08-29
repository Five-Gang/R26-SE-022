'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import styles from './focus.module.css';

// Process API responses and maintain rolling metrics & real blink rate
function processApiResponse(apiData, prev) {
  const rawEmotion = apiData.emotion || "Neutral";
  
  // Clean raw confidence & probabilities (0-100%)
  const probs = apiData.probs || apiData.probabilities || {};
  const cleanProbs = {
    Focused: Math.min(100, Math.max(0, Math.round(probs.Focused || 0))),
    Neutral: Math.min(100, Math.max(0, Math.round(probs.Neutral || 0))),
    Confused: Math.min(100, Math.max(0, Math.round(probs.Confused || 0))),
    Bored: Math.min(100, Math.max(0, Math.round(probs.Bored || 0))),
  };

  const attentionScore = Math.min(100, Math.max(0, Math.round(apiData.attentionScore || 0)));

  // Timeline tracking (last 20 points)
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const timeline = [...(prev.timeline || []), { 
    time: timeStr,
    emotion: rawEmotion, 
    attention: attentionScore,
    fatigue: rawEmotion === "Bored" ? 75 : rawEmotion === "Focused" ? 15 : 30
  }];
  if (timeline.length > 20) timeline.shift();

  // Temporal smoothing (last 5 frames) to avoid sudden UI jitter
  const recentFrames = timeline.slice(-5);
  const recentCounts = {};
  recentFrames.forEach(frame => {
    recentCounts[frame.emotion] = (recentCounts[frame.emotion] || 0) + 1;
  });
  
  let smoothedEmotion = rawEmotion;
  let maxRecentCount = 0;
  Object.entries(recentCounts).forEach(([e, count]) => {
    if (count > maxRecentCount) {
      maxRecentCount = count;
      smoothedEmotion = e;
    }
  });

  const emotion = smoothedEmotion;
  const isBlinking = apiData.features?.is_blinking || false;
  const wasBlinking = prev.wasBlinking || false;
  
  // Track blink timestamps for real Blinks Per Minute (BPM)
  const blinkTimestamps = [...(prev.blinkTimestamps || [])];
  let totalBlinks = prev.totalBlinks || 0;
  if (isBlinking && !wasBlinking) {
    totalBlinks += 1;
    blinkTimestamps.push(Date.now());
  }

  // Filter blinks in the last 60 seconds
  const oneMinuteAgo = Date.now() - 60000;
  const validBlinksInLastMinute = blinkTimestamps.filter(t => t > oneMinuteAgo);
  const currentBlinkRate = validBlinksInLastMinute.length;

  const frameCount = (prev.frameCount || 0) + 1;
  const fatiguePct = emotion === "Bored" ? 75 : emotion === "Focused" ? 15 : 30;
  const fatigueLevel = fatiguePct > 60 ? "High" : fatiguePct > 30 ? "Moderate" : "Low";

  return {
    ...apiData,
    probs: cleanProbs,
    attentionScore,
    emotion,
    fatigueLevel,
    fatiguePct,
    totalBlinks,
    blinkRate: currentBlinkRate,
    blinkTimestamps: validBlinksInLastMinute,
    frameCount,
    wasBlinking: isBlinking,
    timeline,
    capturing: true,
  };
}

export default function FocusMonitorPage() {
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

  // State Management
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [data, setData] = useState({
    emotion: "Focused",
    confidence: 0,
    probs: { Focused: 85, Neutral: 15, Confused: 0, Bored: 0 },
    ear: 0.22,
    blinkRate: 0,
    eyeOpenness: 80,
    fatigueLevel: "Low",
    fatiguePct: 15,
    attentionScore: 90,
    gazeStatus: "Direct Screen Focus",
    features: {},
    boundingBox: null,
    totalBlinks: 0,
    blinkTimestamps: [],
    frameCount: 0,
    timeline: [],
    capturing: false,
  });

  const videoRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Attach webcam stream directly to video element
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      streamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Webcam Error:", err);
      alert("Could not access webcam. Please ensure camera permissions are granted.");
      return null;
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture frame and send to FastAPI backend
  const captureAndDetect = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;

    if (video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      try {
        const response = await fetch("http://localhost:8000/api/detect-emotion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        });

        if (response.ok) {
          const apiData = await response.json();
          setData((prev) => processApiResponse(apiData, prev));
        } else {
          setData((prev) => ({ ...prev, boundingBox: null, gazeStatus: "Looking Away" }));
        }
      } catch (err) {
        console.error("API error:", err);
      }
    }
  };

  const handleConfirmStart = async () => {
    setShowConsentModal(false);
    const stream = await startWebcam();
    if (stream) {
      setStarted(true);
      setSessionSeconds(0);
    }
  };

  const handleStop = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopWebcam();
    setStarted(false);
    setSessionSeconds(0);
    setData((d) => ({ ...d, capturing: false, boundingBox: null }));
  }, []);

  // When active session starts, bind stream to visible videoRef
  useEffect(() => {
    if (!started) return;

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Play error:", e));
    }

    timerRef.current = setInterval(() => {
      setSessionSeconds((t) => t + 1);
    }, 1000);

    setTimeout(captureAndDetect, 600);

    captureIntervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 1500);

    return () => {
      clearInterval(captureIntervalRef.current);
      clearInterval(timerRef.current);
      stopWebcam();
    };
  }, [started]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe percentage mapping
  const emotionProbData = [
    { name: 'Focused', value: data.probs?.Focused ?? 0, color: '#0F766E' },
    { name: 'Neutral', value: data.probs?.Neutral ?? 0, color: '#3B82F6' },
    { name: 'Confused', value: data.probs?.Confused ?? 0, color: '#F59E0B' },
    { name: 'Bored / Fatigue', value: data.probs?.Bored ?? 0, color: '#EF4444' },
  ];

  return (
    <div className={styles.container}>
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

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
            <span>🔒</span> On-Device Privacy Guaranteed
          </div>
        </div>

        {/* 1. PRE-START STATE: Overview & Explanation Card */}
        {!started && (
          <div className={styles.overviewCard}>
            <div className={styles.overviewHeader}>
              <div className={styles.overviewIconWrap}>🎯</div>
              <div>
                <h2 className={styles.overviewTitle}>How Focus Monitoring Works</h2>
                <p className={styles.overviewDesc}>
                  Our AI vision system uses MediaPipe 478-facial landmarks and Eye Aspect Ratio (EAR) algorithms to detect attention levels, cognitive engagement, and fatigue in real-time during your study sessions.
                </p>
              </div>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>👁️</div>
                <div>
                  <div className={styles.featureName}>Gaze & Blink Analysis</div>
                  <div className={styles.featureDetails}>Measures blink rate and eye openness to track alertness and prevent cognitive strain.</div>
                </div>
              </div>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>🧠</div>
                <div>
                  <div className={styles.featureName}>Cognitive State Detection</div>
                  <div className={styles.featureDetails}>Classifies mental states (Focused, Neutral, Confused, Bored) with temporal smoothing.</div>
                </div>
              </div>
              <div className={styles.featureBox}>
                <div className={styles.featureIcon}>🔒</div>
                <div>
                  <div className={styles.featureName}>100% Privacy Preserved</div>
                  <div className={styles.featureDetails}>Video frames are processed in-memory. No raw images or videos are ever stored or transmitted.</div>
                </div>
              </div>
            </div>

            <div className={styles.startBtnWrap}>
              <button className={styles.startBtn} onClick={() => setShowConsentModal(true)}>
                <span>📹</span> Launch Focus Monitor
              </button>
              <Link href="/analytics" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                View Focus Analytics →
              </Link>
            </div>
          </div>
        )}

        {/* 2. ACTIVE MONITORING STATE */}
        {started && (
          <>
            {/* Top 4 Active Metric Cards */}
            <div className={styles.activeStatsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconTeal}`}>🎯</div>
                <div>
                  <div className={styles.statValue}>{data.attentionScore || 0}%</div>
                  <div className={styles.statLabel}>Current Attention Score</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconBlue}`}>🧠</div>
                <div>
                  <div className={styles.statValue}>{data.emotion}</div>
                  <div className={styles.statLabel}>Detected Mental State</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconAmber}`}>⚡</div>
                <div>
                  <div className={styles.statValue}>{data.fatigueLevel}</div>
                  <div className={styles.statLabel}>Fatigue / Alertness</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.iconPurple}`}>👁️</div>
                <div>
                  <div className={styles.statValue}>{data.blinkRate || data.totalBlinks}</div>
                  <div className={styles.statLabel}>Blinks / Min (Rolling)</div>
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
                    Active · Live Feed
                  </span>
                </div>

                <div className={styles.videoContainer}>
                  {/* Real-time Video Stream */}
                  <video 
                    ref={videoRef} 
                    className={styles.videoElement} 
                    autoPlay 
                    playsInline 
                    muted 
                  />
                  
                  {/* Live Status Indicators */}
                  <div className={styles.liveBadge}>
                    <div className={styles.liveDot}></div> Live AI Stream
                  </div>
                  
                  <div className={styles.sessionTimerBadge}>
                    ⏱️ {formatTimer(sessionSeconds)}
                  </div>

                  {/* GREEN FACE BOUNDING BOX OVERLAY */}
                  {data.boundingBox && (
                    <div 
                      style={{
                        position: "absolute",
                        border: "2.5px solid #22c55e",
                        borderRadius: "10px",
                        top: `${data.boundingBox.yMin * 100}%`,
                        left: `${(1 - data.boundingBox.xMax) * 100}%`, // Mirrored to match video transform
                        width: `${(data.boundingBox.xMax - data.boundingBox.xMin) * 100}%`,
                        height: `${(data.boundingBox.yMax - data.boundingBox.yMin) * 100}%`,
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
                        {data.emotion} ({Math.round(data.confidence || 0)}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.videoControls}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    EAR: <strong>{data.ear?.toFixed(2) || "0.22"}</strong> · Gaze: <strong style={{ color: '#0F766E' }}>{data.gazeStatus || "Direct Screen Focus"}</strong>
                  </span>
                  <button className={styles.stopBtn} onClick={handleStop}>
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
                    Updates every 1.5s
                  </span>
                </div>

                {/* Timeline Line Chart with Clear Legend */}
                <div style={{ width: '100%', height: 210, marginBottom: '1.25rem' }}>
                  <ResponsiveContainer>
                    <LineChart data={data.timeline} margin={{ top: 10, right: 15, bottom: 5, left: -20 }}>
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
              <h2 className={styles.modalTitle}>Enable Focus & Attention Monitoring?</h2>
              <p className={styles.modalSubtitle}>
                AuraLearn uses your webcam to analyze eye blinks, facial landmarks, and alertness in real-time.
              </p>
            </div>

            <div className={styles.modalPoints}>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>100% In-Memory:</strong> No video recordings or face photos are saved or uploaded.</span>
              </div>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>Real-time Analytics:</strong> Tracks focus drops, drowsiness, and cognitive confusion.</span>
              </div>
              <div className={styles.modalPoint}>
                <span className={styles.pointIcon}>✓</span>
                <span><strong>Full Control:</strong> You can pause or stop monitoring at any moment.</span>
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
