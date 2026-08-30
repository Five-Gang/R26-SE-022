"use client";

import { useState, useEffect } from "react";
import { modulesApi } from "@/lib/api";

export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState(4);
  const [lecturer, setLecturer] = useState("");

  const loadModules = async () => {
    try {
      setLoading(true);
      const data = await modulesApi.list();
      setModules(data);
    } catch (err: any) {
      console.error("Failed to load modules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg("Module code and name are required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await modulesApi.create({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        year: Number(year),
        semester: Number(semester),
        credits: Number(credits),
        lecturer: lecturer.trim() || undefined,
      });

      // Reset form & reload
      setCode("");
      setName("");
      setLecturer("");
      setShowCreate(false);
      await loadModules();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create module.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    try {
      await modulesApi.delete(id);
      await loadModules();
    } catch (err: any) {
      alert("Failed to delete module: " + err.message);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Modules</h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
            Manage course modules, learning outcomes, and upload materials
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowCreate(!showCreate); setErrorMsg(null); }}>
          {showCreate ? "Cancel" : "+ Add Module"}
        </button>
      </div>

      {/* Create Module Form */}
      {showCreate && (
        <form onSubmit={handleCreateModule} className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create New Module</h3>
          
          {errorMsg && (
            <div style={{ padding: "10px 14px", background: "rgba(248,81,73,0.15)", border: "1px solid var(--danger)", borderRadius: 8, color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Module Code *</label>
              <input
                className="input-field"
                placeholder="e.g. SE4040"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Module Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Secure Software Development"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Year *</label>
              <input
                className="input-field"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Semester *</label>
              <select
                className="input-field"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Credits</label>
              <input
                className="input-field"
                type="number"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                min={1}
                max={8}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>Lecturer</label>
              <input
                className="input-field"
                placeholder="e.g. Dr. Smith"
                value={lecturer}
                onChange={(e) => setLecturer(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Module"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Loading modules...
        </div>
      ) : modules.length === 0 ? (
        /* Empty State */
        <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>📚</span>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No Modules Yet</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
            Add your first module to get started. Upload a module outline to automatically
            extract learning outcomes and weekly breakdown.
          </p>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setShowCreate(true)}>
            + Add Your First Module
          </button>
        </div>
      ) : (
        /* Modules List */
        <div style={{ display: "grid", gap: 16 }}>
          {modules.map((mod: any) => (
            <div key={mod.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>
                      {mod.code}
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{mod.name}</h3>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                    {mod.credits} credits • {mod.lecturer || "No lecturer"} • Semester {mod.semester}, {mod.year}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {mod.outline_processed ? (
                    <span className="badge badge-apply">✓ Outline Processed</span>
                  ) : (
                    <span className="badge" style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}>
                      ⚠ No Outline
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteModule(mod.id)}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
                    title="Delete Module"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
