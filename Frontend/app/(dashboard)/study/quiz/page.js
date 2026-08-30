'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { summariesApi } from '../../../../lib/summarizer-api';
import styles from './quiz.module.css';

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

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!summaryId) return;
    setLoading(true);
    summariesApi.get(summaryId)
      .then((res) => {
        if (res?.quiz && Array.isArray(res.quiz) && res.quiz.length > 0) {
          setQuestions(res.quiz);
        } else if (res?.quiz_questions && Array.isArray(res.quiz_questions) && res.quiz_questions.length > 0) {
          setQuestions(res.quiz_questions);
        }
      })
      .catch((err) => console.error('Failed to load quiz:', err))
      .finally(() => setLoading(false));
  }, [summaryId]);

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

  const handleNext = () => {
    if (!revealed) {
      setRevealed(true);
    } else {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setRevealed(false);
      } else {
        // Calculate score and navigate to completion page
        let correctCount = 0;
        questions.forEach((quest, idx) => {
          if (answers[idx] === quest.correct_answer) {
            correctCount++;
          }
        });
        const scorePct = Math.round((correctCount / questions.length) * 100);
        router.push(`/study/complete?score=${scorePct}&total=${questions.length}&correct=${correctCount}`);
      }
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setRevealed(false);
    } else {
      router.push('/study/session/summary');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Quiz Questions…</div>
      </div>
    );
  }

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
