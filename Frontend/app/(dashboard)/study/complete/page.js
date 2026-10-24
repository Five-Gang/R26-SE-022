'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './complete.module.css';
import Link from 'next/link';

const ARS_API = process.env.NEXT_PUBLIC_API_URL || '/api/ars';

function SessionCompleteContent() {
  const searchParams = useSearchParams();
  const [tickStatus, setTickStatus] = useState('pending'); // 'pending' | 'ok' | 'error'

  const correct = parseInt(searchParams.get('correct') ?? '7', 10);
  const total = parseInt(searchParams.get('total') ?? '8', 10);
  const scoreParam = searchParams.get('score');
  const scorePct = scoreParam !== null ? parseInt(scoreParam, 10) : Math.round((correct / Math.max(1, total)) * 100);
  const timeStudied = searchParams.get('time') || '5';
  const summaryId = searchParams.get('summary');
  const topic = searchParams.get('topic') || 'your lecture topics';

  // Fire a real scheduling tick so a reminder is actually created in the backend
  useEffect(() => {
    async function triggerTick() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const res = await fetch(`${ARS_API}/api/v1/schedule/tick`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            post_session: true,
            score_pct: scorePct,
            difficulty: 'medium',
          }),
        });
        setTickStatus(res.ok ? 'ok' : 'error');
      } catch {
        setTickStatus('error');
      }
    }
    triggerTick();
  }, [scorePct]);
  const performance = useMemo(() => {
    if (scorePct >= 80) {
      return {
        icon: '🎉',
        title: 'Outstanding Work!',
        subtitle: `You scored ${scorePct}% on ${topic} — strong Learning Outcome recall achieved!`,
        reviewText: 'Tomorrow at 7:00 PM',
      };
    } else if (scorePct >= 50) {
      return {
        icon: '👏',
        title: 'Good Progress!',
        subtitle: `You scored ${scorePct}% on ${topic} — solid grasp of core concepts.`,
        reviewText: 'Tomorrow at 10:00 AM',
      };
    } else {
      return {
        icon: '💪',
        title: 'Keep Practicing!',
        subtitle: `You scored ${scorePct}% on ${topic} — review your summary notes and try again.`,
        reviewText: 'Today at 6:00 PM',
      };
    }
  }, [scorePct, topic]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={styles.icon}>{performance.icon}</div>
        
        <h1 className={styles.heading}>{performance.title}</h1>
        <p className={styles.subheading}>
          {performance.subtitle}
        </p>

        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${styles.statGreen}`}>
            <div className={styles.statValue}>{correct} / {total}</div>
            <div className={styles.statLabel}>Quiz Score ({scorePct}%)</div>
          </div>
          
          <div className={`${styles.statCard} ${styles.statBlue}`}>
            <div className={styles.statValue}>{total}</div>
            <div className={styles.statLabel}>Questions Attempted</div>
          </div>
          
          <div className={`${styles.statCard} ${styles.statOrange}`}>
            <div className={styles.statValue}>{timeStudied} min</div>
            <div className={styles.statLabel}>Time Studied</div>
          </div>
        </div>

        <div className={styles.alertBox}>
          <div className={styles.alertTitleRow}>
            <span>🤖</span>
            {tickStatus === 'pending' && 'Scheduling AI Adaptive Reminder…'}
            {tickStatus === 'ok' && 'AI Adaptive Reminder scheduled'}
            {tickStatus === 'error' && 'AI Adaptive Reminder could not be confirmed'}
          </div>
          <div className={styles.alertBody}>
            Next review: <strong>{performance.reviewText}</strong> · Spaced-repetition optimised for long-term retention.
          </div>
        </div>

        <div className={styles.actionsRow}>
          <Link
            href={summaryId ? `/study/quiz?summary=${summaryId}` : '/study/quiz'}
            className={styles.btnOutline}
          >
            Review Mistakes
          </Link>
          <Link href="/dashboard" className={styles.btnPrimary}>
            Go to Dashboard →
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function SessionCompletePage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.card}>Loading results…</div></div>}>
      <SessionCompleteContent />
    </Suspense>
  );
}
