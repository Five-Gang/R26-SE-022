"use client";
import { useRef, useEffect, useCallback } from "react";
import styles from "./Dashboard.module.css";

const EMOTIONS = ["Focused", "Confused", "Frustrated", "Bored", "Neutral"];
const EMOTION_EMOJI = { Focused: "🟢", Confused: "🤔", Frustrated: "😤", Bored: "😴", Neutral: "😐" };
const EMOTION_BIG_EMOJI = { Focused: "😊", Confused: "🤔", Frustrated: "😤", Bored: "😴", Neutral: "😐" };
const EMOTION_COLORS = { Focused: "#22c55e", Confused: "#eab308", Frustrated: "#ef4444", Bored: "#64748b", Neutral: "#6366f1" };
const EMOTION_CSS = { Focused: "focused", Confused: "confused", Frustrated: "frustrated", Bored: "bored", Neutral: "neutral" };

const PIPELINE_STEPS = [
  { icon: "📷", label: "Webcam\nCapture" },
  { icon: "🔍", label: "Face\nDetection" },
  { icon: "📍", label: "Landmark\nExtraction" },
  { icon: "👁️", label: "Eye Behavior\nAnalysis" },
  { icon: "📊", label: "Feature\nExtraction" },
  { icon: "🧠", label: "Emotion\nClassification" },
  { icon: "📤", label: "Output\nGeneration" },
];

