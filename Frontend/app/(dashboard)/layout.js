'use client';

import React from 'react';
import Header from '../../components/layout/Header';
import { FocusProvider } from '../../context/FocusContext';
import FloatingFocusWidget from '../../components/layout/FloatingFocusWidget';

export default function DashboardLayout({ children }) {
  return (
    <FocusProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        {/* Persistent Floating Live Focus Indicator on all study pages */}
        <FloatingFocusWidget />
      </div>
    </FocusProvider>
  );
}
