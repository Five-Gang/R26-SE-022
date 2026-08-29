'use client';

import React, { useEffect, useState } from 'react';
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

  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/v1/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load materials');
        return response.json();
      })
      .then((result) => setMaterials((result.materials || []).map((material) => ({
        ...material,
        date: material.date ? new Date(material.date).toLocaleDateString() : 'Recently added',
        icon: '📄',
      }))))
      .catch(() => setError('Your materials could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

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
          {loading && <p>Loading your materials...</p>}
          {!loading && error && <p role="alert">{error}</p>}
          {!loading && !error && filteredMaterials.length === 0 && <p>No materials have been added to your account yet.</p>}
          {!loading && !error && filteredMaterials.map(mat => (
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
