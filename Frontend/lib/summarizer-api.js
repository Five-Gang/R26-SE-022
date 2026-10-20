/**
 * API client for LOA-ESS Summarizer Backend & AI Tutor Integration.
 * Backend runs on http://localhost:8000 by default.
 * AI Tutor Backend runs on http://localhost:8002.
 */

const API_BASE = (
  process.env.NEXT_PUBLIC_SUMMARIZER_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');
const TUTOR_API = (
  process.env.NEXT_PUBLIC_TUTOR_API_URL || 'http://localhost:8002'
).replace(/\/+$/, '');
const API_V1 = `${API_BASE}/api/v1`;

export const DEFAULT_MODULES = [];

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
  list: async (params = {}) => {
    try {
      const q = new URLSearchParams();
      if (params.department) q.set('department', params.department);
      if (params.year) q.set('year', params.year);
      if (params.semester) q.set('semester', params.semester);
      if (params.student_id) q.set('student_id', params.student_id);
      const data = await request(`/modules?${q}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
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
  upload: async (moduleId, file, documentType = 'lecture_slide', weekNumber = null) => {
    // 1. Ingest into AI Tutor backend (port 8002) if it is a PDF
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const tutorFormData = new FormData();
        tutorFormData.append('file', file);
        await fetch(`${TUTOR_API}/api/upload`, {
          method: 'POST',
          body: tutorFormData,
        });
      } catch (tutorErr) {
        console.warn(`[AI Tutor] Port 8002 upload note: ${tutorErr.message}`);
      }
    }

    // 2. Upload to Summarizer API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleId);
    formData.append('document_type', documentType);
    if (weekNumber != null) formData.append('week_number', String(weekNumber));
    return await request('/documents/upload', { method: 'POST', body: formData });
  },

  /** List documents for a module */
  listByModule: (moduleId, documentType) => {
    const q = new URLSearchParams();
    if (documentType) q.set('document_type', documentType);
    return request(`/documents/module/${moduleId}?${q}`);
  },

  /** Get document detail */
  get: (id) => request(`/documents/${id}`),

  /** Poll processing status */
  getStatus: (id) => request(`/documents/${id}/status`),

  /** Delete a document */
  delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};

// ── Summaries ────────────────────────────────────────────────

export const summariesApi = {
  generate: (data) =>
    request('/summaries', { method: 'POST', body: JSON.stringify(data) }),

  get: (id) => request(`/summaries/${id}`),

  list: (moduleId, outputType, limit = 20, offset = 0) => {
    const q = new URLSearchParams();
    if (moduleId) q.set('module_id', moduleId);
    if (outputType) q.set('output_type', outputType);
    q.set('limit', String(limit));
    q.set('offset', String(offset));
    return request(`/summaries?${q}`);
  },

  rate: (outputId, rating, feedback) =>
    request('/summaries/rate', {
      method: 'POST',
      body: JSON.stringify({ output_id: outputId, rating, feedback }),
    }),
};

// ── Compare ──────────────────────────────────────────────────

export const compareApi = {
  run: (data) =>
    request('/compare', { method: 'POST', body: JSON.stringify(data) }),
};
