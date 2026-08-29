import React from 'react';
import Header from '../../components/layout/Header';
import SessionGuard from '../../components/auth/SessionGuard';

export default function DashboardLayout({ children }) {
  return (
    <SessionGuard>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </SessionGuard>
  );
}
