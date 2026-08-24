"use client";

import { useState, useRef, useEffect } from "react";
import { modulesApi, documentsApi } from "@/lib/api";

// Only PDF and PPTX are accepted — auto-detected from extension
const DOCUMENT_TYPES = [
  { value: "lecture_slide", label: "📊 Lecture Slides", desc: "PPTX/PPT slide decks",  accept: ".pptx,.ppt" },
  { value: "lecture_note",  label: "📄 Lecture Notes",  desc: "PDF lecture documents", accept: ".pdf" },
];

const ACCEPTED_TYPES = ".pdf,.pptx,.ppt";

/** Infer document type automatically from file extension */
function inferDocType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pptx" || ext === "ppt") return "lecture_slide";
  return "lecture_note"; // pdf
}

interface UploadedFile {
  file: File;
  documentType: string;
  weekNumber: number | null;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  errorMsg?: string;
}

export default function UploadPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedDocType, setSelectedDocType] = useState("lecture_slide");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await modulesApi.list();
        setModules(data);
        if (data.length > 0) {
          setSelectedModuleId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };
    fetchModules();
  }, []);

  const handleFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const uploaded: UploadedFile[] = Array.from(newFiles).map((f) => ({
      file: f,
      documentType: inferDocType(f.name),  // auto-detect from extension
      weekNumber,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    if (!selectedModuleId) {
      alert("Please select or create a module first!");
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === "success") continue;

      // Update file status to uploading
      setFiles((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "uploading", progress: 40 } : item
        )
      );

      try {
        await documentsApi.upload(
          selectedModuleId,
          f.file,
          f.documentType,
          f.weekNumber ?? undefined
        );

        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "success", progress: 100 } : item
          )
        );
      } catch (err: any) {
        console.error("Upload error:", err);
        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: "error", errorMsg: err.message || "Upload failed" }
              : item
          )
        );
      }
    }

    setIsUploading(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Upload Lecture Materials</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          Upload your weekly lecture slides, notes, and lab sheets for AI-powered summarization
        </p>
      </div>

      {/* Pre-loaded Curriculum Banner */}
      <div style={{
        marginBottom: 24,
        padding: "14px 20px",
        borderRadius: 10,
        background: "rgba(62, 207, 142, 0.08)",
        border: "1px solid rgba(62, 207, 142, 0.25)",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🎓</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            SLIIT Curriculum Pre-Loaded
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            Module outlines, Learning Outcomes (LOs), and weekly topic schedules for all SLIIT modules
            are <strong style={{ color: "var(--foreground)" }}>pre-loaded by the research team</strong>.
            This is what makes LOA-ESS more accurate than generic AI tools — it already knows your
            exact curriculum. Just upload your lecture content below.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* Main Upload Area */}
        <div>
          {/* Module Selector Bar */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 8, fontWeight: 600 }}>
              Select Target Module *
            </label>
            {modules.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--warning)" }}>
                ⚠️ No modules found. Please <a href="/modules" style={{ color: "var(--primary)", textDecoration: "underline" }}>create a module</a> first.
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} ({m.year} S{m.semester})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-card"
            style={{
              padding: 48,
              textAlign: "center",
              cursor: "pointer",
              borderColor: isDragging ? "var(--primary)" : undefined,
              borderStyle: "dashed",
              borderWidth: 2,
              background: isDragging ? "var(--primary-glow)" : undefined,
              transition: "all 0.2s ease",
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(e) => handleFilesAdded(e.target.files)}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>
              {isDragging ? "📥" : "📤"}
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              PDF or PPTX/PPT — Max 50 MB per file
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>
                  {files.length} file{files.length > 1 ? "s" : ""} queued
                </h3>
                <button
                  className="btn-primary"
                  onClick={handleUploadAll}
                  disabled={isUploading || !selectedModuleId}
                  style={{ opacity: isUploading || !selectedModuleId ? 0.5 : 1 }}
                >
                  {isUploading ? "⏳ Uploading..." : "⬆ Upload All"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} className="glass-card" style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                        <span style={{ fontSize: 24 }}>
                          {f.file.name.endsWith(".pdf")
                            ? "📄"
                            : f.file.name.endsWith(".pptx") || f.file.name.endsWith(".ppt")
                            ? "📊"
                            : f.file.name.endsWith(".docx") || f.file.name.endsWith(".doc")
                            ? "📝"
                            : "📄"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.file.name}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {formatFileSize(f.file.size)} •{" "}
                            {DOCUMENT_TYPES.find((t) => t.value === f.documentType)?.label || f.documentType}
                            {f.weekNumber ? ` • Week ${f.weekNumber}` : ""}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {f.status === "success" && (
                          <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>✓ Uploaded</span>
                        )}
                        {f.status === "uploading" && (
                          <span style={{ color: "var(--info)", fontSize: 13 }}>Uploading...</span>
                        )}
                        {f.status === "error" && (
                          <span style={{ color: "var(--danger)", fontSize: 13 }} title={f.errorMsg}>
                            ✗ {f.errorMsg || "Failed"}
                          </span>
                        )}
                        {f.status === "pending" && (
                          <button
                            onClick={() => removeFile(i)}
                            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {f.status === "uploading" && (
                      <div style={{ marginTop: 8, height: 4, background: "var(--surface)", borderRadius: 2, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${f.progress}%`,
                            background: "var(--primary)",
                            borderRadius: 2,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div>
          {/* Document Type (read-only indicator, auto-detected) */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Document Type</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              Automatically detected from file extension:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {DOCUMENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{type.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{type.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Number */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Week Number</h3>
            <select
              className="input-field"
              value={weekNumber ?? ""}
              onChange={(e) => setWeekNumber(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No specific week</option>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          {/* Pipeline Info */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Ingestion Pipeline</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              {[
                { step: "1. Parse",  desc: "Extract text from PPTX/PDF/DOCX",  color: "var(--primary)" },
                { step: "2. Chunk",  desc: "Education-aware slide splitting",   color: "var(--primary)" },
                { step: "3. Embed",  desc: "Generate semantic vector embeddings", color: "var(--primary)" },
                { step: "4. Store",  desc: "Index in Qdrant + PostgreSQL",       color: "var(--primary)" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: s.color, fontWeight: 700, minWidth: 60, flexShrink: 0 }}>{s.step}</span>
                  <span style={{ color: "var(--muted)" }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why better than ChatGPT */}
          <div className="glass-card" style={{ padding: 20, background: "rgba(110,86,207,0.06)", border: "1px solid rgba(110,86,207,0.2)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--primary)" }}>Why more accurate than ChatGPT?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--muted)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                <span>Knows your <strong style={{ color: "var(--foreground)" }}>exact SLIIT LOs</strong></span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                <span>Anchored to <strong style={{ color: "var(--foreground)" }}>weekly curriculum</strong></span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                <span>Cites <strong style={{ color: "var(--foreground)" }}>your actual slides</strong></span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                <span>Bloom's taxonomy <strong style={{ color: "var(--foreground)" }}>depth matching</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
