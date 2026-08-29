'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './queue.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

function vapidKeyToBuffer(key) {
  const padding = '='.repeat((4 - (key.length % 4)) % 4);
  const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function mapReminder(reminder) {
  const scheduledAt = reminder.scheduled_at ? new Date(reminder.scheduled_at) : null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const scheduledStart = scheduledAt && !Number.isNaN(scheduledAt.getTime())
    ? new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())
    : null;
  const daysUntilDue = scheduledStart ? Math.round((scheduledStart - todayStart) / 86400000) : 0;
  const nextDue = daysUntilDue <= 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : `In ${daysUntilDue} days`;

  return {
    ...reminder,
    item_title: reminder.item_title || reminder.item_key,
    nextDue,
    interval: reminder.retention_probability ? `${Math.round(reminder.retention_probability * 100)}% retained` : 'Adaptive',
    ease: reminder.readiness_tier || 'Adaptive',
    reps: reminder.activity_type || 'Review',
    reminderMeta: reminder.readiness_tier
      ? `${reminder.readiness_tier} readiness · ${Math.round((reminder.retention_probability || 0) * 100)}% retention`
      : 'Adaptive schedule',
    status: reminder.status === 'SENT' ? 'review' : 'scheduled',
  };
}

export default function StudyQueuePage() {
  const router = useRouter();
  const [queueData, setQueueData] = useState([]);
  const [activeFilter, setActiveFilter] = useState('due');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [schedulerStatus, setSchedulerStatus] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('default');
  const [preferences, setPreferences] = useState({ frequency: '60', quietStart: '22', quietEnd: '8' });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const token = window.localStorage.getItem('access_token');

    if (!token) {
      setQueueData([]);
      setMessage('Sign in to view your live reminders.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Unable to load reminders');
      const result = await response.json();
      const reminders = (result.reminders || []).map(mapReminder);
      setQueueData(reminders);
    } catch (error) {
      setQueueData([]);
      setMessage('Live reminders are unavailable. Check that the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    const token = window.localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/reminder-preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Unable to load reminder preferences');
      const result = await response.json();
      setPreferences({
        frequency: String(result.reminder_frequency),
        quietStart: String(result.quiet_hours_start),
        quietEnd: String(result.quiet_hours_end),
      });
    } catch (error) {
      setMessage('Reminder preferences could not be loaded from the backend.');
    }
  }, []);

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      loadReminders();
      loadPreferences();
      if ('Notification' in window) setNotificationStatus(Notification.permission);
    }, 0);
    return () => window.clearTimeout(loadTask);
  }, [loadPreferences, loadReminders]);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  const filteredQueue = useMemo(() => {
    if (activeFilter === 'upcoming') return queueData.filter((row) => row.nextDue !== 'Today');
    if (activeFilter === 'all') return queueData;
    return queueData.filter((row) => row.nextDue === 'Today');
  }, [activeFilter, queueData]);

  const dueCount = queueData.filter((row) => row.nextDue === 'Today').length;
  const upcomingCount = queueData.length - dueCount;

  const sendFeedback = async (reminderId, status, grade) => {
    const token = window.localStorage.getItem('access_token');
    if (!token) {
      setMessage('Sign in to update reminders.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/reminders/${reminderId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, grade }),
      });
      if (!response.ok) throw new Error('Unable to update reminder');
      setQueueData((items) => items.filter((item) => item.reminder_id !== reminderId));
    } catch (error) {
      setMessage('The reminder could not be updated. Please try again.');
    }
  };

  const savePreferences = async (nextPreferences) => {
    setPreferences(nextPreferences);
    const token = window.localStorage.getItem('access_token');
    if (!token) {
      setMessage('Sign in to save reminder preferences.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/reminder-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reminder_frequency: Number(nextPreferences.frequency),
          quiet_hours_start: Number(nextPreferences.quietStart),
          quiet_hours_end: Number(nextPreferences.quietEnd),
        }),
      });
      if (!response.ok) throw new Error('Unable to save reminder preferences');
      setMessage('Reminder preferences saved.');
    } catch (error) {
      setMessage('Reminder preferences could not be saved.');
    }
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setMessage('This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    if (permission !== 'granted') {
      setMessage('Browser notifications are blocked. You can allow them in browser settings.');
      return;
    }

    const token = window.localStorage.getItem('access_token');
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (token && vapidKey && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToBuffer(vapidKey),
        });
        await fetch(`${API_URL}/api/v1/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(subscription.toJSON()),
        });
        setMessage('Push notifications are enabled for Reminder One.');
      } catch (error) {
        setMessage('Browser alerts are enabled, but push subscription needs configuration.');
      }
      return;
    }

    setMessage('Browser alerts are enabled. Push delivery needs the VAPID key and backend service worker configuration.');
  };

  const runSchedulerTick = async () => {
    const token = window.localStorage.getItem('access_token');
    if (!token) {
      setSchedulerStatus('Sign in to run the live adaptive scheduler.');
      return;
    }

    setSchedulerStatus('Running adaptive scheduler...');
    try {
      const response = await fetch(`${API_URL}/api/v1/schedule/tick`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Scheduler request failed');
      const result = await response.json();
      setSchedulerStatus(`${result.reminders_created} reminders created from ${result.items_processed} study items. ${result.decision_reason || result.status}`);
      await loadReminders();
    } catch (error) {
      setSchedulerStatus('The live scheduler is unavailable. Your current queue is unchanged.');
    }
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <div className={styles.titleKicker}>Reminder One</div>
          <h1 className={styles.pageTitle}>Your study reminders</h1>
          <p className={styles.pageSubtitle}>Adaptive scheduling based on readiness, retention, and study activity.</p>
        </div>
        
        <div className={styles.filters}>
          <button aria-pressed={activeFilter === 'due'} className={`${styles.filterBtn} ${activeFilter === 'due' ? styles.filterActive : styles.filterInactive}`} onClick={() => setActiveFilter('due')}>Due Today <span>{dueCount}</span></button>
          <button aria-pressed={activeFilter === 'upcoming'} className={`${styles.filterBtn} ${activeFilter === 'upcoming' ? styles.filterActive : styles.filterInactive}`} onClick={() => setActiveFilter('upcoming')}>Upcoming <span>{upcomingCount}</span></button>
          <button aria-pressed={activeFilter === 'all'} className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.filterActive : styles.filterInactive}`} onClick={() => setActiveFilter('all')}>All Reminders <span>{queueData.length}</span></button>
          <button className={styles.refreshBtn} onClick={loadReminders} disabled={loading} aria-label="Refresh reminders">↻</button>
          <div className={styles.settingsWrap}>
            <button
              className={`${styles.settingsBtn} ${settingsOpen ? styles.settingsActive : ''}`}
              onClick={() => setSettingsOpen((isOpen) => !isOpen)}
              aria-expanded={settingsOpen}
              aria-controls="reminder-settings"
              aria-label="Open reminder settings"
              title="Reminder settings"
            >
              <span aria-hidden="true">⚙</span>
            </button>
            {settingsOpen && (
              <>
                <button className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)} aria-label="Close reminder settings" />
                <section id="reminder-settings" className={styles.settingsPopup} role="dialog" aria-modal="true" aria-labelledby="settings-title">
                  <div className={styles.popupHeader}>
                    <div>
                      <div className={styles.popupEyebrow}>Reminder centre</div>
                      <h2 id="settings-title">Reminder settings</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={() => setSettingsOpen(false)} aria-label="Close reminder settings">×</button>
                  </div>

                  <div className={styles.popupSection}>
                    <div className={styles.popupSectionHeading}>
                      <span className={styles.sectionIcon} aria-hidden="true">◉</span>
                      <div>
                        <h3>Delivery controls</h3>
                        <p>Manage alerts and refresh your adaptive queue.</p>
                      </div>
                    </div>
                    <div className={styles.controlActions}>
                      <button className={styles.secondaryAction} onClick={enableNotifications}>
                        {notificationStatus === 'granted' ? 'Alerts enabled' : 'Enable alerts'}
                      </button>
                      <button className={styles.secondaryAction} onClick={runSchedulerTick}>Run scheduler</button>
                    </div>
                  </div>

                  <div className={styles.popupSection}>
                    <div className={styles.popupSectionHeading}>
                      <span className={styles.sectionIcon} aria-hidden="true">◷</span>
                      <div>
                        <h3>Quiet hours & frequency</h3>
                        <p>Choose when reminders can reach you.</p>
                      </div>
                    </div>
                    <div className={styles.preferenceFields}>
                      <label>Frequency<select value={preferences.frequency} onChange={(event) => savePreferences({ ...preferences, frequency: event.target.value })}><option value="30">Every 30 min</option><option value="60">Every hour</option><option value="120">Every 2 hours</option><option value="240">Every 4 hours</option></select></label>
                      <label>Quiet hours<select value={preferences.quietStart} onChange={(event) => savePreferences({ ...preferences, quietStart: event.target.value })}><option value="20">20:00</option><option value="22">22:00</option><option value="23">23:00</option></select></label>
                      <label>Resume at<select value={preferences.quietEnd} onChange={(event) => savePreferences({ ...preferences, quietEnd: event.target.value })}><option value="6">06:00</option><option value="8">08:00</option><option value="9">09:00</option></select></label>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <section className={styles.summaryGrid} aria-label="Reminder summary">
        <div className={`${styles.summaryCard} ${styles.summaryDue}`}>
          <span className={styles.summaryLabel}>Due today</span>
          <strong className={styles.summaryValue}>{dueCount}</strong>
          <span className={styles.summaryHint}>Ready for review</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryUpcoming}`}>
          <span className={styles.summaryLabel}>Upcoming</span>
          <strong className={styles.summaryValue}>{upcomingCount}</strong>
          <span className={styles.summaryHint}>Already scheduled</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryMode}`}>
          <span className={styles.summaryLabel}>Scheduling mode</span>
          <strong className={styles.summaryModeValue}>Live adaptive</strong>
          <span className={styles.summaryHint}>Synced with Reminder One</span>
        </div>
      </section>

      {message && <p className={styles.message} role="status">{message}</p>}
      {schedulerStatus && <p className={styles.message} role="status">{schedulerStatus}</p>}
      {loading ? <p className={styles.stateMessage}>Loading reminders...</p> : null}

      <div className={styles.tableContainer} aria-busy={loading}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Card / Topic</th>
              <th className={styles.th}>Interval</th>
              <th className={styles.th}>Ease Factor</th>
              <th className={styles.th}>Next Due</th>
              <th className={styles.th}>Repetitions</th>
              <th className={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredQueue.map((row) => (
              <tr key={row.reminder_id} className={styles.tr}>
                <td className={`${styles.td} ${styles.topicTitle}`} title={row.decision_reason || undefined}>
                  <div>{row.item_title}</div>
                  <div className={styles.reminderMeta}>{row.reminderMeta}</div>
                </td>
                <td className={styles.td}>{row.interval}</td>
                <td className={styles.td}>{row.ease}</td>
                <td className={`${styles.td} ${row.nextDue === 'Today' ? styles.dueToday : styles.dueLater}`}>
                  {row.nextDue}
                </td>
                <td className={styles.td}>{row.reps}</td>
                <td className={styles.td}>
                  {row.status === 'review' ? (
                    <div className={styles.actionGroup}>
                      <button className={`${styles.btnAction} ${styles.btnReview}`} onClick={() => router.push('/study/flashcards')}>Review</button>
                      <button className={`${styles.btnAction} ${styles.btnSnooze}`} onClick={() => sendFeedback(row.reminder_id, 'SNOOZED', 2)}>Snooze</button>
                    </div>
                  ) : (
                    <button className={`${styles.btnAction} ${styles.btnScheduled}`} disabled>Scheduled</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filteredQueue.length === 0 && (
              <tr><td colSpan="6" className={styles.stateMessage}>No reminders in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
