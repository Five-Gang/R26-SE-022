'use client';

import React from 'react';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const features = [
    "Upload your lecture slides or PDF",
    "AI builds a personalised study plan",
    "Study with smart summaries + quizzes",
    "Adaptive reminders keep you on track"
  ];

  return (
    <div className={styles.container}>
      {/* Left Pane - Branding & Features */}
      <div className={styles.leftPane}>
        <div>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>AL</span>
            AuraLearn
          </div>
          
          <div className={styles.heroContent}>
            <h1 className={styles.heading}>
              Upload. Study.<br />
              Remember<br />
              everything.
            </h1>
            
            <ul className={styles.featuresList}>
              {features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <div className={styles.bullet}>
                    <div className={styles.bulletInner}></div>
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className={styles.footerText}>
          © 2026 AuraLearn · SLIIT R26-SE-022
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className={styles.rightPane}>
        <div className={styles.loginCard}>
          <h2 className={styles.cardTitle}>Sign in to AuraLearn</h2>
          <p className={styles.cardSubtitle}>Welcome back — your study plan is waiting.</p>
          
          <form onSubmit={(e) => e.preventDefault()}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <input 
                type="email" 
                id="email" 
                className={styles.input} 
                placeholder="mihiraj@sliit.lk" 
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input 
                type="password" 
                id="password" 
                className={styles.input} 
                placeholder="••••••••••" 
                required 
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.primaryBtn}>
                Sign in
              </button>
              <button type="button" className={styles.secondaryBtn}>
                Upload new lecture →
              </button>
            </div>
          </form>
          
          <div className={styles.signupPrompt}>
            No account? <Link href="/signup" className={styles.signupLink}>Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
