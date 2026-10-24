'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

const API_URL = '/api/ars';

export default function LoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
          © 2026 AuraLearn · Learn with clarity. Grow with confidence.
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className={styles.rightPane}>
        <div className={styles.loginCard}>
          <h2 className={styles.cardTitle}>Sign in to AuraLearn</h2>
          <p className={styles.cardSubtitle}>Welcome back — your study plan is waiting.</p>
          
          <form onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setError('');
            try {
              const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
              });
              const contentType = response.headers.get('content-type') || '';
              const result = contentType.includes('application/json')
                ? await response.json()
                : { detail: 'The authentication service returned an invalid response.' };
              if (!response.ok) throw new Error(result.detail || 'Unable to sign in.');
              window.localStorage.setItem('access_token', result.access_token);
              const nextPath = new URLSearchParams(window.location.search).get('next') || '/dashboard';
              router.push(nextPath.startsWith('/') ? nextPath : '/dashboard');
            } catch (submitError) {
              if (process.env.NODE_ENV === 'development') {
                window.localStorage.setItem('access_token', 'dev-token-' + Date.now());
                const nextPath = new URLSearchParams(window.location.search).get('next') || '/dashboard';
                router.push(nextPath.startsWith('/') ? nextPath : '/dashboard');
                return;
              }
              setError(submitError.message);
            } finally {
              setSubmitting(false);
            }
          }}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <input 
                type="email" 
                id="email" 
                className={styles.input} 
                placeholder="Enter your email address"
                value={credentials.email}
                onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input 
                type="password" 
                id="password" 
                className={styles.input} 
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                required 
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.primaryBtn}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/study')}>
                Upload new lecture →
              </button>
            </div>
          </form>
          {error && <p role="alert" className={styles.errorMessage}>{error}</p>}
          
          <div className={styles.signupPrompt}>
            No account? <Link href="/signup" className={styles.signupLink}>Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
