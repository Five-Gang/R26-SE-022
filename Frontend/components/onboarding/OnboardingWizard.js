'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { modulesApi, documentsApi } from '../../lib/summarizer-api';
import { useOnboarding } from '../../context/OnboardingContext';
import { useSession } from '../../components/auth/SessionGuard';
import styles from './OnboardingWizard.module.css';

const CURRENT_YEAR = new Date().getFullYear();

const STEPS = [
  { id: 'welcome',        number: 1, shortTitle: 'Welcome',         icon: '👋' },
  { id: 'create-module',  number: 2, shortTitle: 'Create Module',   icon: '📚' },
  { id: 'upload-outline', number: 3, shortTitle: 'Upload Outline',  icon: '📄' },
  { id: 'upload-lecture', number: 4, shortTitle: 'Upload Lecture',  icon: '🎞️' },
  { id: 'complete',       number: 5, shortTitle: 'Complete',        icon: '🚀' },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { student } = useSession();
  const studentId = student?.student_id || student?._id || student?.id;
  const { showWizard, markSetupComplete, dismissWizard, refreshSetupStatus } = useOnboarding();

  const [stepIndex, setStepIndex]       = useState(0);
  const [createdModule, setCreatedModule] = useState(null);
  const [outlineDone, setOutlineDone]   = useState(false);
  const [lectureDone, setLectureDone]   = useState(false);

  // ── Step 2: Module form ───────────────────────────────────────
  const [form, setForm] = useState({
    code: '', name: '', description: '', year: CURRENT_YEAR,
    semester: 1, credits: 4, department: '', lecturer: '',
  });
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState(null);

  // ── Step 3: Outline upload ────────────────────────────────────
  const [outlineFile, setOutlineFile]   = useState(null);
  const [uploadingOutline, setUploadingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState(null);
  const [dragOutline, setDragOutline]   = useState(false);
  const outlineRef = useRef(null);

  // ── Step 4: Lecture upload ────────────────────────────────────
  const [lectureFile, setLectureFile]   = useState(null);
  const [uploadingLecture, setUploadingLecture] = useState(false);
  const [lectureError, setLectureError] = useState(null);
  const [dragLecture, setDragLecture]   = useState(false);
  const lectureRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Create module ─────────────────────────────────────────────
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const mod = await modulesApi.create({
        student_id: studentId,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        year: Number(form.year), semester: Number(form.semester),
        credits: Number(form.credits),
        department: form.department.trim() || undefined,
        lecturer: form.lecturer.trim() || undefined,
      });
      setCreatedModule(mod);
      setStepIndex(2);
    } catch (err) { setCreateError(err.message); }
    finally { setCreating(false); }
  };

  // ── Upload outline ────────────────────────────────────────────
  const doOutlineUpload = useCallback(async (file) => {
    if (!file || !createdModule) return;
    setOutlineFile(file); setUploadingOutline(true); setOutlineError(null);
    try {
      await documentsApi.upload(createdModule.id, file, 'module_outline');
      setOutlineDone(true);
    } catch (err) { setOutlineError(err.message); }
    finally { setUploadingOutline(false); }
  }, [createdModule]);

  // ── Upload lecture ────────────────────────────────────────────
  const doLectureUpload = useCallback(async (file) => {
    if (!file || !createdModule) return;
    setLectureFile(file); setUploadingLecture(true); setLectureError(null);
    try {
      await documentsApi.upload(createdModule.id, file, 'lecture_slide', 1);
      setLectureDone(true);
      await refreshSetupStatus();
    } catch (err) { setLectureError(err.message); }
    finally { setUploadingLecture(false); }
  }, [createdModule, refreshSetupStatus]);

  // ── Finish — go directly to the created module's detail page ──
  const handleFinish = () => {
    markSetupComplete();
    if (createdModule?.id) {
      router.push(`/modules/${createdModule.id}`);
    } else {
      router.push('/modules');
    }
  };

  if (!showWizard) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard}>

        {/* ── Left Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <span className={styles.brandIcon}>AL</span>
            <span className={styles.brandName}>AuraLearn</span>
          </div>
          <div className={styles.sidebarTitle}>Getting Started</div>
          <nav className={styles.stepList}>
            {STEPS.map((s, i) => {
              const isCompleted = i < stepIndex;
              const isActive    = i === stepIndex;
              return (
                <div key={s.id} className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isCompleted ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepBullet}>
                    {isCompleted
                      ? <span className={styles.checkMark}>✓</span>
                      : <span className={styles.stepNumber}>{s.number}</span>
                    }
                    {i < STEPS.length - 1 && (
                      <div className={`${styles.stepConnector} ${isCompleted ? styles.connectorDone : ''}`} />
                    )}
                  </div>
                  <div className={styles.stepMeta}>
                    <div className={styles.stepLabel}>Step {s.number}</div>
                    <div className={styles.stepName}>{s.shortTitle}</div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className={styles.sidebarFooter}>
            <button className={styles.skipAllBtn} onClick={dismissWizard}>
              Skip setup for now
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className={styles.content}>
          <div className={styles.contentInner}>

            {/* ══ STEP 1: Welcome ══ */}
            {stepIndex === 0 && (
              <div className={styles.step}>
                <div className={styles.stepHero}>
                  <div className={styles.heroEmoji}>🎓</div>
                  <h1 className={styles.heroTitle}>Welcome to AuraLearn!</h1>
                  <p className={styles.heroSubtitle}>
                    Your AI-powered learning companion. Complete 4 quick steps to unlock all features and start studying smarter.
                  </p>
                </div>
                <div className={styles.featureGrid}>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>📊</span>
                    <div><div className={styles.featureTitle}>AI Summaries</div><div className={styles.featureDesc}>Learning-outcome-aligned summaries from your lecture slides</div></div>
                  </div>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🃏</span>
                    <div><div className={styles.featureTitle}>Smart Flashcards</div><div className={styles.featureDesc}>Auto-generated cards with spaced repetition reminders</div></div>
                  </div>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🤖</span>
                    <div><div className={styles.featureTitle}>AI Tutor</div><div className={styles.featureDesc}>Ask anything about your modules — hallucination-controlled</div></div>
                  </div>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🎯</span>
                    <div><div className={styles.featureTitle}>Focus Monitor</div><div className={styles.featureDesc}>Real-time emotion & attention detection while you study</div></div>
                  </div>
                </div>

                {/* Step roadmap */}
                <div className={styles.roadmap}>
                  {['Create Module', 'Upload Outline', 'Upload Lecture', 'Unlock All'].map((label, i) => (
                    <React.Fragment key={label}>
                      <div className={styles.roadmapStep}>
                        <div className={styles.roadmapNum}>{i + 1}</div>
                        <div className={styles.roadmapLabel}>{label}</div>
                      </div>
                      {i < 3 && <div className={styles.roadmapArrow}>→</div>}
                    </React.Fragment>
                  ))}
                </div>

                <div className={styles.stepActions}>
                  <button className={styles.btnPrimary} onClick={() => setStepIndex(1)}>Get Started →</button>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Create Module ══ */}
            {stepIndex === 1 && (
              <div className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepBadge}>Step 2 of 5</div>
                  <h1 className={styles.stepTitle}>Create Your First Module</h1>
                  <p className={styles.stepDesc}>A module represents a university course or subject. Fill in the details below.</p>
                </div>
                <form onSubmit={handleCreateModule} className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Module Code <span className={styles.req}>*</span></label>
                      <input className={styles.formInput} placeholder="e.g. SE4040" value={form.code} onChange={e => set('code', e.target.value)} required maxLength={20} autoFocus />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Credits</label>
                      <input className={styles.formInput} type="number" min={1} max={8} value={form.credits} onChange={e => set('credits', e.target.value)} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.spanFull}`}>
                      <label className={styles.formLabel}>Module Name <span className={styles.req}>*</span></label>
                      <input className={styles.formInput} placeholder="e.g. Secure Software Development" value={form.name} onChange={e => set('name', e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Academic Year</label>
                      <input className={styles.formInput} type="number" min={2020} max={2035} value={form.year} onChange={e => set('year', e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Semester</label>
                      <select className={styles.formInput} value={form.semester} onChange={e => set('semester', e.target.value)}>
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Department</label>
                      <input className={styles.formInput} placeholder="e.g. Software Engineering" value={form.department} onChange={e => set('department', e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Lecturer</label>
                      <input className={styles.formInput} placeholder="e.g. Dr. Smith" value={form.lecturer} onChange={e => set('lecturer', e.target.value)} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.spanFull}`}>
                      <label className={styles.formLabel}>Description</label>
                      <textarea className={`${styles.formInput} ${styles.formTextarea}`} rows={2} placeholder="Brief module description (optional)" value={form.description} onChange={e => set('description', e.target.value)} />
                    </div>
                  </div>
                  {createError && <div className={styles.errorBox}>❌ {createError}</div>}
                  <div className={styles.stepActions}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStepIndex(0)}>← Back</button>
                    <button type="submit" className={styles.btnPrimary} disabled={creating}>
                      {creating ? <><span className={styles.spinner} /> Creating…</> : 'Create Module →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ══ STEP 3: Upload Outline ══ */}
            {stepIndex === 2 && (
              <div className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepBadge}>Step 3 of 5</div>
                  <h1 className={styles.stepTitle}>Upload Module Outline</h1>
                  <p className={styles.stepDesc}>Upload your module outline (PDF / DOCX / TXT). The AI extracts all weekly topics and learning outcomes automatically.</p>
                </div>
                {createdModule && (
                  <div className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeIcon}>✅</span>
                    <div>
                      <div className={styles.moduleBadgeCode}>{createdModule.code}</div>
                      <div className={styles.moduleBadgeName}>{createdModule.name}</div>
                    </div>
                  </div>
                )}
                {!outlineDone ? (
                  <>
                    <div
                      className={`${styles.dropZone} ${dragOutline ? styles.dropZoneActive : ''} ${uploadingOutline ? styles.dropZoneUploading : ''}`}
                      onDrop={e => { e.preventDefault(); setDragOutline(false); doOutlineUpload(e.dataTransfer.files?.[0]); }}
                      onDragOver={e => { e.preventDefault(); setDragOutline(true); }}
                      onDragLeave={() => setDragOutline(false)}
                      onClick={() => !uploadingOutline && outlineRef.current?.click()}
                    >
                      <input ref={outlineRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={e => doOutlineUpload(e.target.files?.[0])} disabled={uploadingOutline} />
                      {uploadingOutline ? (
                        <div className={styles.uploadingState}>
                          <div className={styles.uploadProgress} />
                          <div className={styles.uploadingLabel}>Uploading outline…</div>
                          <div className={styles.uploadingFile}>{outlineFile?.name}</div>
                        </div>
                      ) : (
                        <div className={styles.dropZoneContent}>
                          <div className={styles.dropZoneIcon}>📄</div>
                          <div className={styles.dropZoneTitle}>Drop your module outline here</div>
                          <div className={styles.dropZoneSubtitle}>or click to browse</div>
                          <div className={styles.dropZoneFormats}>PDF · DOCX · DOC · TXT</div>
                        </div>
                      )}
                    </div>
                    {outlineError && <div className={styles.errorBox}>❌ {outlineError}</div>}
                    <div className={styles.stepActions}>
                      <button className={styles.btnGhost} onClick={() => setStepIndex(3)}>Skip for now</button>
                    </div>
                  </>
                ) : (
                  <div className={styles.successBox}>
                    <div className={styles.successIcon}>✅</div>
                    <div className={styles.successTitle}>Outline uploaded!</div>
                    <div className={styles.successDesc}>AI is extracting weekly topics and learning outcomes in the background.</div>
                    <div className={styles.stepActions} style={{ justifyContent: 'center' }}>
                      <button className={styles.btnPrimary} onClick={() => setStepIndex(3)}>Next: Upload a Lecture →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 4: Upload Lecture ══ */}
            {stepIndex === 3 && (
              <div className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepBadge}>Step 4 of 5 — Required to unlock features</div>
                  <h1 className={styles.stepTitle}>Upload a Lecture Slide</h1>
                  <p className={styles.stepDesc}>
                    Upload at least one lecture slide (PDF or PPTX). This is required to unlock the <strong>AI Tutor, Focus Monitor, Analytics, Reminders, and Rewards</strong>.
                  </p>
                </div>

                <div className={styles.lockGateNotice}>
                  <span className={styles.lockGateIcon}>🔒</span>
                  <div>
                    <div className={styles.lockGateTitle}>Features unlocked after this step</div>
                    <div className={styles.lockGateItems}>AI Tutor · Focus Monitor · Analytics · Reminders · Rewards</div>
                  </div>
                </div>

                {createdModule && (
                  <div className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeIcon}>📚</span>
                    <div>
                      <div className={styles.moduleBadgeCode}>{createdModule.code}</div>
                      <div className={styles.moduleBadgeName}>{createdModule.name}</div>
                    </div>
                  </div>
                )}

                {!lectureDone ? (
                  <>
                    <div
                      className={`${styles.dropZone} ${dragLecture ? styles.dropZoneActive : ''} ${uploadingLecture ? styles.dropZoneUploading : ''}`}
                      onDrop={e => { e.preventDefault(); setDragLecture(false); doLectureUpload(e.dataTransfer.files?.[0]); }}
                      onDragOver={e => { e.preventDefault(); setDragLecture(true); }}
                      onDragLeave={() => setDragLecture(false)}
                      onClick={() => !uploadingLecture && lectureRef.current?.click()}
                    >
                      <input ref={lectureRef} type="file" accept=".pdf,.pptx,.ppt" hidden onChange={e => doLectureUpload(e.target.files?.[0])} disabled={uploadingLecture} />
                      {uploadingLecture ? (
                        <div className={styles.uploadingState}>
                          <div className={styles.uploadProgress} />
                          <div className={styles.uploadingLabel}>Uploading lecture slide…</div>
                          <div className={styles.uploadingFile}>{lectureFile?.name}</div>
                        </div>
                      ) : (
                        <div className={styles.dropZoneContent}>
                          <div className={styles.dropZoneIcon}>🎞️</div>
                          <div className={styles.dropZoneTitle}>Drop your lecture slides here</div>
                          <div className={styles.dropZoneSubtitle}>or click to browse</div>
                          <div className={styles.dropZoneFormats}>PDF · PPTX · PPT</div>
                        </div>
                      )}
                    </div>
                    {lectureError && <div className={styles.errorBox}>❌ {lectureError}</div>}
                    <div className={styles.stepActions}>
                      <button className={styles.btnSecondary} onClick={() => setStepIndex(2)}>← Back</button>
                      {/* No skip here — lecture is required */}
                    </div>
                  </>
                ) : (
                  <div className={styles.successBox}>
                    <div className={styles.successIcon}>🎉</div>
                    <div className={styles.successTitle}>Lecture uploaded! All features unlocked!</div>
                    <div className={styles.successDesc}>
                      <strong>{lectureFile?.name}</strong> — AI is processing your slides in the background.
                    </div>
                    <div className={styles.stepActions} style={{ justifyContent: 'center' }}>
                      <button className={styles.btnPrimary} onClick={() => setStepIndex(4)}>Finish Setup →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 5: Complete ══ */}
            {stepIndex === 4 && (
              <div className={styles.step}>
                <div className={styles.completeHero}>
                  <div className={styles.completeIconWrap}>
                    <div className={styles.completeIconRing} />
                    <span className={styles.completeIcon}>🚀</span>
                  </div>
                  <h1 className={styles.heroTitle}>You&apos;re all set!</h1>
                  <p className={styles.heroSubtitle}>
                    <strong>{createdModule?.code} — {createdModule?.name}</strong> is ready. All features are now unlocked.
                  </p>
                </div>
                <div className={styles.unlockedGrid}>
                  {[
                    { icon: '📊', label: 'Dashboard',     desc: 'Overview of your progress' },
                    { icon: '🤖', label: 'AI Tutor',      desc: 'Ask questions about your modules' },
                    { icon: '📈', label: 'Analytics',     desc: 'Focus & emotion insights' },
                    { icon: '🎯', label: 'Focus Monitor', desc: 'Real-time attention tracking' },
                    { icon: '⏰', label: 'Reminders',     desc: 'Spaced repetition study queue' },
                    { icon: '🏆', label: 'Rewards',       desc: 'Streaks, XP and achievements' },
                  ].map(item => (
                    <div key={item.label} className={styles.unlockedCard}>
                      <span className={styles.unlockedIcon}>{item.icon}</span>
                      <div className={styles.unlockedLabel}>{item.label}</div>
                      <div className={styles.unlockedDesc}>{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.stepActions} style={{ justifyContent: 'center' }}>
                  <button className={styles.btnPrimary} onClick={handleFinish}>Open My Module →</button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
