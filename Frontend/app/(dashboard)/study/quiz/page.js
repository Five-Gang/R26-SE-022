'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { summariesApi } from '../../../../lib/summarizer-api';
import styles from './quiz.module.css';

const ARS_API = '/api/ars';

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    type: 'mcq',
    question: 'Which rule is most effective for choosing u and dv in Integration by Parts?',
    options: [
      'The chain rule — differentiate the outer function first',
      'The LIATE rule — Logarithm, Inverse trig, Algebraic, Trig, Exponential',
      'The power rule — reduce exponent by 1 and divide by new exponent',
      'The quotient rule — differentiate numerator and denominator separately'
    ],
    correct_answer: 'The LIATE rule — Logarithm, Inverse trig, Algebraic, Trig, Exponential',
    explanation: 'LIATE gives the priority order for choosing u. Functions earlier in LIATE (like Logarithms) should be chosen as u because their derivatives simplify.',
    difficulty: 'medium',
    learning_outcome: 'LO2 — Integration Methods'
  },
  {
    id: 2,
    type: 'mcq',
    question: 'What is the derivative of f(x) = e^(2x)?',
    options: [
      'e^(2x)',
      '2e^(2x)',
      '2x e^(2x)',
      'e^(x)'
    ],
    correct_answer: '2e^(2x)',
    explanation: 'By the chain rule, d/dx [e^(g(x))] = g\'(x) e^(g(x)). Here g(x) = 2x, so g\'(x) = 2.',
    difficulty: 'easy',
    learning_outcome: 'LO1 — Calculus Basics'
  },
  {
    id: 3,
    type: 'mcq',
    question: 'In Secure Software Development, what does the "I" in STRIDE threat modeling stand for?',
    options: [
      'Identity Theft',
      'Information Disclosure',
      'Information Tampering',
      'Input Injection'
    ],
    correct_answer: 'Information Disclosure',
    explanation: 'STRIDE stands for Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.',
    difficulty: 'hard',
    learning_outcome: 'LO3 — Security Threat Modeling'
  }
];

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryId = searchParams.get('summary') || searchParams.get('id');
  const moduleParam = searchParams.get('module');

  const [questions, setQuestions] = useState(summaryId ? [] : DEFAULT_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins
  const [loading, setLoading] = useState(Boolean(summaryId));
  const [loadError, setLoadError] = useState(null);
  const [moduleId, setModuleId] = useState(moduleParam || null);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!summaryId) return;
    summariesApi.get(summaryId)
      .then((res) => {
        let loaded = [];
        if (res?.questions && Array.isArray(res.questions) && res.questions.length > 0) {
          loaded = res.questions;
        } else if (res?.quiz && Array.isArray(res.quiz) && res.quiz.length > 0) {
          loaded = res.quiz;
        } else if (res?.quiz_questions && Array.isArray(res.quiz_questions) && res.quiz_questions.length > 0) {
          loaded = res.quiz_questions;
        } else if (res?.content) {
          try {
            const parsed = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;
            if (Array.isArray(parsed) && parsed.length > 0) {
              loaded = parsed;
            } else if (parsed?.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
              loaded = parsed.questions;
            } else if (parsed?.quiz && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
              loaded = parsed.quiz;
            }
          } catch (e) {
            console.error('Failed to parse quiz content JSON:', e);
          }
        }

        if (loaded.length > 0) {
          setQuestions(loaded);
          setTimeLeft(Math.max(300, loaded.length * 60));
          if (!moduleParam && res?.module_id) setModuleId(res.module_id);
        } else {
          setLoadError('No questions were found for this quiz session. Please generate a new quiz.');
        }
      })
      .catch((err) => {
        console.error('Failed to load quiz:', err);
        setLoadError(err.message || 'Failed to load quiz');
      })
      .finally(() => setLoading(false));
  }, [summaryId, moduleParam]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const q = questions[current] || DEFAULT_QUESTIONS[0];

  const selectAnswer = (opt) => {
    setAnswers((prev) => ({ ...prev, [current]: opt }));
  };

  const isCorrect = (opt) => {
    return opt === q.correct_answer;
  };

  const handleNext = async () => {
    if (!revealed) {
      setRevealed(true);
    } else {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setRevealed(false);
      } else {
        // Calculate score
        let correctCount = 0;
        questions.forEach((quest, idx) => {
          if (answers[idx] === quest.correct_answer) correctCount++;
        });
        const scorePct = Math.round((correctCount / questions.length) * 100);
        const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

        // Register review items in the ARS backend so the scheduler can create reminders
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (!token) {
          setLoadError('Your session expired. Please sign in again before completing the quiz.');
          return;
        }

        if (token) {
          const upsertPromises = questions.map((quest, idx) => {
            const isCorrect = answers[idx] === quest.correct_answer;
            const itemScore = isCorrect ? 100 : Math.max(0, scorePct - 10);
            return fetch(`${ARS_API}/api/v1/review-items/upsert`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                item_key: quest.id
                  ? `q-${summaryId || 'default'}-${quest.id}`
                  : `q-${summaryId || 'default'}-${idx}`,
                title: quest.question?.slice(0, 120) || `Question ${idx + 1}`,
                topic: quest.learning_outcome || quest.topic || null,
                module_id: moduleId || null,
                difficulty: quest.difficulty || 'medium',
                quality_percentage: itemScore,
              }),
            }).then(async (response) => {
              if (!response.ok) {
                const detail = await response.text();
                throw new Error(`Review item registration failed (${response.status}): ${detail}`);
              }
              return response.json();
            });
          });
          // Wait until the review items exist before the completion page triggers
          // the scheduling tick. Otherwise the tick can run against an empty queue.
          try {
            await Promise.all(upsertPromises);
          } catch (error) {
            console.error('Failed to register quiz review items:', error);
            setLoadError('Your quiz result could not be scheduled for review. Please try again.');
            return;
          }
        }
        router.push(
          `/study/complete?score=${scorePct}&total=${questions.length}&correct=${correctCount}&time=${durationMinutes}${
            summaryId ? `&summary=${summaryId}` : ''
          }${moduleId ? `&module=${encodeURIComponent(moduleId)}` : ''}`
        );
      }
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setRevealed(false);
    } else {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else if (summaryId) {
        router.push(`/study/session/summary?summary=${summaryId}`);
      } else {
        router.push('/study/session/summary');
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Quiz Questions…</div>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {loadError || 'No quiz questions available.'}
          </p>
          <button
            onClick={() => router.push('/study/generate')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Back to Study Generator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else if (summaryId) {
                router.push(`/study/session/summary?summary=${summaryId}`);
              } else {
                router.push('/study/session/summary');
              }
            }}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#334155',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            ← Back
          </button>
          <div className={styles.progressInfo}>
            Question <strong>{current + 1}</strong> of {questions.length}
            {q?.learning_outcome && <span className={styles.loTag}>{q.learning_outcome}</span>}
          </div>
        </div>
        <div className={styles.progressBars}>
          {questions.map((_, i) => (
            <div
              key={i}
              className={`${styles.bar} ${
                i < current
                  ? styles.barCompleted
                  : i === current
                  ? styles.barCurrent
                  : styles.barPending
              }`}
            />
          ))}
        </div>
        <div className={styles.timer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {mins}:{secs}
        </div>
      </div>

      {/* Question Card */}
      <div className={styles.card}>
        <span className={styles.badge}>
          {q.type === 'mcq'
            ? 'Multiple Choice'
            : q.type === 'true_false'
            ? 'True / False'
            : q.type === 'scenario'
            ? 'Scenario'
            : 'Short Answer'}
          {q.difficulty && (
            <span className={`${styles.diffBadge} ${styles[`diff_${q.difficulty}`] || ''}`}>
              {q.difficulty}
            </span>
          )}
        </span>
        <h2 className={styles.questionText}>{q.question}</h2>

        {/* MCQ / Options */}
        {q.options && Array.isArray(q.options) && (
          <div className={styles.optionsList}>
            {q.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D', 'E'][idx] || String.fromCharCode(65 + idx);
              const isSelected = answers[current] === opt;
              const isCorrectOpt = revealed && isCorrect(opt);
              const isWrong = revealed && isSelected && !isCorrect(opt);
              return (
                <div
                  key={idx}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${
                    isCorrectOpt ? styles.optionCorrect : ''
                  } ${isWrong ? styles.optionWrong : ''}`}
                  onClick={() => !revealed && selectAnswer(opt)}
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
            onChange={(e) => !revealed && selectAnswer(e.target.value)}
            disabled={revealed}
            rows={3}
          />
        )}

        {/* Explanation (after reveal) */}
        {revealed && q.explanation && (
          <div className={styles.explanation}>
            <span className={styles.explainLabel}>💡 Explanation</span>
            <p>{q.explanation}</p>
            {!q.options && q.correct_answer && (
              <p className={styles.correctAns}>
                Correct answer: <strong>{q.correct_answer}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className={styles.bottomNav}>
        <button className={styles.btnPrev} onClick={handlePrev}>
          ← Previous
        </button>
        <button
          className={styles.btnNext}
          onClick={handleNext}
          disabled={answers[current] === undefined}
        >
          {!revealed
            ? 'Check Answer'
            : current + 1 < questions.length
            ? 'Next Question →'
            : 'Finish Quiz 🎉'}
        </button>
      </div>
    </div>
  );
}
