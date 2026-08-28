'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const features = [
    "No configuration needed",
    "Works with any lecture material",
    "Smart reminders from day one",
    "Part of SLIIT research R26-SE-022"
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
              Get started in<br />
              under a minute.
            </h1>
            
            <ul className={styles.featuresList}>
              {features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <div className={styles.bullet}>✓</div>
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

      {/* Right Pane - Signup Form */}
      <div className={styles.rightPane}>
        <div className={styles.signupCard}>
          <h2 className={styles.cardTitle}>Create your account</h2>
          <p className={styles.cardSubtitle}>Join the AuraLearn research cohort.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); router.push('/dashboard'); }}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="fullName" className={styles.label}>Full name</label>
                <input 
                  type="text" 
                  id="fullName" 
                  className={styles.input} 
                  placeholder="K.K.G.Y. Mihiraj" 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="studentId" className={styles.label}>Student ID</label>
                <input 
                  type="text" 
                  id="studentId" 
                  className={styles.input} 
                  placeholder="IT22224552" 
                  required 
                />
              </div>
            </div>
            
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
                placeholder="••••••••" 
                required 
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                className={styles.input} 
                placeholder="••••••••" 
                required 
              />
            </div>
            
            <div className={styles.checkboxGroup}>
              <input type="checkbox" id="consent" className={styles.checkbox} required />
              <label htmlFor="consent" className={styles.checkboxLabel}>
                I consent to participate in the AuraLearn research study
              </label>
            </div>
            
            <button type="submit" className={styles.primaryBtn}>
              Create Account & Start Studying
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
