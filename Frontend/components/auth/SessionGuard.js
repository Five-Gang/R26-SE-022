'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const SessionContext = createContext({ student: null });

export function useSession() {
  return useContext(SessionContext);
}

export default function SessionGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [student, setStudent] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = window.localStorage.getItem('access_token');

    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
      return () => { cancelled = true; };
    }

    fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired');
        return response.json();
      })
      .then((profile) => {
        if (!cancelled) {
          setStudent(profile);
          setChecking(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        window.localStorage.removeItem('access_token');
        router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
      });

    return () => { cancelled = true; };
  }, [pathname, router]);

  if (checking || !student) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--color-text-secondary)' }}>Checking your student account...</main>;
  }

  return <SessionContext.Provider value={{ student }}>{children}</SessionContext.Provider>;
}
