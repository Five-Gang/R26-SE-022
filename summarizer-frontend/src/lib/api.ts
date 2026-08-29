/**
 * API client for LOA-ESS backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_V1}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    // FastAPI validation errors come as { detail: [{loc, msg, type}] }
    if (Array.isArray(error.detail)) {
      const msgs = error.detail.map((e: any) => {
        const field = e.loc?.slice(1).join(" → ") || "field";
        return `${field}: ${e.msg}`;
      });
      throw new Error(msgs.join("\n"));
    }
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : error.message || `Request failed: ${res.status}`
    );
  }

  return res.json();
}

// ── Modules ──────────────────────────────────────────

export const modulesApi = {
  list: () => request<any[]>("/modules"),
  get: (id: string) => request<any>(`/modules/${id}`),
  create: (data: any) =>
    request<any>("/modules", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/modules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/modules/${id}`, { method: "DELETE" }),
  getLearningOutcomes: (id: string) =>
    request<any[]>(`/modules/${id}/learning-outcomes`),
  createLearningOutcome: (moduleId: string, data: any) =>
    request<any>(`/modules/${moduleId}/learning-outcomes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getWeeks: (id: string) => request<any[]>(`/modules/${id}/weeks`),
  createWeek: (moduleId: string, data: any) =>
    request<any>(`/modules/${moduleId}/weeks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Documents ────────────────────────────────────────

export const documentsApi = {
  upload: async (
    moduleId: string,
    file: File,
    documentType: string,
    weekNumber?: number
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("module_id", moduleId);
    formData.append("document_type", documentType);
    if (weekNumber) formData.append("week_number", String(weekNumber));

    const res = await fetch(`${API_V1}/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  listByModule: (moduleId: string) =>
    request<any[]>(`/documents/module/${moduleId}`),
  getStatus: (id: string) => request<any>(`/documents/${id}/status`),
  delete: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),
};

// ── Summaries ────────────────────────────────────────

export const summariesApi = {
  generate: (data: any) =>
    request<any>("/summaries", { method: "POST", body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/summaries/${id}`),
  list: (moduleId?: string, outputType?: string) => {
    const params = new URLSearchParams();
    if (moduleId) params.set("module_id", moduleId);
    if (outputType) params.set("output_type", outputType);
    return request<any[]>(`/summaries?${params}`);
  },
  rate: (outputId: string, rating: number, feedback?: string) =>
    request<any>("/summaries/rate", {
      method: "POST",
      body: JSON.stringify({ output_id: outputId, rating, feedback }),
    }),
};

// ── Compare ──────────────────────────────────────────

export const compareApi = {
  run: (data: { module_id: string; query: string; week_number?: number }) =>
    request<any>("/compare", { method: "POST", body: JSON.stringify(data) }),
};
