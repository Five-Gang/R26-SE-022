'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ReminderToast.module.css';
import { getReminderStudyRoute } from './reminder-navigation';

const API_URL = '/api/ars';
const POLL_INTERVAL = 30000;
const DISPLAY_TIME = 12000;

export default function ReminderToast() {
  const router = useRouter();
  const [reminder, setReminder] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);
  const hideTimer = useRef(null);

  const checkReminders = useCallback(async () => {
    const token = window.localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;

      const result = await response.json();
      const now = Date.now();
      let shown = [];
      try {
        const stored = JSON.parse(window.sessionStorage.getItem('shown_reminders') || '[]');
        shown = Array.isArray(stored) ? stored : [];
      } catch {
        window.sessionStorage.removeItem('shown_reminders');
      }
      const dueReminder = (result.reminders || []).find((item) => {
        const scheduledAt = Date.parse(item.scheduled_at);
        return Number.isFinite(scheduledAt) && scheduledAt <= now && !shown.includes(item.reminder_id);
      });

      if (!dueReminder) return;
      window.sessionStorage.setItem('shown_reminders', JSON.stringify([...shown, dueReminder.reminder_id]));
      setFeedbackError(null);
      setReminder(dueReminder);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setReminder(null), DISPLAY_TIME);
    } catch (error) {
      // The queue owns the visible API error state; the global toast stays silent.
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(checkReminders, 0);
    const poller = window.setInterval(checkReminders, POLL_INTERVAL);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(poller);
      window.clearTimeout(hideTimer.current);
    };
  }, [checkReminders]);

  const closeToast = () => {
    window.clearTimeout(hideTimer.current);
    setReminder(null);
  };

  const dismissReminder = async () => {
    await sendFeedback('DISMISSED');
  };

  const reviewReminder = async () => {
    const route = getReminderStudyRoute(reminder);
    if (!route) return;
    if (await sendFeedback('ACCEPTED')) {
      router.push(route);
    }
  };

  const sendFeedback = async (status, grade) => {
    const token = window.localStorage.getItem('access_token');
    let succeeded = true;
    if (token && reminder) {
      await fetch(`${API_URL}/api/v1/reminders/${reminder.reminder_id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, grade }),
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Reminder feedback failed (${response.status})`);
        }
      }).catch((error) => {
        succeeded = false;
        try {
          const shown = JSON.parse(window.sessionStorage.getItem('shown_reminders') || '[]');
          window.sessionStorage.setItem(
            'shown_reminders',
            JSON.stringify(Array.isArray(shown)
              ? shown.filter((id) => id !== reminder.reminder_id)
              : [])
          );
        } catch {
          window.sessionStorage.removeItem('shown_reminders');
        }
        setFeedbackError(error instanceof Error ? error.message : 'Could not update this reminder.');
      });
    }
    if (succeeded) closeToast();
    return succeeded;
  };

  if (!reminder) return null;

  return (
    <aside className={styles.toast} role="status" aria-live="polite">
      <div className={styles.topLine}>
        <span className={styles.eyebrow}>Reminder One</span>
        <button className={styles.close} onClick={dismissReminder} aria-label="Dismiss reminder">×</button>
      </div>
      <p className={styles.title}>{reminder.item_title || reminder.item_key} is ready for review</p>
      <p className={styles.detail}>A short review now helps protect your long-term recall.</p>
      {feedbackError && <p role="alert">{feedbackError} Please try again.</p>}
      <div className={styles.actions}>
        <button className={styles.review} onClick={reviewReminder} disabled={!getReminderStudyRoute(reminder)}>
          Review now
        </button>
        <button className={styles.snooze} onClick={() => sendFeedback('SNOOZED', 2)}>Snooze</button>
      </div>
    </aside>
  );
}
