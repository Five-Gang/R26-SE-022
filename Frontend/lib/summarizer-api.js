/**
 * API client for LOA-ESS Summarizer Backend.
 * Backend runs on http://localhost:8000 by default.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_SUMMARIZER_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/api/v1`;

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Don't set Content-Type for FormData (multipart) — browser sets it with boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API_V1}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    if (Array.isArray(error.detail)) {
      const msgs = error.detail.map((e) => {
        const field = e.loc?.slice(1).join(' → ') || 'field';
        return `${field}: ${e.msg}`;
      });
      throw new Error(msgs.join('\n'));
    }
    throw new Error(
      typeof error.detail === 'string'
        ? error.detail
        : error.message || `Request failed: ${res.status}`
    );
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Modules ──────────────────────────────────────────────────

export const modulesApi = {
  /** List all modules, optionally filter by department, year, semester */
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.department) q.set('department', params.department);
    if (params.year) q.set('year', params.year);
    if (params.semester) q.set('semester', params.semester);
    return request(`/modules?${q}`);
  },

  /** Get a module with its learning outcomes and weeks */
  get: (id) => request(`/modules/${id}`),

  /** Create a module */
  create: (data) =>
    request('/modules', { method: 'POST', body: JSON.stringify(data) }),

  /** Update module */
  update: (id, data) =>
    request(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** Delete module */
  delete: (id) => request(`/modules/${id}`, { method: 'DELETE' }),

  /** Get learning outcomes for a module */
  getLearningOutcomes: (id) => request(`/modules/${id}/learning-outcomes`),

  /** Add a learning outcome manually */
  createLearningOutcome: (moduleId, data) =>
    request(`/modules/${moduleId}/learning-outcomes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get weekly outline for a module */
  getWeeks: (id) => request(`/modules/${id}/weeks`),

  /** Add a week */
  createWeek: (moduleId, data) =>
    request(`/modules/${moduleId}/weeks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Documents ────────────────────────────────────────────────

export const documentsApi = {
  /**
   * Upload a PDF or PPTX for a module.
   * document_type: "module_outline" | "lecture_slide" | "lecture_note"
   */
  upload: (moduleId, file, documentType, weekNumber) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleId);
    formData.append('document_type', documentType);
    if (weekNumber != null) formData.append('week_number', String(weekNumber));
    return request('/documents/upload', { method: 'POST', body: formData });
  },

  /** List documents for a module */
  listByModule: (moduleId, documentType) => {
    const q = new URLSearchParams();
    if (documentType) q.set('document_type', documentType);
    return request(`/documents/module/${moduleId}?${q}`);
  },

  /** Get document detail */
  get: (id) => request(`/documents/${id}`),

  /**
   * Poll processing status.
   * Returns: { id, processing_status, processing_error, chunks_created, processed_at }
   */
  getStatus: (id) => request(`/documents/${id}/status`),

  /** Delete a document */
  delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};

// ── Summaries ────────────────────────────────────────────────

export const summariesApi = {
  /**
   * Generate a summary / flashcards / quiz.
   * data: { module_id, week_number?, query?, output_type, summary_level, options? }
   * output_type: "summary" | "flashcards" | "quiz" | "mind_map"
   * summary_level: "beginner" | "standard" | "advanced" | "exam_focused" | "lo_focused"
   */
  generate: (data) =>
    request('/summaries', { method: 'POST', body: JSON.stringify(data) }),

  /** Get a previously generated output */
  get: (id) => request(`/summaries/${id}`),

  /** List outputs, optionally filter by module_id or output_type */
  list: (moduleId, outputType, limit = 20, offset = 0) => {
    const q = new URLSearchParams();
    if (moduleId) q.set('module_id', moduleId);
    if (outputType) q.set('output_type', outputType);
    q.set('limit', String(limit));
    q.set('offset', String(offset));
    return request(`/summaries?${q}`);
  },

  /** Submit student rating (1–5 stars) */
  rate: (outputId, rating, feedback) =>
    request('/summaries/rate', {
      method: 'POST',
      body: JSON.stringify({ output_id: outputId, rating, feedback }),
    }),
};

// ── Compare ──────────────────────────────────────────────────

export const compareApi = {
  /**
   * Run same query through Generic AI and LOA-ESS pipeline in parallel.
   * data: { module_id, query, week_number? }
   */
  run: (data) =>
    request('/compare', { method: 'POST', body: JSON.stringify(data) }),
};
