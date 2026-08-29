'use client';

import React from 'react';
import styles from './queue.module.css';

export default function StudyQueuePage() {
  const queueData = [
    { topic: 'Integration by Parts', interval: '1 day', ease: '2.50', nextDue: 'Today', reps: '1x', status: 'review' },
    { topic: 'LIATE Rule', interval: '1 day', ease: '2.50', nextDue: 'Today', reps: '1x', status: 'review' },
    { topic: 'Substitution Method', interval: '6 days', ease: '2.60', nextDue: 'Today', reps: '2x', status: 'review' },
    { topic: 'Cell Membrane Structure', interval: '3 days', ease: '2.36', nextDue: 'Today', reps: '2x', status: 'review' },
    { topic: 'ATP Synthesis', interval: '7 days', ease: '2.70', nextDue: 'Today', reps: '3x', status: 'review' },
    { topic: 'Binary Search Tree', interval: '21 days', ease: '2.80', nextDue: 'Tomorrow', reps: '5x', status: 'scheduled' },
    { topic: 'Recursion Base Case', interval: '14 days', ease: '2.65', nextDue: 'In 2 days', reps: '4x', status: 'scheduled' },
    { topic: 'Newton\'s First Law', interval: '3 days', ease: '2.50', nextDue: 'In 3 days', reps: '1x', status: 'scheduled' },
  ];

  return (
    <div className={styles.container}>
      
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Study Queue</h1>
          <p className={styles.pageSubtitle}>Spaced repetition schedule · SM-2 algorithm</p>
        </div>
        
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${styles.filterActive}`}>Due Today (5)</button>
          <button className={`${styles.filterBtn} ${styles.filterInactive}`}>Upcoming</button>
          <button className={`${styles.filterBtn} ${styles.filterInactive}`}>All Cards</button>
        </div>
      </div>

      <div className={styles.tableContainer}>
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
            {queueData.map((row, index) => (
              <tr key={index} className={styles.tr}>
                <td className={`${styles.td} ${styles.topicTitle}`}>{row.topic}</td>
                <td className={styles.td}>{row.interval}</td>
                <td className={styles.td}>{row.ease}</td>
                <td className={`${styles.td} ${row.nextDue === 'Today' ? styles.dueToday : styles.dueLater}`}>
                  {row.nextDue}
                </td>
                <td className={styles.td}>{row.reps}</td>
                <td className={styles.td}>
                  {row.status === 'review' ? (
                    <button className={`${styles.btnAction} ${styles.btnReview}`}>Review now</button>
                  ) : (
                    <button className={`${styles.btnAction} ${styles.btnScheduled}`} disabled>Scheduled</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
