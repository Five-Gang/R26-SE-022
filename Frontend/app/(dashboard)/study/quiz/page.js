'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
          Question <strong>3</strong> of 8 · Integration Methods
        </div>
        
        <div className={styles.progressBars}>
          <div className={`${styles.bar} ${styles.barCompleted}`}></div>
          <div className={`${styles.bar} ${styles.barCompleted}`}></div>
          <div className={`${styles.bar} ${styles.barCurrent}`}></div>
          <div className={`${styles.bar} ${styles.barPending}`}></div>
          <div className={`${styles.bar} ${styles.barPending}`}></div>
          <div className={`${styles.bar} ${styles.barPending}`}></div>
          <div className={`${styles.bar} ${styles.barPending}`}></div>
          <div className={`${styles.bar} ${styles.barPending}`}></div>
        </div>

        <div className={styles.timer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          02:14
        </div>
      </div>

      {/* Main Question Card */}
      <div className={styles.card}>
        <span className={styles.badge}>Multiple Choice</span>
        <h2 className={styles.questionText}>
          Which rule is used to choose u when applying integration by parts to a product of functions?
        </h2>

        <div className={styles.optionsList}>
          {options.map((option) => (
            <div 
              key={option.letter}
              className={`${styles.option} ${selectedOption === option.letter ? styles.optionSelected : ''}`}
              onClick={() => setSelectedOption(option.letter)}
            >
              <div className={styles.optionLetter}>{option.letter}</div>
              <div className={styles.optionText}>{option.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        <button className={styles.btnPrev} onClick={() => router.push('/study/session/summary')}>← Previous</button>
        <button className={styles.btnNext} onClick={() => router.push('/study/complete')}>Confirm & Next →</button>
      </div>
    </div>
  );
}
