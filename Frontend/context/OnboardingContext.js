'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { modulesApi, documentsApi } from '../lib/summarizer-api';
import { useSession } from '../components/auth/SessionGuard';

/**
 * OnboardingContext
 * ─────────────────
 * Tracks whether the user has completed the full initial setup:
 *   1. Created at least one module (scoped to current student)
 *   2. Uploaded a module outline
 *   3. Uploaded at least one lecture slide  ← required to unlock all features
 *
 * Nav items (Focus, AI Tutor, Reminders, Analytics, Rewards) are gated
 * until a lecture slide exists in at least one module belonging to this user.
 */

const OnboardingContext = createContext({
  isNewUser: false,
  setupComplete: true,
  showWizard: false,
  moduleCount: 0,
  hasOutline: false,
  hasLecture: false,
  loading: true,
  markSetupComplete: () => {},
  dismissWizard: () => {},
  openWizard: () => {},
  refreshSetupStatus: async () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export default function OnboardingProvider({ children }) {
  const { student } = useSession();
  const studentId = student?.student_id || student?._id || student?.id;
  const setupKey = studentId ? `auralearn_setup_complete_${studentId}` : 'auralearn_setup_complete';

  const [loading, setLoading]             = useState(true);
  const [moduleCount, setModuleCount]     = useState(0);
  const [hasOutline, setHasOutline]       = useState(false);
  const [hasLecture, setHasLecture]       = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [showWizard, setShowWizard]       = useState(false);

  /**
   * Checks for the current student:
   *  1. Are there any modules?
   *  2. Does any module have a lecture_slide uploaded?
   * Returns { moduleCount, hasLecture, complete }
   */
  const refreshSetupStatus = useCallback(async () => {
    if (!studentId) return { count: 0, hasLecture: false, complete: false };
    try {
      const modules = await modulesApi.list({ student_id: studentId });
      const mods = Array.isArray(modules) ? modules : modules?.items ?? [];
      const count = mods.length;
      setModuleCount(count);

      if (count === 0) {
        setHasLecture(false);
        setHasOutline(false);
        return { count: 0, hasLecture: false, complete: false };
      }

      // Check each module of this student for at least one lecture_slide
      let lectureFound = false;
      let outlineFound = false;
      for (const mod of mods) {
        try {
          const docs = await documentsApi.listByModule(mod.id);
          const docList = Array.isArray(docs) ? docs : docs?.items ?? [];
          if (docList.some(d => d.document_type === 'lecture_slide' && d.processing_status !== 'failed')) {
            lectureFound = true;
          }
          if (docList.some(d => d.document_type === 'module_outline' && d.processing_status !== 'failed')) {
            outlineFound = true;
          }
        } catch { /* ignore per-module errors */ }
        if (lectureFound) break; // no need to check more
      }

      setHasLecture(lectureFound);
      setHasOutline(outlineFound);
      return { count, hasLecture: lectureFound, complete: lectureFound };
    } catch {
      setModuleCount(0);
      setHasLecture(false);
      return { count: 0, hasLecture: false, complete: false };
    }
  }, [studentId]);

  // On student load: check localStorage (fast path), then ALWAYS verify with API
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const alreadyDone = localStorage.getItem(setupKey) === 'true';

    // Optimistic render from localStorage to avoid flash
    if (alreadyDone) {
      setSetupComplete(true);
    }

    // Always verify with API — clears stale flags if lecture was deleted
    refreshSetupStatus().then(({ count, hasLecture: lecture, complete }) => {
      if (count === 0 || !lecture) {
        // Missing module or lecture for this student — reset and show wizard
        localStorage.removeItem(setupKey);
        setSetupComplete(false);
        setShowWizard(true);
      } else {
        // Fully set up
        setSetupComplete(true);
        localStorage.setItem(setupKey, 'true');
      }
      setLoading(false);
    });
  }, [studentId, setupKey, refreshSetupStatus]);

  const markSetupComplete = useCallback(() => {
    setSetupComplete(true);
    setShowWizard(false);
    localStorage.setItem(setupKey, 'true');
  }, [setupKey]);

  const dismissWizard = useCallback(() => {
    setShowWizard(false);
  }, []);

  const openWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{
      isNewUser: !setupComplete,
      setupComplete,
      showWizard,
      moduleCount,
      hasOutline,
      hasLecture,
      loading,
      markSetupComplete,
      dismissWizard,
      openWizard,
      refreshSetupStatus,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}
