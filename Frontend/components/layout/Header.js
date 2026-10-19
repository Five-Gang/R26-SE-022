'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../auth/SessionGuard';
import { useOnboarding } from '../../context/OnboardingContext';
import styles from './Header.module.css';

// Items that are GATED behind completing the onboarding setup
const GATED_PATHS = ['/study', '/focus-monitor', '/tutor', '/analytics', '/rewards'];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { student } = useSession();
  const { setupComplete, openWizard } = useOnboarding();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tooltip, setTooltip] = useState(null); // { label, x, y }
  const dropdownRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '⊞' },
    { name: 'Modules',   path: '/modules',   icon: '📖' },
    { name: 'Reminders', path: '/study/queue', icon: '⏰', gated: true },
    { name: 'Focus',     path: '/focus-monitor', icon: '🎯', gated: true },
    { name: 'AI Tutor',  path: '/tutor',     icon: '🤖', gated: true },
    { name: 'Analytics', path: '/analytics', icon: '📈', gated: true },
    { name: 'Rewards',   path: '/rewards',   icon: '🏆', gated: true },
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

  // Handle click on a gated nav item when setup isn't complete
  const handleGatedClick = (e, item) => {
    if (item.gated && !setupComplete) {
      e.preventDefault();
      openWizard();
    }
  };

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
          const isLocked = item.gated && !setupComplete;
          const isActive =
            !isLocked && (
              pathname === item.path ||
              (item.path !== '/dashboard' && item.path !== '/' && pathname?.startsWith(
                item.path.split('/')[1] ? '/' + item.path.split('/')[1] : item.path
              ))
            );

          return (
            <Link
              key={item.name}
              href={isLocked ? '#' : item.path}
              onClick={(e) => handleGatedClick(e, item)}
              className={`${styles.navLink} ${isActive ? styles.active : ''} ${isLocked ? styles.locked : ''}`}
              title={isLocked ? 'Complete setup to unlock' : item.name}
              aria-disabled={isLocked}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.name}</span>
              {isLocked && <span className={styles.lockIcon} aria-hidden="true">🔒</span>}
            </Link>
          );
        })}

        {/* Setup banner — only shown when not complete */}
        {!setupComplete && (
          <button className={styles.setupBanner} onClick={openWizard} type="button">
            ✨ Complete Setup
          </button>
        )}
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
                {!setupComplete && (
                  <div className={styles.setupStatusChip}>⚡ Setup incomplete</div>
                )}
              </div>

              {!setupComplete && (
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.setupMenuItem}`}
                  onClick={() => { setDropdownOpen(false); openWizard(); }}
                >
                  <span className={styles.menuIcon}>✨</span>
                  Complete Setup
                </button>
              )}

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
            const isLocked = item.gated && !setupComplete;
            const isActive = !isLocked && (pathname === item.path || pathname?.startsWith(item.path + '/'));
            return (
              <Link
                key={item.name}
                href={isLocked ? '#' : item.path}
                onClick={(e) => handleGatedClick(e, item)}
                className={`${styles.mobileNavLink} ${isActive ? styles.active : ''} ${isLocked ? styles.locked : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.name}
                {isLocked && <span className={styles.lockIcon} style={{ marginLeft: 'auto' }}>🔒</span>}
              </Link>
            );
          })}
          {!setupComplete && (
            <button className={styles.mobileSetupBtn} onClick={() => { setMobileMenuOpen(false); openWizard(); }}>
              ✨ Complete Setup to unlock all features
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
