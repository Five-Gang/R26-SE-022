'use client';

/**
 * EmotionInterventionToast
 * 
 * Watches the live FocusContext emotion stream. When the student is in a 
 * sustained "Frustrated" or "Bored" state while the Focus Monitor is active,
 * it calls the Adaptive Reminder System's /api/v1/emotion/intervention endpoint
 * which runs the Readiness Model → Content Personalization Model pipeline and
 * returns a personalized, context-aware notification message.
 * 
 * Trigger rules (to avoid spamming):
 *  - Intervention state (Frustrated / Bored / Confused) must persist >= TRIGGER_SECONDS
 *  - After each notification, a COOLDOWN_SECONDS window prevents re-triggering
 *  - Toast auto-dismisses after DISPLAY_SECONDS
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFocus } from '../../context/FocusContext';
import styles from './EmotionInterventionToast.module.css';

const ARS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// How long (seconds) a negative emotion must persist before triggering
const TRIGGER_SECONDS = 8;

// How long (seconds) after a toast fires before it can fire again
const COOLDOWN_SECONDS = 120;

// How long (ms) the toast is shown before auto-dismissing
const DISPLAY_MS = 20000;

// Emotions that warrant real-time intervention
const INTERVENTION_EMOTIONS = new Set(['frustrated', 'bored', 'confused']);

const EMOTION_ICONS = {
  frustrated: '😤',
  bored:      '😴',
  confused:   '😕',
  default:    '⚠️',
};

export default function EmotionInterventionToast() {
  const router = useRouter();
  const { isMonitoring, focusData } = useFocus();
  const liveEmotion   = focusData?.emotion;
  const attentionScore = focusData?.attentionScore ?? 50;

  const [toast, setToast] = useState(null);
  const emotionStartRef = useRef(null);   // timestamp when current negative emotion started
  const lastTriggerRef  = useRef(null);   // timestamp of the last intervention
  const displayTimerRef = useRef(null);

  const dismissToast = useCallback(() => {
    clearTimeout(displayTimerRef.current);
    setToast(null);
  }, []);

  const fetchAndShowIntervention = useCallback(async (emotion, attScore) => {
    try {
      const res = await fetch(`${ARS_API_URL}/api/v1/emotion/intervention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion,
          attention_score: attScore ?? 50,
          duration_seconds: TRIGGER_SECONDS,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const intervention = data?.intervention;
      if (!intervention || !intervention.intervention_required) return;

      // Record the trigger time for cooldown
      lastTriggerRef.current = Date.now();

      setToast({
        ...intervention,
        emotion,
      });

      // Auto-dismiss
      clearTimeout(displayTimerRef.current);
      displayTimerRef.current = setTimeout(dismissToast, DISPLAY_MS);
    } catch {
      // Silently fail — do not disrupt the student's session with API errors
    }
  }, [dismissToast]);

  // Watch the live emotion stream from FocusContext
  useEffect(() => {
    if (!isMonitoring || !liveEmotion) {
      emotionStartRef.current = null;
      return;
    }

    const emotionKey = liveEmotion.toLowerCase();

    if (!INTERVENTION_EMOTIONS.has(emotionKey)) {
      // Reset the clock when the student returns to a good state
      emotionStartRef.current = null;
      return;
    }

    // Start timing this negative emotion if we haven't already
    if (!emotionStartRef.current) {
      emotionStartRef.current = Date.now();
    }

    const secondsInState = (Date.now() - emotionStartRef.current) / 1000;
    const cooldownPassed = !lastTriggerRef.current ||
      (Date.now() - lastTriggerRef.current) / 1000 >= COOLDOWN_SECONDS;

    if (secondsInState >= TRIGGER_SECONDS && cooldownPassed) {
      // Reset so we don't trigger again immediately
      emotionStartRef.current = null;
      fetchAndShowIntervention(liveEmotion, attentionScore);
    }
  }, [liveEmotion, attentionScore, isMonitoring, fetchAndShowIntervention]);

  // Clean up display timer on unmount
  useEffect(() => () => clearTimeout(displayTimerRef.current), []);

  if (!toast) return null;

  const severity = toast.severity || 'medium';
  const emotionKey = (toast.emotion || '').toLowerCase();
  const icon = EMOTION_ICONS[emotionKey] || EMOTION_ICONS.default;

  const headerClass = severity === 'high' ? styles.headerHigh : severity === 'low' ? styles.headerLow : styles.headerMedium;
  const toastClass  = severity === 'high' ? styles.toastHigh  : severity === 'low' ? styles.toastLow  : styles.toastMedium;
  const btnClass    = severity === 'high' ? styles.btnActionHigh : severity === 'low' ? styles.btnActionLow : styles.btnActionMedium;
  const progClass   = severity === 'high' ? styles.progressHigh : severity === 'low' ? styles.progressLow : styles.progressMedium;

  const handleAction = () => {
    dismissToast();
    if (toast.suggested_route) {
      router.push(toast.suggested_route);
    }
  };

  return (
    <aside
      className={`${styles.toast} ${toastClass}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className={`${styles.toastHeader} ${headerClass}`}>
        <div className={styles.headerLeft}>
          <span className={styles.emotionIcon}>{icon}</span>
          <span className={styles.headerTitle}>{toast.title}</span>
        </div>
        <span className={styles.headerBadge}>AuraLearn AI</span>
        <button className={styles.closeBtn} onClick={dismissToast} aria-label="Dismiss">×</button>
      </div>

      {/* Body */}
      <div className={styles.toastBody}>
        <p className={styles.message}>{toast.message}</p>
        <p className={styles.reasonLine}>📊 Model insight: {toast.reason}</p>
        <div className={styles.actions}>
          <button className={`${styles.btnAction} ${btnClass}`} onClick={handleAction}>
            {toast.action_label || 'Take Action'}
          </button>
          <button className={styles.btnDismiss} onClick={dismissToast}>
            Dismiss
          </button>
        </div>
      </div>

      {/* Auto-dismiss countdown bar */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${progClass}`}
          style={{ animationDuration: `${DISPLAY_MS}ms` }}
        />
      </div>
    </aside>
  );
}
