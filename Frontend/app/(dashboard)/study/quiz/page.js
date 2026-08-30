'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams, useRouter } from 'next/navigation';
import { summariesApi } from '../../../../lib/summarizer-api';
import styles from './quiz.module.css';

export default function QuizPage() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState('B');

  const options = [
    { letter: 'A', text: 'The chain rule — differentiate the outer function first' },
    { letter: 'B', text: 'The LIATE rule — Logarithm, Inverse trig, Algebraic, Trig, Exponential' },
    { letter: 'C', text: 'The power rule — reduce exponent by 1 and divide by new exponent' },
    { letter: 'D', text: 'The quotient rule — differentiate numerator and denominator separately' },
  ];

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
              className={`${styles.bar} ${i < current ? styles.barCompleted :
                  i === current ? styles.barCurrent :
                    styles.barPending
                }`}
            />
          ))}
        </div>
        <div className={styles.timer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
              const letter = ['A', 'B', 'C', 'D', 'E'][idx];
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
        <button className={styles.btnPrev} onClick={() => router.push('/study/session/summary')}>← Previous</button>
        <button className={styles.btnNext} onClick={() => router.push('/study/complete')}>Confirm & Next →</button>
      </div>
    </div>
  );
}
