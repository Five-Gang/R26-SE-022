'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { modulesApi, summariesApi } from '../../../../lib/summarizer-api';
import styles from './generate.module.css';

const OUTPUT_TYPES = [
  { value: 'summary',    label: 'AI Summary',   icon: '📝', desc: 'Structured learning-outcome-aligned summary with citations' },
  { value: 'flashcards', label: 'Flashcards',   icon: '🃏', desc: 'Spaced-repetition cards tagged by Bloom\'s level' },
  { value: 'quiz',       label: 'Quiz',          icon: '🧠', desc: 'MCQ & short-answer questions mapped to LOs' },
];

const SUMMARY_LEVELS = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'standard',     label: 'Standard' },
  { value: 'advanced',     label: 'Advanced' },
  { value: 'exam_focused', label: 'Exam Focused' },
  { value: 'lo_focused',   label: 'LO Focused' },
];

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const docId    = searchParams.get('doc');
  const moduleId = searchParams.get('module');
  const typeParam = searchParams.get('type'); // pre-select from module page cards

  const [mod, setMod] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [outputType, setOutputType] = useState(
    ['summary','flashcards','quiz'].includes(typeParam) ? typeParam : 'summary'
  );
  const [weekNumber, setWeekNumber] = useState('');
  const [summaryLevel, setSummaryLevel] = useState('standard');
  const [query, setQuery] = useState('');
  const [numFlashcards, setNumFlashcards] = useState(15);
  const [numQuestions, setNumQuestions] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // If no moduleId in URL, redirect back
  useEffect(() => {
    if (!moduleId) { router.replace('/study'); return; }
    modulesApi.get(moduleId)
      .then((m) => {
        setMod(m);
        setWeeks(m.weeks || []);
      })
      .catch(() => router.replace('/study'));
  }, [moduleId]);

  const handleGenerate = async () => {
    if (!moduleId) return;
    setError(null);
    setGenerating(true);
    try {
      const payload = {
        module_id: moduleId,
        output_type: outputType,
        summary_level: summaryLevel,
        query: query.trim(),
        options: {
          num_flashcards: numFlashcards,
          num_quiz_questions: numQuestions,
          include_citations: true,
          include_examples: true,
        },
      };
      if (weekNumber) payload.week_number = parseInt(weekNumber, 10);

      const result = await summariesApi.generate(payload);

      if (outputType === 'flashcards') {
        router.push(`/study/flashcards?summary=${result.id}`);
      } else if (outputType === 'quiz') {
        router.push(`/study/quiz?summary=${result.id}`);
      } else {
        router.push(`/study/session/summary?summary=${result.id}`);
      }
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  if (!mod) return (
    <div className={styles.stateCenter}>
      <div className={styles.spinner} />
      <p>Loading module…</p>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <span className={styles.modCode}>{mod.code}</span>
            <span className={styles.breadSep}>›</span>
            <span>Generate Study Material</span>
          </div>
          <h1 className={styles.title}>What would you like to generate?</h1>
          <p className={styles.subtitle}>{mod.name}</p>
        </div>
      </div>

      {/* Output Type Picker */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Output Type</div>
        <div className={styles.typePicker}>
          {OUTPUT_TYPES.map((t) => (
            <button
              key={t.value}
              className={`${styles.typeCard} ${outputType === t.value ? styles.typeSelected : ''}`}
              onClick={() => setOutputType(t.value)}
            >
              <span className={styles.typeIcon}>{t.icon}</span>
              <span className={styles.typeName}>{t.label}</span>
              <span className={styles.typeDesc}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options Row */}
      <div className={styles.optionsGrid}>
        {/* Week */}
        <div className={styles.optionGroup}>
          <label className={styles.optLabel}>Week (optional)</label>
          <select className={styles.optSelect} value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)}>
            <option value="">All weeks</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.week_number}>Week {w.week_number} — {w.topic}</option>
            ))}
          </select>
        </div>

        {/* Summary Level (only for summary type) */}
        {outputType === 'summary' && (
          <div className={styles.optionGroup}>
            <label className={styles.optLabel}>Summary Level</label>
            <select className={styles.optSelect} value={summaryLevel} onChange={(e) => setSummaryLevel(e.target.value)}>
              {SUMMARY_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Num flashcards */}
        {outputType === 'flashcards' && (
          <div className={styles.optionGroup}>
            <label className={styles.optLabel}>Number of Cards: {numFlashcards}</label>
            <input type="range" min={5} max={50} value={numFlashcards}
              onChange={(e) => setNumFlashcards(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        )}

        {/* Num questions */}
        {outputType === 'quiz' && (
          <div className={styles.optionGroup}>
            <label className={styles.optLabel}>Number of Questions: {numQuestions}</label>
            <input type="range" min={5} max={30} value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        )}
      </div>

      {/* Query (optional focus topic) */}
      <div className={styles.section}>
        <label className={styles.optLabel}>Focus topic / query (optional)</label>
        <textarea
          className={styles.queryInput}
          placeholder="e.g. Explain integration by parts and when to use it…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />
        <p className={styles.queryHint}>Leave blank to cover the whole module/week comprehensively.</p>
      </div>

      {error && <div className={styles.errorBox}>⚠️ {error}</div>}

      {/* Generate Button */}
      <button
        className={`${styles.btnGenerate} ${generating ? styles.generating : ''}`}
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <div className={styles.btnSpinner} />
            Generating… this may take 15–30 seconds
          </>
        ) : (
          `Generate ${OUTPUT_TYPES.find(t => t.value === outputType)?.label} →`
        )}
      </button>

      {generating && (
        <p className={styles.generatingHint}>
          The LOA-ESS pipeline is retrieving relevant chunks, aligning with learning outcomes, and generating your content.
        </p>
      )}
    </div>
  );
}
