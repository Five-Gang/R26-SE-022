'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { summariesApi } from '../../../../lib/summarizer-api';
import styles from './quiz.module.css';

export default function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const summaryId = searchParams.get('summary');

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // selected answer per question
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!summaryId) return;
    summariesApi.get(summaryId)
      .then((s) => {
        const qs = s.questions || [];
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [summaryId]);

  // Timer per question
  useEffect(() => {
    if (loading || done || revealed) return;
    setTimeLeft(120);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setRevealed(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, loading, done]);

  const q = questions[current];
  const progress = questions.length > 0 ? ((current) / questions.length) * 100 : 0;

  const selectAnswer = (ans) => {
    if (revealed) return;
    const next = [...answers];
    next[current] = ans;
    setAnswers(next);
  };

  const confirm = () => {
    clearInterval(timerRef.current);
    setRevealed(true);
  };

  const next = () => {
    setRevealed(false);
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const isCorrect = (ans) => {
    if (!q) return false;
    const correct = q.correct_answer || '';
    // MCQ: compare option letter/text
    if (q.options) {
      const idx = q.options.indexOf(ans);
      const letters = ['A', 'B', 'C', 'D', 'E'];
      return ans === correct || (idx >= 0 && letters[idx] === correct);
    }
    return ans?.toLowerCase().trim() === correct?.toLowerCase().trim();
  };

  const score = answers.filter((a, i) => {
    const qq = questions[i];
    if (!qq || !a) return false;
    const correct = qq.correct_answer || '';
    if (qq.options) {
      const idx = qq.options.indexOf(a);
      const letters = ['A','B','C','D','E'];
      return a === correct || (idx >= 0 && letters[idx] === correct);
    }
    return a?.toLowerCase().trim() === correct?.toLowerCase().trim();
  }).length;

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  if (loading) return (
    <div className={styles.stateCenter}><div className={styles.spinner}/><p>Loading quiz…</p></div>
  );

  if (questions.length === 0) return (
    <div className={styles.stateCenter}>
      <p>No quiz questions found.</p>
      <button className={styles.btnBack} onClick={() => router.back()}>← Back</button>
    </div>
  );

  if (done) return (
    <div className={styles.container}>
      <div className={styles.doneCard}>
        <div className={styles.doneIcon}>{score >= questions.length * 0.7 ? '🏆' : '📝'}</div>
        <h2 className={styles.doneTitle}>Quiz Complete!</h2>
        <div className={styles.scoreCircle}>
          <span className={styles.scoreNum}>{score}</span>
          <span className={styles.scoreDen}>/ {questions.length}</span>
        </div>
        <p className={styles.scoreLabel}>
          {score >= questions.length * 0.8 ? 'Excellent!' :
           score >= questions.length * 0.6 ? 'Good work!' : 'Keep practicing!'}
        </p>
        <div className={styles.doneActions}>
          <button className={styles.btnOutline} onClick={() => { setCurrent(0); setAnswers(new Array(questions.length).fill(null)); setRevealed(false); setDone(false); }}>
            Retry
          </button>
          <button className={styles.btnPrimary} onClick={() => router.push('/study')}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.progressInfo}>
          Question <strong>{current + 1}</strong> of {questions.length}
          {q?.learning_outcome && <span className={styles.loTag}>{q.learning_outcome}</span>}
        </div>
        <div className={styles.progressBars}>
          {questions.map((_, i) => (
            <div
              key={i}
              className={`${styles.bar} ${
                i < current ? styles.barCompleted :
                i === current ? styles.barCurrent :
                styles.barPending
              }`}
            />
          ))}
        </div>
        <div className={styles.timer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {mins}:{secs}
        </div>
      </div>

      {/* Question Card */}
      <div className={styles.card}>
        <span className={styles.badge}>
          {q.type === 'mcq' ? 'Multiple Choice' :
           q.type === 'true_false' ? 'True / False' :
           q.type === 'scenario' ? 'Scenario' : 'Short Answer'}
          {q.difficulty && (
            <span className={`${styles.diffBadge} ${styles[`diff_${q.difficulty}`]}`}>
              {q.difficulty}
            </span>
          )}
        </span>
        <h2 className={styles.questionText}>{q.question}</h2>

        {/* MCQ / true_false options */}
        {q.options && (
          <div className={styles.optionsList}>
            {q.options.map((opt, idx) => {
              const letter = ['A','B','C','D','E'][idx];
              const isSelected = answers[current] === opt;
              const isCorrectOpt = revealed && isCorrect(opt);
              const isWrong = revealed && isSelected && !isCorrect(opt);
              return (
                <div
                  key={idx}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${isCorrectOpt ? styles.optionCorrect : ''} ${isWrong ? styles.optionWrong : ''}`}
                  onClick={() => selectAnswer(opt)}
                >
                  <div className={styles.optionLetter}>{letter}</div>
                  <div className={styles.optionText}>{opt}</div>
                  {isCorrectOpt && <span className={styles.optCheck}>✓</span>}
                  {isWrong && <span className={styles.optX}>✗</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Short answer */}
        {!q.options && (
          <textarea
            className={styles.shortAnswer}
            placeholder="Type your answer…"
            value={answers[current] || ''}
            onChange={(e) => selectAnswer(e.target.value)}
            disabled={revealed}
            rows={3}
          />
        )}

        {/* Explanation (after reveal) */}
        {revealed && q.explanation && (
          <div className={styles.explanation}>
            <span className={styles.explainLabel}>💡 Explanation</span>
            <p>{q.explanation}</p>
            {!q.options && (
              <p className={styles.correctAns}>Correct answer: <strong>{q.correct_answer}</strong></p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className={styles.bottomNav}>
        <button className={styles.btnPrev} onClick={() => { if (current > 0) { setCurrent(c => c - 1); setRevealed(false); }}}>
          ← Previous
        </button>
        {!revealed ? (
          <button className={styles.btnNext} onClick={confirm} disabled={!answers[current]}>
            Confirm &amp; Reveal →
          </button>
        ) : (
          <button className={styles.btnNext} onClick={next}>
            {current + 1 >= questions.length ? 'Finish Quiz →' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
