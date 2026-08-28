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

const demoQueue = [
  { reminder_id: 'demo-1', item_key: 'integration-by-parts', item_title: 'Integration by Parts', interval: '1 day', ease: '2.50', nextDue: 'Today', reps: '1x', reminderMeta: 'HIGH readiness · 42% retention', status: 'review' },
  { reminder_id: 'demo-2', item_key: 'liate-rule', item_title: 'LIATE Rule', interval: '1 day', ease: '2.50', nextDue: 'Today', reps: '1x', reminderMeta: 'MEDIUM readiness · 38% retention', status: 'review' },
  { reminder_id: 'demo-3', item_key: 'substitution-method', item_title: 'Substitution Method', interval: '6 days', ease: '2.60', nextDue: 'Today', reps: '2x', reminderMeta: 'MEDIUM readiness · 34% retention', status: 'review' },
  { reminder_id: 'demo-4', item_key: 'cell-membrane', item_title: 'Cell Membrane Structure', interval: '3 days', ease: '2.36', nextDue: 'Today', reps: '2x', reminderMeta: 'LOW readiness · 31% retention', status: 'review' },
  { reminder_id: 'demo-5', item_key: 'atp-synthesis', item_title: 'ATP Synthesis', interval: '7 days', ease: '2.70', nextDue: 'Today', reps: '3x', reminderMeta: 'HIGH readiness · 28% retention', status: 'review' },
  { reminder_id: 'demo-6', item_key: 'binary-search-tree', item_title: 'Binary Search Tree', interval: '21 days', ease: '2.80', nextDue: 'Tomorrow', reps: '5x', reminderMeta: 'MEDIUM readiness · 76% retention', status: 'scheduled' },
  { reminder_id: 'demo-7', item_key: 'recursion-base-case', item_title: 'Recursion Base Case', interval: '14 days', ease: '2.65', nextDue: 'In 2 days', reps: '4x', reminderMeta: 'MEDIUM readiness · 82% retention', status: 'scheduled' },
  { reminder_id: 'demo-8', item_key: 'newtons-first-law', item_title: "Newton's First Law", interval: '3 days', ease: '2.50', nextDue: 'In 3 days', reps: '1x', reminderMeta: 'HIGH readiness · 88% retention', status: 'scheduled' },
];

function mapReminder(reminder) {
  const scheduledAt = reminder.scheduled_at ? new Date(reminder.scheduled_at) : null;
  const nextDue = scheduledAt && !Number.isNaN(scheduledAt.getTime())
    ? scheduledAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Today';

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
    status: 'review',
  };
}

export default function StudyQueuePage() {
  const router = useRouter();
  const [queueData, setQueueData] = useState(demoQueue);
  const [activeFilter, setActiveFilter] = useState('due');
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(true);
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
      setQueueData(demoQueue);
      setUsingDemo(true);
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
      setUsingDemo(false);
    } catch (error) {
      setQueueData(demoQueue);
      setUsingDemo(true);
      setMessage('Live reminders are unavailable. Showing demo reminders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      loadReminders();
      const savedPreferences = window.localStorage.getItem('reminder_preferences');
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          window.localStorage.removeItem('reminder_preferences');
        }
      }
      if ('Notification' in window) setNotificationStatus(Notification.permission);
    }, 0);
    return () => window.clearTimeout(loadTask);
  }, [loadReminders]);

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
    if (usingDemo || reminderId.startsWith('demo-')) {
      setQueueData((items) => items.filter((item) => item.reminder_id !== reminderId));
      return;
    }

    const token = window.localStorage.getItem('access_token');
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

  const savePreferences = (nextPreferences) => {
    setPreferences(nextPreferences);
    window.localStorage.setItem('reminder_preferences', JSON.stringify(nextPreferences));
    setMessage('Reminder preferences saved on this device.');
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
      setSchedulerStatus('Demo mode: sign in to run the live adaptive scheduler.');
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
          <strong className={styles.summaryModeValue}>{usingDemo ? 'Demo preview' : 'Live adaptive'}</strong>
          <span className={styles.summaryHint}>{usingDemo ? 'Connect your account for live data' : 'Synced with Reminder One'}</span>
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
