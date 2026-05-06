"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import ConsentScreen from "./components/ConsentScreen";
import Dashboard from "./components/Dashboard";

// Simulates the emotion detection pipeline outputs
// In production, this would be replaced with actual MediaPipe + ML model calls
function simulateDetection(prev) {
  const emotions = ["Focused", "Neutral", "Confused", "Frustrated", "Bored"];
  const weights = [0.35, 0.25, 0.15, 0.1, 0.15]; // weighted random

  // Pick emotion based on weighted random with some temporal smoothing
  let emotion = prev.emotion || "Neutral";
  if (Math.random() < 0.3) {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < emotions.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        emotion = emotions[i];
        break;
      }
    }
  }

  // Generate probability distribution
  const rawProbs = {};
  let sum = 0;
  emotions.forEach((e) => {
    const base = e === emotion ? 50 + Math.random() * 30 : Math.random() * 20;
    rawProbs[e] = base;
    sum += base;
  });
  const probs = {};
  emotions.forEach((e) => {
    probs[e] = Math.round((rawProbs[e] / sum) * 100);
  });

  const confidence = probs[emotion];

  // Eye metrics
  const ear = 0.2 + Math.random() * 0.2;
  const blinkRate = Math.floor(10 + Math.random() * 20);
  const eyeOpenness = Math.round(50 + Math.random() * 50);
  const fatiguePct = emotion === "Bored" ? 60 + Math.random() * 30 : emotion === "Focused" ? 5 + Math.random() * 15 : 20 + Math.random() * 30;
  const fatigueLevel = fatiguePct > 60 ? "High" : fatiguePct > 35 ? "Medium" : "Low";

  // Attention score
  const attentionBase = { Focused: 85, Neutral: 60, Confused: 45, Frustrated: 35, Bored: 20 };
  const attentionScore = Math.round(Math.min(100, Math.max(0, attentionBase[emotion] + (Math.random() - 0.5) * 20)));

  // Feature vector
  const features = {
    eyeOpenness: ear * 2.5,
    eyebrowDist: 0.3 + Math.random() * 0.4,
    mouthOpening: emotion === "Frustrated" ? 0.3 + Math.random() * 0.3 : Math.random() * 0.15,
    headTilt: (Math.random() - 0.5) * 0.3,
    blinkRate: blinkRate / 30,
    earLeft: ear + (Math.random() - 0.5) * 0.05,
    earRight: ear + (Math.random() - 0.5) * 0.05,
    gazeDir: (Math.random() - 0.5) * 0.5,
  };

  // Emotion embedding (5D vector)
  const embedding = emotions.map((e) => probs[e] / 100);

  // Pipeline step cycles 0-6
  const pipelineStep = (prev.pipelineStep + 1) % 7;

  const frameCount = (prev.frameCount || 0) + 1;
  const totalBlinks = (prev.totalBlinks || 0) + (Math.random() < 0.3 ? 1 : 0);

  // Dominant emotion tracking
  const emotionCounts = { ...(prev.emotionCounts || {}) };
  emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  let dominantEmotion = "Neutral";
  let maxCount = 0;
  Object.entries(emotionCounts).forEach(([e, c]) => {
    if (c > maxCount) { maxCount = c; dominantEmotion = e; }
  });

  const attentionHistory = [...(prev.attentionHistory || []), attentionScore];
  const avgAttention = Math.round(attentionHistory.reduce((a, b) => a + b, 0) / attentionHistory.length);

  const timeline = [...(prev.timeline || []), { emotion, timestamp: Date.now() }];

  return {
    emotion,
    confidence,
    probs,
    ear,
    blinkRate,
    eyeOpenness,
    fatigueLevel,
    fatiguePct: Math.round(fatiguePct),
    attentionScore,
    features,
    embedding,
    pipelineStep,
    frameCount,
    totalBlinks,
    dominantEmotion,
    avgAttention,
    attentionHistory,
    emotionCounts,
    timeline,
    capturing: true,
  };
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [data, setData] = useState({
    emotion: "Neutral",
    confidence: 0,
    probs: {},
    ear: 0,
    blinkRate: 0,
    eyeOpenness: 0,
    fatigueLevel: "Low",
    fatiguePct: 0,
    attentionScore: 0,
    features: {},
    embedding: [0, 0, 0, 0, 0],
    pipelineStep: 0,
    frameCount: 0,
    totalBlinks: 0,
    dominantEmotion: "—",
    avgAttention: 0,
    attentionHistory: [],
    emotionCounts: {},
    timeline: [],
    capturing: false,
  });

  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  const handleStart = useCallback(() => {
    setStarted(true);
  }, []);

  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setStarted(false);
    setSessionTime(0);
    setData((d) => ({ ...d, capturing: false }));
  }, []);

  // Simulation loop — every 2 seconds (matches ~30 frames/min)
  useEffect(() => {
    if (!started) return;

    timerRef.current = setInterval(() => {
      setSessionTime((t) => t + 1);
    }, 1000);

    intervalRef.current = setInterval(() => {
      setData((prev) => simulateDetection(prev));
    }, 2000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [started]);

  return (
    <>
      <Header sessionTime={sessionTime} isRunning={started} />
      <main>
        {!started ? (
          <ConsentScreen onStart={handleStart} />
        ) : (
          <Dashboard data={data} sessionTime={sessionTime} onStop={handleStop} />
        )}
      </main>
    </>
  );
}
