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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '⊞' },
    { name: 'Modules', path: '/modules', icon: '📖' },
    { name: 'Study', path: '/study/queue', icon: '🎴' },
    { name: 'Focus', path: '/focus-monitor', icon: '🎯' },
    { name: 'AI Tutor', path: '/tutor', icon: '🤖' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Rewards', path: '/rewards', icon: '🏆' },
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setDropdownOpen(false);
    window.localStorage.removeItem('access_token');
    router.push('/login');
  };

  const displayName = student?.name || student?.email || 'Student';
  const avatarInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={styles.header}>
      {/* Logo */}
      <div className={styles.leftSection}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.logoIcon}>AL</span>
          <span className={styles.logoText}>AuraLearn</span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== '/dashboard' && item.path !== '/' && pathname?.startsWith(
              item.path.split('/')[1] ? '/' + item.path.split('/')[1] : item.path
            ));

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              title={item.name}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: User menu + mobile toggle */}
      <div className={styles.rightSection}>
        {/* Settings shortcut */}
        <Link href="/settings" className={styles.settingsBtn} title="Settings">
          ⚙️
        </Link>

        {/* Avatar / User dropdown */}
        <div className={styles.avatarWrapper} ref={dropdownRef}>
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
                Profile & Settings
              </Link>

              <Link
                href="/rewards"
                className={styles.menuItem}
                onClick={() => setDropdownOpen(false)}
              >
                <span className={styles.menuIcon}>🏆</span>
                My Rewards
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

        {/* Mobile hamburger */}
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={`${styles.hamburger} ${mobileMenuOpen ? styles.hamburgerOpen : ''}`} />
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`${styles.mobileNavLink} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
