'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '../auth/SessionGuard';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  const { student } = useSession();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Study', path: '/study' },
    { name: 'AI Tutor', path: '/tutor' },
    { name: 'Materials', path: '/materials' },
    { name: 'Reminders', path: '/study/queue' },
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
          const isActive = pathname === item.path || (pathname?.startsWith(item.path) && item.path !== '/');
          
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
        <Link className={styles.avatar} href="/settings" aria-label="Open your profile" title="Open profile">
          {(student?.name || student?.email || 'Student').slice(0, 2).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
