'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './summary.module.css';

export default function SummaryPage() {
  const router = useRouter();
  const concepts = [
    {
      priority: 'HIGH',
      title: 'Substitution Method',
      description: 'The substitution method replaces a complex expression with a single variable u. Identify a function and its derivative within the integrand, substitute, integrate, then back-substitute.',
    },
    {
      priority: 'HIGH',
      title: 'Integration by Parts',
      description: 'Based on the product rule: ∫u dv = uv - ∫v du. Choose u to be easily differentiable and dv to be easily integrable (LIATE rule). Particularly useful for products of functions.',
    },
    {
      priority: 'MEDIUM',
      title: 'Trigonometric Integrals',
      description: 'Involves powers of sin, cos, tan and their combinations. Use Pythagorean identities and half-angle formulas to simplify before integrating. Systematic approach required.',
    },
    {
      priority: 'LOW',
      title: 'Partial Fractions',
      description: 'Decompose rational functions into simpler fractions before integrating. Factor the denominator, set up the partial fraction form, solve for coefficients, then integrate each term.',
    },
  ];

  const getBadgeClass = (priority) => {
    switch (priority) {
      case 'HIGH': return styles.badgeHigh;
      case 'MEDIUM': return styles.badgeMedium;
      case 'LOW': return styles.badgeLow;
      default: return styles.badgeLow;
    }
  };

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>AI Summary</h1>
          <p className={styles.pageSubtitle}>Key concepts from Lecture 3 — Integration Methods</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnOutline}>Save Notes</button>
          <button className={styles.btnPrimary} onClick={() => router.push('/study/quiz')}>Start Quiz →</button>
        </div>
      </div>

      <div className={styles.conceptList}>
        {concepts.map((concept, index) => (
          <div key={index} className={styles.conceptCard}>
            <div className={`${styles.badge} ${getBadgeClass(concept.priority)}`}>
              {concept.priority}
            </div>
            <div className={styles.conceptContent}>
              <h3 className={styles.conceptTitle}>{concept.title}</h3>
              <p className={styles.conceptDesc}>{concept.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
