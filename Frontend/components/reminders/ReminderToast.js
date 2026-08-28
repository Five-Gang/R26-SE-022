'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ReminderToast.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const POLL_INTERVAL = 30000;
const DISPLAY_TIME = 12000;

export default function ReminderToast() {
  const router = useRouter();
  const [reminder, setReminder] = useState(null);
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
      const shown = JSON.parse(window.sessionStorage.getItem('shown_reminders') || '[]');
      const dueReminder = (result.reminders || []).find((item) => {
        const scheduledAt = Date.parse(item.scheduled_at);
        return Number.isFinite(scheduledAt) && scheduledAt <= now && !shown.includes(item.reminder_id);
      });

      if (!dueReminder) return;
      window.sessionStorage.setItem('shown_reminders', JSON.stringify([...shown, dueReminder.reminder_id]));
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

  const sendFeedback = async (status, grade) => {
    const token = window.localStorage.getItem('access_token');
    if (token && reminder) {
      await fetch(`${API_URL}/api/v1/reminders/${reminder.reminder_id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, grade }),
      }).catch(() => undefined);
    }
    closeToast();
  };

  if (!reminder) return null;

  return (
    <aside className={styles.toast} role="status" aria-live="polite">
      <div className={styles.topLine}>
        <span className={styles.eyebrow}>Reminder One</span>
        <button className={styles.close} onClick={closeToast} aria-label="Dismiss reminder">×</button>
      </div>
      <p className={styles.title}>{reminder.item_title || reminder.item_key} is ready for review</p>
      <p className={styles.detail}>A short review now helps protect your long-term recall.</p>
      <div className={styles.actions}>
        <button className={styles.review} onClick={() => { closeToast(); router.push('/study/flashcards'); }}>Review now</button>
        <button className={styles.snooze} onClick={() => sendFeedback('SNOOZED', 2)}>Snooze</button>
      </div>
    </aside>
  );
}
