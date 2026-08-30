'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules');
  }, [router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '1rem',
      color: '#64748b', fontFamily: 'var(--font, system-ui)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #e2e8f0', borderTopColor: '#0f766e',
        animation: 'spin 0.75s linear infinite',
      }} />
      <p style={{ fontSize: '0.9rem' }}>Redirecting to Modules…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
