'use client';

import React from 'react';
import Header from '../../components/layout/Header';
import SessionGuard from '../../components/auth/SessionGuard';
import { FocusProvider } from '../../context/FocusContext';
import OnboardingProvider from '../../context/OnboardingContext';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';
import FloatingFocusWidget from '../../components/layout/FloatingFocusWidget';
import EmotionInterventionToast from '../../components/reminders/EmotionInterventionToast';

export default function DashboardLayout({ children }) {
  return (
    <SessionGuard>
      <FocusProvider>
        <OnboardingProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <main style={{ flex: 1 }}>
              {children}
            </main>
            {/* Guided new-user onboarding wizard */}
            <OnboardingWizard />
            {/* Persistent Floating Live Focus Indicator on all study pages */}
            <FloatingFocusWidget />
            {/* Emotion-aware adaptive intervention notifications */}
            <EmotionInterventionToast />
          </div>
        </OnboardingProvider>
      </FocusProvider>
    </SessionGuard>
  );
}
