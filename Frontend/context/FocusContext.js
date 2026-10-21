'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// --- inline styles for the focus-prompt banner (no extra CSS file needed) ---
const promptStyles = {
  overlay: {
    position: 'fixed',
    bottom: '86px',          // sits just above the FloatingFocusWidget
    right: '24px',
    zIndex: 1100,
    animation: 'slideUpPrompt 0.35s ease-out',
  },
  banner: {
    background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(15,118,110,0.35)',
    padding: '1rem 1.25rem',
    minWidth: '320px',
    maxWidth: '360px',
    color: '#fff',
    fontFamily: 'inherit',
  },
  closeBtn: {
    position: 'absolute',
    top: '10px',
    right: '14px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '1.1rem',
    cursor: 'pointer',
    lineHeight: 1,
  },
  icon: { fontSize: '1.6rem', marginBottom: '0.3rem' },
  title: { margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700 },
  subtitle: { margin: '0 0 0.85rem', fontSize: '0.8rem', opacity: 0.85, lineHeight: 1.4 },
  actionsRow: { display: 'flex', gap: '0.6rem' },
  btnEnable: {
    flex: 1,
    background: '#fff',
    color: '#0F766E',
    border: 'none',
    borderRadius: '10px',
    padding: '0.45rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnDismiss: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    padding: '0.45rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

// --- inline styles for the global consent modal ---
const consentStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: 'rgba(15,23,42,0.50)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeInConsent 0.2s ease-out',
  },
  box: {
    background: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    padding: '2.25rem 2.5rem',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
    animation: 'fadeUpConsent 0.3s ease-out',
    position: 'relative',
    fontFamily: 'inherit',
  },
  iconWrap: {
    width: 60, height: 60,
    background: '#F0FDFA',
    border: '1px solid #CCFBF1',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.75rem',
    margin: '0 auto 1rem',
  },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.4rem' },
  subtitle: { fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5, margin: 0 },
  points: { display: 'flex', flexDirection: 'column', gap: '0.85rem', margin: '1.5rem 0' },
  point: { display: 'flex', alignItems: 'flex-start', gap: '0.7rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 },
  pointIcon: { color: '#0D9488', fontWeight: 700, flexShrink: 0, marginTop: '1px' },
  actions: { display: 'flex', gap: '0.85rem', marginTop: '0.5rem' },
  btnConfirm: {
    flex: 1,
    background: '#0D9488',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnCancel: {
    flex: 1,
    background: 'transparent',
    color: '#64748B',
    border: '1px solid #E2E8F0',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

/* Inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('__focus-prompt-kf__')) {
  const s = document.createElement('style');
  s.id = '__focus-prompt-kf__';
  s.textContent = [
    '@keyframes slideUpPrompt { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }',
    '@keyframes fadeInConsent { from{opacity:0} to{opacity:1} }',
    '@keyframes fadeUpConsent { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }',
  ].join(' ');
  document.head.appendChild(s);
}

const FocusContext = createContext(null);

export function FocusProvider({ children }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showFocusPrompt, setShowFocusPrompt] = useState(false);
  const promptTimerRef = useRef(null);

  /** Call this from any page (summary/flashcard/quiz generation) to show the banner */
  const triggerFocusPrompt = useCallback(() => {
    if (isMonitoring) return; // already running, no need to prompt
    setShowFocusPrompt(true);
    // Auto-dismiss after 12 seconds if user ignores it
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    promptTimerRef.current = setTimeout(() => setShowFocusPrompt(false), 12000);
  }, [isMonitoring]);

  const dismissFocusPrompt = useCallback(() => {
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    setShowFocusPrompt(false);
  }, []);
  
  // Real-time Detection State - STRICT 0-INIT STATE
  const [focusData, setFocusData] = useState({
    emotion: "Detecting...",
    confidence: 0,
    probs: { Focused: 0, Neutral: 0, Confused: 0, Bored: 0 },
    ear: 0,
    blinkRate: 0,
    eyeOpenness: 0,
    fatigueLevel: "Low",
    fatiguePct: 0,
    attentionScore: 0,
    gazeStatus: "Calibrating...",
    boundingBox: null,
    totalBlinks: 0,
    frameCount: 0,
    timeline: [],
  });

  const videoRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const captureIntervalRef = useRef(null);
  
  // Buffer to capture every processed frame during an active session for exact statistical calculation
  const sessionSamplesRef = useRef([]);

  // References to maintain current state inside event listeners & unloads
  const stateRef = useRef({ isMonitoring, sessionSeconds, focusData });
  useEffect(() => {
    stateRef.current = { isMonitoring, sessionSeconds, focusData };
  }, [isMonitoring, sessionSeconds, focusData]);

  // Safe Session Saver with Exact Statistical Aggregates
  const saveSessionToStorage = useCallback((currentData, duration) => {
    if (duration < 3) return; // Skip trivial clicks (< 3s)
    try {
      const samples = sessionSamplesRef.current || [];
      let calculatedAvgAttention = currentData.attentionScore || 0;
      let calculatedDominantEmotion = currentData.emotion || "Focused";
      let calculatedProbs = currentData.probs || { Focused: 0, Neutral: 0, Confused: 0, Bored: 0 };
      let calculatedFatiguePct = currentData.fatiguePct || 15;

      if (samples.length > 0) {
        // 1. Calculate true mean attention score
        const sumAtt = samples.reduce((acc, s) => acc + (s.attention || 0), 0);
        calculatedAvgAttention = Math.round(sumAtt / samples.length);

        // 2. Calculate true dominant emotion across all recorded frames
        const emotionCounts = {};
        samples.forEach(s => {
          const em = s.emotion || "Neutral";
          emotionCounts[em] = (emotionCounts[em] || 0) + 1;
        });
        let maxCount = 0;
        Object.entries(emotionCounts).forEach(([em, count]) => {
          if (count > maxCount) {
            maxCount = count;
            calculatedDominantEmotion = em;
          }
        });

        // 3. Calculate true emotion percentage distribution
        const totalSamples = samples.length;
        calculatedProbs = {
          Focused: Math.round(((emotionCounts["Focused"] || 0) / totalSamples) * 100),
          Neutral: Math.round(((emotionCounts["Neutral"] || 0) / totalSamples) * 100),
          Confused: Math.round(((emotionCounts["Confused"] || 0) / totalSamples) * 100),
          Bored: Math.round(((emotionCounts["Bored"] || 0) / totalSamples) * 100),
        };

        calculatedFatiguePct = calculatedDominantEmotion === "Bored" ? 75 : calculatedDominantEmotion === "Focused" ? 15 : 30;
      }

      const totalBlinks = currentData.totalBlinks || 0;
      const bpmRate = duration >= 60 ? Math.round((totalBlinks / duration) * 60) : totalBlinks;
      const fatigueLevel = calculatedFatiguePct > 60 ? "High" : calculatedFatiguePct > 30 ? "Moderate" : "Low";

      const existing = JSON.parse(localStorage.getItem('auralearn_focus_sessions') || '[]');
      const newSession = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        label: `Session ${existing.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        durationSeconds: duration,
        avgAttention: calculatedAvgAttention,
        fatigueLevel: fatigueLevel,
        fatiguePct: calculatedFatiguePct,
        blinkRate: bpmRate,
        totalBlinks: totalBlinks,
        dominantEmotion: calculatedDominantEmotion,
        probs: calculatedProbs,
        samplesCount: samples.length
      };

      existing.push(newSession);
      if (existing.length > 50) existing.shift();
      localStorage.setItem('auralearn_focus_sessions', JSON.stringify(existing));
      
      // Also dispatch a storage event for immediate cross-component reactivity
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('focusSessionSaved'));
      }
    } catch (e) {
      console.error("Auto-save session error:", e);
    }
  }, []);

  // Process and smooth API responses
  const processApiResponse = useCallback((apiData) => {
    setFocusData((prev) => {
      const rawEmotion = apiData.emotion || "Neutral";
      const probs = apiData.probs || apiData.probabilities || {};
      const cleanProbs = {
        Focused: Math.min(100, Math.max(0, Math.round(probs.Focused || 0))),
        Neutral: Math.min(100, Math.max(0, Math.round(probs.Neutral || 0))),
        Confused: Math.min(100, Math.max(0, Math.round(probs.Confused || 0))),
        Bored: Math.min(100, Math.max(0, Math.round(probs.Bored || 0))),
      };

      const attentionScore = Math.min(100, Math.max(0, Math.round(apiData.attentionScore || 0)));

      // Record sample in buffer for final session statistics calculation
      if (sessionSamplesRef.current) {
        sessionSamplesRef.current.push({
          attention: attentionScore,
          emotion: rawEmotion,
          probs: cleanProbs,
          ear: apiData.ear,
          timestamp: Date.now()
        });
      }

      // Timeline entry
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timeline = [...(prev.timeline || []), {
        time: timeStr,
        emotion: rawEmotion,
        attention: attentionScore,
        fatigue: rawEmotion === "Bored" ? 75 : rawEmotion === "Focused" ? 15 : 30
      }];
      if (timeline.length > 20) timeline.shift();

      // Temporal smoothing (last 5 frames)
      const recentFrames = timeline.slice(-5);
      const recentCounts = {};
      recentFrames.forEach(f => recentCounts[f.emotion] = (recentCounts[f.emotion] || 0) + 1);
      let smoothedEmotion = rawEmotion;
      let maxCount = 0;
      Object.entries(recentCounts).forEach(([e, c]) => {
        if (c > maxCount) { maxCount = c; smoothedEmotion = e; }
      });

      // EXACT ACCUMULATED BLINK COUNTING (Starts strictly at 0, increments +1 on every real blink)
      const isBlinking = apiData.features?.is_blinking || false;
      const wasBlinking = prev.wasBlinking || false;
      let totalBlinks = prev.totalBlinks || 0;

      // Real blink detected (Open -> Closed state change)
      if (isBlinking && !wasBlinking) {
        totalBlinks += 1;
      }

      // Calculate Blinks / Min:
      // In early session, show the true count. Once session crosses 1 min, show count per minute.
      const currentSecs = Math.max(1, stateRef.current.sessionSeconds || 1);
      let bpmRate = totalBlinks;
      if (currentSecs >= 60) {
        bpmRate = Math.round((totalBlinks / currentSecs) * 60);
      }

      const fatiguePct = smoothedEmotion === "Bored" ? 75 : smoothedEmotion === "Focused" ? 15 : 30;
      const fatigueLevel = fatiguePct > 60 ? "High" : fatiguePct > 30 ? "Moderate" : "Low";

      return {
        ...apiData,
        probs: cleanProbs,
        attentionScore,
        emotion: smoothedEmotion,
        fatigueLevel,
        fatiguePct,
        totalBlinks,
        blinkRate: bpmRate,
        frameCount: (prev.frameCount || 0) + 1,
        wasBlinking: isBlinking,
        timeline,
        capturing: true,
      };
    });
  }, []);

  // Frame Capture Function (every 500ms for continuous accuracy)
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !hiddenCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;

    if (video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_EMOTION_API_URL || 'http://localhost:8004'}/api/detect-emotion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData }),
        });
        if (res.ok) {
          const apiData = await res.json();
          processApiResponse(apiData);
        } else {
          setFocusData(p => ({ ...p, boundingBox: null, gazeStatus: "Looking Away" }));
        }
      } catch (err) {
        // Handled gracefully
      }
    }
  }, [processApiResponse]);

  // Start background monitoring
  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // Reset session samples buffer on new start
      sessionSamplesRef.current = [];
      
      // Reset all metrics to 0 on new start
      setFocusData({
        emotion: "Detecting...",
        confidence: 0,
        probs: { Focused: 0, Neutral: 0, Confused: 0, Bored: 0 },
        ear: 0,
        blinkRate: 0,
        eyeOpenness: 0,
        fatigueLevel: "Low",
        fatiguePct: 0,
        attentionScore: 0,
        gazeStatus: "Calibrating...",
        boundingBox: null,
        totalBlinks: 0,
        frameCount: 0,
        timeline: [],
      });
      setIsMonitoring(true);
      setSessionSeconds(0);
      return true;
    } catch (e) {
      console.error("Camera access error:", e);
      alert("Please grant webcam permission to enable Background Focus Monitoring.");
      return false;
    }
  }, []);

  // Stop monitoring & save session
  const stopMonitoring = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    saveSessionToStorage(stateRef.current.focusData, stateRef.current.sessionSeconds);
    setIsMonitoring(false);
    setSessionSeconds(0);
    setFocusData(p => ({ ...p, capturing: false, boundingBox: null }));
  }, [saveSessionToStorage]);

  // Handle active capture interval & timer
  useEffect(() => {
    if (!isMonitoring) return;

    timerRef.current = setInterval(() => {
      setSessionSeconds(s => s + 1);
    }, 1000);

    setTimeout(captureFrame, 300);
    captureIntervalRef.current = setInterval(captureFrame, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, [isMonitoring, captureFrame]);

  // AUTO-SAVE ON BROWSER TAB CLOSE / NAVIGATE AWAY
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stateRef.current.isMonitoring && stateRef.current.sessionSeconds >= 3) {
        saveSessionToStorage(stateRef.current.focusData, stateRef.current.sessionSeconds);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [saveSessionToStorage]);

  const handleEnableFromPrompt = useCallback(async () => {
    dismissFocusPrompt();
    setShowConsentModal(true);
  }, [dismissFocusPrompt]);

  const handleConfirmConsent = useCallback(async () => {
    setShowConsentModal(false);
    await startMonitoring();
  }, [startMonitoring]);

  const handleCancelConsent = useCallback(() => {
    setShowConsentModal(false);
  }, []);

  return (
    <FocusContext.Provider value={{
      isMonitoring,
      sessionSeconds,
      focusData,
      showConsentModal,
      setShowConsentModal,
      startMonitoring,
      stopMonitoring,
      videoRef,
      triggerFocusPrompt,
    }}>
      {/* Background persistent invisible video and canvas */}
      <div style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: 1, height: 1 }} />
        <canvas ref={hiddenCanvasRef} style={{ width: 1, height: 1 }} />
      </div>

      {children}

      {/* ---- Focus-monitor prompt banner ---- */}
      {showFocusPrompt && (
        <div style={promptStyles.overlay}>
          <div style={{ ...promptStyles.banner, position: 'relative' }}>
            <button style={promptStyles.closeBtn} onClick={dismissFocusPrompt} aria-label="Dismiss">✕</button>
            <div style={promptStyles.icon}>🎯</div>
            <p style={promptStyles.title}>Enable Background Focus Monitoring?</p>
            <p style={promptStyles.subtitle}>
              AuraLearn can track your attention &amp; fatigue while you study — running silently in the background without interrupting you.
            </p>
            <div style={promptStyles.actionsRow}>
              <button style={promptStyles.btnEnable} onClick={handleEnableFromPrompt}>
                📹 Enable Monitor
              </button>
              <button style={promptStyles.btnDismiss} onClick={dismissFocusPrompt}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Global Consent Modal ---- */}
      {showConsentModal && (
        <div style={consentStyles.overlay} onClick={(e) => e.target === e.currentTarget && handleCancelConsent()}>
          <div style={consentStyles.box}>
            <div style={consentStyles.header}>
              <div style={consentStyles.iconWrap}>👁️</div>
              <h2 style={consentStyles.title}>Enable Background Focus Monitoring?</h2>
              <p style={consentStyles.subtitle}>
                AuraLearn will monitor your eye behaviour, alertness, and focus in the background while you study anywhere in the app.
              </p>
            </div>
            <div style={consentStyles.points}>
              <div style={consentStyles.point}>
                <span style={consentStyles.pointIcon}>✓</span>
                <span><strong>Persistent Background Tracking:</strong> Continues running smoothly as you switch between study pages.</span>
              </div>
              <div style={consentStyles.point}>
                <span style={consentStyles.pointIcon}>✓</span>
                <span><strong>Auto-Save on Tab Close:</strong> If you exit or close the browser, your session is automatically logged.</span>
              </div>
              <div style={consentStyles.point}>
                <span style={consentStyles.pointIcon}>✓</span>
                <span><strong>100% In-Memory Privacy:</strong> No photos or recordings are ever saved or uploaded.</span>
              </div>
            </div>
            <div style={consentStyles.actions}>
              <button style={consentStyles.btnConfirm} onClick={handleConfirmConsent}>
                Allow &amp; Start Session
              </button>
              <button style={consentStyles.btnCancel} onClick={handleCancelConsent}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
