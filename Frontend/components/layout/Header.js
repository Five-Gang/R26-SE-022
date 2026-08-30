'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard',      path: '/dashboard' },
    { name: 'Modules',        path: '/modules' },
    { name: 'Focus Monitor',  path: '/focus-monitor' },
    { name: 'AI Tutor',       path: '/tutor' },
    { name: 'Materials',      path: '/materials' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.logoIcon}>AL</span>
          AuraLearn
        </Link>
        <span className={styles.badge}>R26-SE-022</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          // /modules is also active for all AI generation sub-pages that originate from modules
          const studyRoutes = ['/study/generate', '/study/session', '/study/flashcards', '/study/quiz'];
          const isStudySubRoute = item.path === '/modules' && studyRoutes.some(r => pathname?.startsWith(r));
          const isActive = isStudySubRoute || pathname === item.path ||
            (pathname?.startsWith(item.path) && item.path !== '/');

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.rightSection}>
        <div className={styles.avatar}>
          KM
        </div>
      </div>
    </header>
  );
}