export default function Dashboard({ data, sessionTime, onStop }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const formatTime = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // Start webcam
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (e) {
        console.error("Webcam error:", e);
      }
    })();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Draw timeline chart
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.timeline || data.timeline.length === 0) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const entries = data.timeline.slice(-60);
    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 20, bottom: 30, left: 10, right: 10 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const stepX = entries.length > 1 ? plotW / (entries.length - 1) : plotW;

    // Y mapping: emotions to y positions
    const emotionY = {};
    EMOTIONS.forEach((e, i) => {
      emotionY[e] = pad.top + (plotH / (EMOTIONS.length - 1)) * i;
    });

    // Grid lines and labels
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    EMOTIONS.forEach((e) => {
      const y = emotionY[e];
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(e, pad.left + 4, y - 4);
    });

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    entries.forEach((entry, i) => {
      const x = pad.left + i * stepX;
      const y = emotionY[entry.emotion] || pad.top + plotH / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    entries.forEach((entry, i) => {
      const x = pad.left + i * stepX;
      const y = emotionY[entry.emotion] || pad.top + plotH / 2;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = EMOTION_COLORS[entry.emotion] || "#6366f1";
      ctx.fill();
    });
  }, [data.timeline]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  const emotion = data.emotion || "Neutral";
  const confidence = data.confidence || 0;
  const attention = data.attentionScore || 0;
  const gaugeOffset = 251 - (251 * attention) / 100;
  const attLabel = attention >= 75 ? "High Engagement" : attention >= 50 ? "Moderate" : attention >= 25 ? "Low Engagement" : "Very Low";

  const handleStop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onStop();
  };

  return (
    <section className={styles.dashboard}>
      {/* Row 1: Webcam + Emotion + Attention */}
      <div className={styles.grid3}>
        {/* Webcam */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📹 Live Webcam Feed</h3>
            <div className={styles.webcamStatus}>
              <span className={styles.statusDot}></span> Active
            </div>
          </div>
          <div className={styles.webcamContainer}>
            <video ref={videoRef} className={styles.webcamVideo} autoPlay playsInline muted />
            {data.capturing && <div className={`${styles.captureFlash} ${styles.show}`}>📸 Frame Captured</div>}
            
            {/* Bounding Box Overlay (Mirrored X-axis to match CSS transform: scaleX(-1)) */}
            {data.boundingBox && (
              <div 
                style={{
                  position: "absolute",
                  border: "2px solid #22c55e",
                  borderRadius: "8px",
                  top: `${data.boundingBox.yMin * 100}%`,
                  left: `${(1 - data.boundingBox.xMax) * 100}%`,
                  width: `${(data.boundingBox.xMax - data.boundingBox.xMin) * 100}%`,
                  height: `${(data.boundingBox.yMax - data.boundingBox.yMin) * 100}%`,
                  boxShadow: "0 0 15px rgba(34, 197, 94, 0.5)",
                  pointerEvents: "none",
                  transition: "all 0.15s ease-out"
                }}
              />
            )}
          </div>
          <div className={styles.webcamFooter}>
            <span>Frames: {data.frameCount || 0}</span>
            <span>~0.5 fps</span>
          </div>
        </div>

        {/* Detected Emotion */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>🎭 Detected Emotion</h3>
          </div>
          <div className={styles.emotionDisplay}>
            <div className={styles.emotionEmoji}>{EMOTION_BIG_EMOJI[emotion]}</div>
            <div className={`${styles.emotionLabel} ${styles[EMOTION_CSS[emotion]]}`}>{emotion}</div>
            <div className={styles.confidenceRow}>
              <div className={styles.confidenceBarBg}>
                <div className={styles.confidenceBar} style={{ width: `${confidence}%` }}></div>
              </div>
              <span className={styles.confidenceText}>{confidence}%</span>
            </div>
          </div>
          <div className={styles.probs}>
            {EMOTIONS.map((e) => (
              <div className={styles.probRow} key={e}>
                <span className={styles.probLabel}>{EMOTION_EMOJI[e]} {e}</span>
                <div className={styles.probBarBg}>
                  <div className={`${styles.probBar} ${styles[EMOTION_CSS[e]]}`} style={{ width: `${data.probs?.[e] || 0}%` }}></div>
                </div>
                <span className={styles.probVal}>{data.probs?.[e] || 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Gauge */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>🎯 Attention Score</h3>
          </div>
          <div className={styles.gaugeContainer}>
            <svg className={styles.gaugeSvg} viewBox="0 0 200 120">
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1e1e2e" strokeWidth="16" strokeLinecap="round" />
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={gaugeOffset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#ef4444" /><stop offset="0.5" stopColor="#eab308" /><stop offset="1" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.gaugeValue}>{attention}</div>
            <div className={styles.gaugeLabel}>/ 100</div>
          </div>
          <div className={styles.attentionLevel}>{attLabel}</div>
        </div>
      </div>

      {/* Row 2: Eye Metrics + Feature Vector */}
      <div className={styles.grid2}>
        {/* Eye Metrics */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>👁️ Eye Behavior Analysis</h3>
          </div>
          <div className={styles.eyeGrid}>
            <div className={styles.metricBox}>
              <div className={styles.metricIcon}>👁️</div>
              <div className={styles.metricValue}>{(data.ear || 0).toFixed(2)}</div>
              <div className={styles.metricLabel}>Eye Aspect Ratio</div>
              <div className={styles.metricBarBg}><div className={styles.metricBar} style={{ width: `${Math.min((data.ear || 0) * 250, 100)}%` }}></div></div>
            </div>
            <div className={styles.metricBox}>
              <div className={styles.metricIcon}>💧</div>
              <div className={styles.metricValue}>{data.blinkRate || 0}</div>
              <div className={styles.metricLabel}>Blinks / Min</div>
              <div className={styles.metricBarBg}><div className={styles.metricBar} style={{ width: `${Math.min((data.blinkRate || 0) * 3.3, 100)}%` }}></div></div>
            </div>
            <div className={styles.metricBox}>
              <div className={styles.metricIcon}>🔓</div>
              <div className={styles.metricValue}>{data.eyeOpenness || 0}%</div>
              <div className={styles.metricLabel}>Eye Openness</div>
              <div className={styles.metricBarBg}><div className={styles.metricBar} style={{ width: `${data.eyeOpenness || 0}%` }}></div></div>
            </div>
            <div className={styles.metricBox}>
              <div className={styles.metricIcon}>😴</div>
              <div className={styles.metricValue}>{data.fatigueLevel || "Low"}</div>
              <div className={styles.metricLabel}>Fatigue Level</div>
              <div className={styles.metricBarBg}><div className={styles.metricBarFatigue} style={{ width: `${data.fatiguePct || 10}%` }}></div></div>
            </div>
          </div>
        </div>

        {/* Feature Vector */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📊 Feature Vector</h3>
            <span className={styles.badge}>Low-Dimensional</span>
          </div>
          <div className={styles.fvGrid}>
            {[
              ["Eye Openness", data.features?.eyeOpenness],
              ["Eyebrow Dist.", data.features?.eyebrowDist],
              ["Mouth Opening", data.features?.mouthOpening],
              ["Head Tilt", data.features?.headTilt],
              ["Blink Rate", data.features?.blinkRate],
              ["EAR Left", data.features?.earLeft],
              ["EAR Right", data.features?.earRight],
              ["Gaze Dir.", data.features?.gazeDir],
            ].map(([label, val]) => (
              <div className={styles.fvItem} key={label}>
                <span className={styles.fvLabel}>{label}</span>
                <span className={styles.fvValue}>{(val || 0).toFixed(3)}</span>
              </div>
            ))}
          </div>
          <div className={styles.embedding}>
            <h4>Emotion Embedding</h4>
            <code className={styles.embeddingCode}>
              [{(data.embedding || [0, 0, 0, 0, 0]).map((v) => v.toFixed(2)).join(", ")}]
            </code>
          </div>
        </div>
      </div>

      {/* Row 3: Timeline */}
      <div className={styles.gridFull}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📈 Emotion Timeline</h3>
            <div className={styles.timelineLegend}>
              {EMOTIONS.map((e) => (
                <span className={styles.legendItem} key={e}>
                  <span className={`${styles.legendDot} ${styles[EMOTION_CSS[e]]}`}></span>{e}
                </span>
              ))}
            </div>
          </div>
          <canvas ref={canvasRef} className={styles.timelineCanvas}></canvas>
        </div>
      </div>

      {/* Row 4: Session Summary */}
      <div className={styles.gridFull}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📋 Session Summary</h3>
            <button className={styles.btnStop} onClick={handleStop}>⏹ End Session</button>
          </div>
          <div className={styles.summaryGrid}>
            {[
              ["⏱️", formatTime(sessionTime), "Session Duration"],
              ["🎭", data.dominantEmotion || "—", "Dominant Emotion"],
              ["🎯", `${data.avgAttention || 0}%`, "Avg Attention"],
              ["📸", String(data.frameCount || 0), "Frames Analyzed"],
              ["💧", String(data.totalBlinks || 0), "Total Blinks"],
              ["🔒", "0 stored", "Images Stored"],
            ].map(([icon, value, label]) => (
              <div className={styles.summaryItem} key={label}>
                <div className={styles.summaryIcon}>{icon}</div>
                <div className={styles.summaryValue}>{value}</div>
                <div className={styles.summaryLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Pipeline */}
      <div className={styles.gridFull}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>⚙️ Processing Pipeline</h3>
          </div>
          <div className={styles.pipelineFlow}>
            {PIPELINE_STEPS.map((step, i) => {
              const activeIdx = data.pipelineStep || 0;
              const cls = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
              const statusText = i < activeIdx ? "Done" : i === activeIdx ? "Active" : "Waiting";
              return (
                <span key={i} style={{ display: "contents" }}>
                  {i > 0 && <span className={styles.pipelineArrow}>→</span>}
                  <div className={`${styles.pipelineStep} ${cls ? styles[cls] : ""}`}>
                    <div className={styles.pipeIcon}>{step.icon}</div>
                    <div className={styles.pipeLabel}>{step.label}</div>
                    <div className={styles.pipeStatus}>{statusText}</div>
                  </div>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
