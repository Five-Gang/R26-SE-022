'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const FocusContext = createContext(null);

export function FocusProvider({ children }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  
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

  // References to maintain current state inside event listeners & unloads
  const stateRef = useRef({ isMonitoring, sessionSeconds, focusData });
  useEffect(() => {
    stateRef.current = { isMonitoring, sessionSeconds, focusData };
  }, [isMonitoring, sessionSeconds, focusData]);

  // Safe Session Saver
  const saveSessionToStorage = useCallback((currentData, duration) => {
    if (duration < 3) return; // Skip trivial clicks
    try {
      const existing = JSON.parse(localStorage.getItem('auralearn_focus_sessions') || '[]');
      const newSession = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        label: `Session ${existing.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        durationSeconds: duration,
        avgAttention: currentData.attentionScore || 85,
        fatigueLevel: currentData.fatigueLevel || "Low",
        fatiguePct: currentData.fatiguePct || 20,
        blinkRate: currentData.blinkRate || currentData.totalBlinks || 16,
        dominantEmotion: currentData.emotion || "Focused",
        probs: currentData.probs || { Focused: 85, Neutral: 15, Confused: 0, Bored: 0 }
      };
      existing.push(newSession);
      if (existing.length > 25) existing.shift();
      localStorage.setItem('auralearn_focus_sessions', JSON.stringify(existing));
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
        const res = await fetch('http://localhost:8000/api/detect-emotion', {
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
    }}>
      {/* Background persistent invisible video and canvas */}
      <div style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: 1, height: 1 }} />
        <canvas ref={hiddenCanvasRef} style={{ width: 1, height: 1 }} />
      </div>

      {children}
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
