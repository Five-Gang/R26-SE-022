'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { summariesApi } from '../../../../lib/summarizer-api';
import styles from './flashcard.module.css';

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const summaryId = searchParams.get('summary');

  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState([]); // 'easy'|'hard'|'again' per card
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [moduleId, setModuleId] = useState(null);

  useEffect(() => {
    if (!summaryId) return;
    summariesApi.get(summaryId)
      .then((s) => {
        const fc = s.flashcards || [];
        setCards(fc);
        setReviewed(new Array(fc.length).fill(null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [summaryId]);

  const card = cards[current];
  const progress = cards.length > 0 ? Math.round(((current + 1) / cards.length) * 100) : 0;

  const rate = (choice) => {
    const next = [...reviewed];
    next[current] = choice;
    setReviewed(next);
    setFlipped(false);
    if (current + 1 >= cards.length) {
      setDone(true);
    } else {
      setTimeout(() => setCurrent((c) => c + 1), 220);
    }
  };

  const diffColor = { easy: '#0f766e', medium: '#f59e0b', hard: '#ef4444' };

  if (loading) return (
    <div className={styles.stateCenter}><div className={styles.spinner}/><p>Loading flashcards…</p></div>
  );

  if (cards.length === 0) return (
    <div className={styles.stateCenter}>
      <p>No flashcards found.</p>
      <button className={styles.btnBack} onClick={() => router.back()}>← Back</button>
    </div>
  );

  if (done) {
    const easy  = reviewed.filter(r => r === 'easy').length;
    const hard  = reviewed.filter(r => r === 'hard').length;
    const again = reviewed.filter(r => r === 'again').length;
    return (
      <div className={styles.container}>
        <div className={styles.doneCard}>
          <div className={styles.doneIcon}>🎉</div>
          <h2 className={styles.doneTitle}>Flashcards Complete!</h2>
          <p className={styles.doneSub}>You reviewed {cards.length} cards</p>
          <div className={styles.doneStats}>
            <div className={styles.doneStat} style={{ color: '#0f766e' }}><span>{easy}</span>Easy</div>
            <div className={styles.doneStat} style={{ color: '#f59e0b' }}><span>{hard}</span>Hard</div>
            <div className={styles.doneStat} style={{ color: '#ef4444' }}><span>{again}</span>Again</div>
          </div>
          <div className={styles.doneActions}>
            <button className={styles.btnOutline} onClick={() => { setCurrent(0); setFlipped(false); setReviewed(new Array(cards.length).fill(null)); setDone(false); }}>
              Review Again
            </button>
            <button className={styles.btnPrimary} onClick={() => router.push(`/study/generate?summary=${summaryId}`)}>
              Generate Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.pageTitle}>Flashcard Review</div>
        <div className={styles.cardMeta}>
          Card <strong>{current + 1}</strong> / {cards.length}
          {card?.learning_outcome && <span className={styles.loTag}>{card.learning_outcome}</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressOuter}>
        <div className={styles.progressInner} style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard (flip) */}
      <div
        className={`${styles.flashcard} ${flipped ? styles.flashcardFlipped : ''}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={styles.flashcardInner}>
          {/* Front */}
          <div className={styles.flashcardFront}>
            <span className={styles.badge}>
              {card?.difficulty && (
                <span style={{ color: diffColor[card.difficulty] }}>
                  {card.difficulty.toUpperCase()} ·{' '}
                </span>
              )}
              Question
            </span>
            <h2 className={styles.question}>{card?.front}</h2>
            <div className={styles.hintText}>Tap to reveal answer</div>
          </div>
          {/* Back */}
          <div className={styles.flashcardBack}>
            <span className={styles.badge} style={{ background: '#f0fdf4', color: '#0f766e' }}>Answer</span>
            <p className={styles.answer}>{card?.back}</p>
            {card?.source && <div className={styles.sourceTag}>📎 {card.source}</div>}
          </div>
        </div>
      </div>

      {/* Rating buttons — only show when flipped */}
      {flipped && (
        <div className={styles.actionsContainer}>
          <button className={`${styles.actionBtn} ${styles.btnAgain}`} onClick={() => rate('again')}>
            <span>🤯</span> Again
          </button>
          <button className={`${styles.actionBtn} ${styles.btnHard}`} onClick={() => rate('hard')}>
            <span>🤔</span> Hard
          </button>
          <button className={`${styles.actionBtn} ${styles.btnEasy}`} onClick={() => rate('easy')}>
            <span>🤩</span> Easy
          </button>
        </div>
      )}

      {!flipped && (
        <div className={styles.progressSection}>
          <div className={styles.progressStats}>
            {reviewed.filter(Boolean).length} reviewed · {cards.length - current - 1} remaining
          </div>
        </div>
      )}
    </div>
  );
}
