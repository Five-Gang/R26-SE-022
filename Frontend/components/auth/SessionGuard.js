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
      if (process.env.NODE_ENV === 'development') {
        window.localStorage.setItem('access_token', 'dev-token');
        setStudent({ id: 'dev-student', name: 'Research Student', email: 'student@sliit.lk' });
        setChecking(false);
        return () => { cancelled = true; };
      }
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
          const sid = profile?.student_id || profile?._id || profile?.id;
          const normalized = {
            ...profile,
            id: sid,
            _id: sid,
            student_id: sid,
          };
          setStudent(normalized);
          setChecking(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (process.env.NODE_ENV === 'development') {
          setStudent({ id: 'dev-student', name: 'Research Student', email: 'student@sliit.lk' });
          setChecking(false);
          return;
        }
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
