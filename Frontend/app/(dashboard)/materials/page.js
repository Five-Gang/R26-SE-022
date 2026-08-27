'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './materials.module.css';

export default function MaterialsPage() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Study', path: '/study', icon: '📚' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Materials', path: '/materials', icon: '📁' },
    { name: 'Reminders', path: '/study/queue', icon: '⏰' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const materials = [
    { id: 1, name: 'Integration Methods Lecture 3', subject: 'CS3042 - Mathematics', date: '2 days ago', status: 'Processed', icon: '📄', type: 'PDF' },
    { id: 2, name: 'Cell Membrane Structure & Transport', subject: 'BIO2012 - Biology', date: '5 days ago', status: 'Processed', icon: '📽️', type: 'PPTX' },
    { id: 3, name: 'Binary Search Trees and Graphs', subject: 'CS2041 - Data Structures', date: '1 week ago', status: 'Processed', icon: '📄', type: 'PDF' },
    { id: 4, name: 'Newton\'s Laws of Motion', subject: 'PHY101 - Physics', date: '2 weeks ago', status: 'Processed', icon: '📽️', type: 'PPTX' },
    { id: 5, name: 'Operating Systems - Scheduling Algorithms', subject: 'CS3011 - OS', date: '3 weeks ago', status: 'Processed', icon: '📄', type: 'PDF' },
    { id: 6, name: 'Introduction to Psychology', subject: 'PSY100', date: '1 month ago', status: 'Processed', icon: '📄', type: 'PDF' },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      
      <aside className={styles.sidebar}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </aside>

      <main className={styles.main}>
        
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Study Materials</h1>
            <p className={styles.pageSubtitle}>Your uploaded files, AI summaries, and flashcard decks.</p>
          </div>
          <Link href="/study" className={styles.btnUpload}>
            <span>+</span> Upload New
          </Link>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Search lectures, subjects..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className={styles.filterSelect}>
            <option>All Subjects</option>
            <option>CS3042</option>
            <option>BIO2012</option>
            <option>CS2041</option>
          </select>
        </div>

        <div className={styles.grid}>
          {filteredMaterials.map(mat => (
            <div key={mat.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.fileIcon}>{mat.icon}</div>
                <div className={styles.moreBtn}>⋮</div>
              </div>
              <h3 className={styles.fileName}>{mat.name}</h3>
              <div className={styles.fileSubject}>{mat.subject}</div>
              
              <div className={styles.cardBottom}>
                <div className={styles.fileMeta}>{mat.date} · {mat.type}</div>
                <div className={styles.statusBadge}>{mat.status}</div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
