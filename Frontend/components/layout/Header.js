'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../auth/SessionGuard';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { student } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Study', path: '/study' },
    { name: 'Focus Monitor', path: '/focus-monitor' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'AI Tutor', path: '/tutor' },
    { name: 'Materials', path: '/materials' },
    { name: 'Reminders', path: '/study/queue' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    window.localStorage.removeItem('access_token');
    router.push('/login');
  };

  const displayName = student?.name || student?.email || 'Student';
  const avatarInitials = displayName.slice(0, 2).toUpperCase();

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

      <div className={styles.rightSection} ref={dropdownRef}>
        <div className={styles.avatarWrapper}>
          <button
            type="button"
            className={`${styles.avatar} ${dropdownOpen ? styles.open : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="User menu"
            aria-expanded={dropdownOpen}
            title={displayName}
          >
            {avatarInitials}
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.userName}>{student?.name || 'Student'}</div>
                <div className={styles.userEmail}>{student?.email || student?.student_id || ''}</div>
              </div>

              <Link
                href="/settings"
                className={styles.menuItem}
                onClick={() => setDropdownOpen(false)}
              >
                <span className={styles.menuIcon}>👤</span>
                Profile
              </Link>

              <button
                type="button"
                className={`${styles.menuItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                <span className={styles.menuIcon}>🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
