'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [toggles, setToggles] = useState({
    daily: true,
    focus: true,
    quiz: true,
    weekly: false
  });

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems = [
    { name: 'Profile', icon: '👤', path: '/settings', active: true },
    { name: 'Notifications', icon: '🔔', path: '/settings', active: false },
    { name: 'Focus Settings', icon: '🎯', path: '/study/focus-consent', active: false },
    { name: 'Study Preferences', icon: '📊', path: '/study', active: false },
    { name: 'Privacy & Data', icon: '🔒', path: '/settings', active: false },
    { name: 'Appearance', icon: '🎨', path: '/settings', active: false },
  ];

  return (
    <div className={styles.container}>
      
      {/* Settings Sidebar */}
      <aside className={styles.sidebar}>
        {navItems.map((item, idx) => (
          <Link 
            key={idx} 
            href={item.path}
            className={`${styles.navLink} ${item.active ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Profile Settings</h1>

        <div className={styles.contentGrid}>
          
          {/* Left Column: Form */}
          <div className={styles.leftCol}>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input type="text" className={styles.input} defaultValue="K.K.G.Y. Mihiraj" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Student ID</label>
              <input type="text" className={styles.input} defaultValue="IT22224552" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input type="email" className={styles.input} defaultValue="mihiraj@sliit.lk" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Course</label>
              <input type="text" className={styles.input} defaultValue="BSc (Hons) IT" />
            </div>

            <button className={styles.btnSave}>Save Changes</button>

          </div>

          {/* Right Column: Preferences */}
          <div className={styles.rightCol}>
            
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Notification Preferences</h2>
              
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Daily study reminders</span>
                <div 
                  className={`${styles.toggleSwitch} ${toggles.daily ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => handleToggle('daily')}
                >
                  <div className={`${styles.toggleThumb} ${toggles.daily ? styles.thumbOn : ''}`}></div>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Focus alerts</span>
                <div 
                  className={`${styles.toggleSwitch} ${toggles.focus ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => handleToggle('focus')}
                >
                  <div className={`${styles.toggleThumb} ${toggles.focus ? styles.thumbOn : ''}`}></div>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Quiz due notifications</span>
                <div 
                  className={`${styles.toggleSwitch} ${toggles.quiz ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => handleToggle('quiz')}
                >
                  <div className={`${styles.toggleThumb} ${toggles.quiz ? styles.thumbOn : ''}`}></div>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Weekly progress digest</span>
                <div 
                  className={`${styles.toggleSwitch} ${toggles.weekly ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => handleToggle('weekly')}
                >
                  <div className={`${styles.toggleThumb} ${toggles.weekly ? styles.thumbOn : ''}`}></div>
                </div>
              </div>

            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Research Participation</h2>
              <p className={styles.researchText}>
                You are enrolled in SLIIT research project R26-SE-022. Your anonymised study data contributes to the AuraLearn study.
              </p>
              <div className={styles.badge}>
                ✓ Active participant
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
