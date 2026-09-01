"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import ConsentScreen from "../components/ConsentScreen";
import Dashboard from "../components/Dashboard";

// Helper to process real API responses and maintain state continuity
function processApiResponse(apiData, prev) {
  const rawEmotion = apiData.emotion || "Neutral";
  
  // Update timeline with the raw emotion
  const timeline = [...(prev.timeline || []), { emotion: rawEmotion, timestamp: Date.now() }];
  if (timeline.length > 50) timeline.shift();

  // TEMPORAL SMOOTHING: Look at the last 5 frames to determine the actual emotion
  // This prevents jitter/rapid flickering if the model is unsure between two emotions
  const recentFrames = timeline.slice(-5);
  const recentCounts = {};
  recentFrames.forEach(frame => {
    recentCounts[frame.emotion] = (recentCounts[frame.emotion] || 0) + 1;
  });
  
  // Find the most frequent emotion in the last 5 frames
  let smoothedEmotion = rawEmotion;
  let maxRecentCount = 0;
  Object.entries(recentCounts).forEach(([e, count]) => {
    if (count > maxRecentCount) {
      maxRecentCount = count;
      smoothedEmotion = e;
    }
  });

  // Use the smoothed emotion for our current state
  const emotion = smoothedEmotion;
  
  // Temporal tracking for metrics
  const frameCount = (prev.frameCount || 0) + 1;
  const isBlinking = apiData.features?.is_blinking || false;
  
  // Simple blink counter logic based on state change
  const wasBlinking = prev.wasBlinking || false;
  let totalBlinks = prev.totalBlinks || 0;
  if (isBlinking && !wasBlinking) {
    totalBlinks += 1;
  }

  // Determine fatigue level
  const fatiguePct = emotion === "Bored" ? 60 + Math.random() * 30 : emotion === "Focused" ? 5 + Math.random() * 15 : 20 + Math.random() * 30;
  const fatigueLevel = fatiguePct > 60 ? "High" : fatiguePct > 35 ? "Medium" : "Low";

  // Dominant emotion tracking
  const emotionCounts = { ...(prev.emotionCounts || {}) };
  emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  let dominantEmotion = "Neutral";
  let maxCount = 0;
  Object.entries(emotionCounts).forEach(([e, c]) => {
    if (c > maxCount) { maxCount = c; dominantEmotion = e; }
  });

  const attentionHistory = [...(prev.attentionHistory || []), apiData.attentionScore || 0];
  if (attentionHistory.length > 30) attentionHistory.shift(); // Keep last 30 frames
  const avgAttention = Math.round(attentionHistory.reduce((a, b) => a + b, 0) / attentionHistory.length);

  // Cycle pipeline steps for UI animation 0-6
  const pipelineStep = (prev.pipelineStep + 1) % 7;

  return {
    ...apiData,
    emotion, // Override the raw emotion with our smoothed one
    fatigueLevel,
    fatiguePct: Math.round(fatiguePct),
    pipelineStep,
    frameCount,
    totalBlinks,
    wasBlinking: isBlinking,
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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
      return true;
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      alert("Could not access webcam. Please ensure permissions are granted.");
      return false;
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ensure video is playing
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_EMOTION_API_URL || 'http://localhost:8004'}/api/detect-emotion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageData }),
        });
        
        if (response.ok) {
          const apiData = await response.json();
          setData((prev) => processApiResponse(apiData, prev));
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.detail === "No face detected in the frame") {
            // Silently handle when the user looks away or face is out of frame
          } else {
            console.error("API Error:", response.statusText, errorData);
          }
        }
      } catch (err) {
        console.error("Error calling detection API:", err);
      }
    }
  };

  const handleStart = async () => {
    const cameraReady = await startWebcam();
    if (cameraReady) {
      setStarted(true);
    }
  };

  const handleStop = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopWebcam();
    setStarted(false);
    setSessionTime(0);
    setData((d) => ({ ...d, capturing: false }));
  }, []);

  // Main capture loop - roughly 30 frames per minute (every 2 seconds)
  useEffect(() => {
    if (!started) return;

    timerRef.current = setInterval(() => {
      setSessionTime((t) => t + 1);
    }, 1000);

    // Initial capture
    setTimeout(captureAndDetect, 1000);

    captureIntervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 2000);

    return () => {
      clearInterval(captureIntervalRef.current);
      clearInterval(timerRef.current);
      stopWebcam();
    };
  }, [started]);

  return (
    <>
      <Header sessionTime={sessionTime} isRunning={started} />
      <main>
        {/* Hidden video and canvas elements for background capture */}
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        
        {!started ? (
          <ConsentScreen onStart={handleStart} />
        ) : (
          <Dashboard data={data} sessionTime={sessionTime} onStop={handleStop} />
        )}
      </main>
    </>
  );
}
