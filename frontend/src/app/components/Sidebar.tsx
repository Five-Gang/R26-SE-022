"use client";

import React, { useRef, useState } from "react";

interface Material {
  filename: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  materials: Material[];
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadMessage: string;
  onNewChat: () => void;
  llmStatus: string;
  dbCount: number;
}

export default function Sidebar({
  isOpen,
  onToggle,
  materials,
  onUpload,
  isUploading,
  uploadMessage,
  onNewChat,
  llmStatus,
  dbCount,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "" : "collapsed"}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div>
            <h1>AuraLearn</h1>
            <p>Intelligent Study Assistant</p>
          </div>
        </div>

        <button className="btn-new-chat" onClick={onNewChat} id="new-chat-btn">
          ✨ New Chat
        </button>
      </div>

      {/* Upload Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Upload Course Materials</div>

        <div
          className={`upload-zone ${isDragOver ? "drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="upload-zone"
        >
          <div className="upload-zone-icon">📎</div>
          <div className="upload-zone-text">
            <strong>Click or drag</strong> to upload PDF
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
          id="file-input"
        />

        {isUploading && (
          <div className="upload-progress">
            <span className="spinner" />
            Uploading & processing...
          </div>
        )}

        {uploadMessage && !isUploading && (
          <div className="upload-progress">{uploadMessage}</div>
        )}
      </div>

      {/* Materials List */}
      <div className="sidebar-materials">
        <div className="sidebar-section-title">
          Course Materials ({materials.length})
        </div>

        {materials.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
            No materials uploaded yet.
            <br />
            Upload PDFs to get started.
          </div>
        ) : (
          materials.map((mat, idx) => (
            <div className="material-item" key={idx}>
              <span className="material-icon">📄</span>
              <span className="material-name" title={mat.filename}>
                {mat.filename}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className={`status-dot ${llmStatus === "available" ? "online" : "offline"}`} />
          LLM: {llmStatus === "available" ? "Connected" : "Disconnected"}
        </div>
        <div className="status-indicator" style={{ marginTop: 6 }}>
          <span className={`status-dot ${dbCount > 0 ? "online" : "offline"}`} />
          Vector DB: {dbCount} chunks indexed
        </div>
      </div>
    </aside>
  );
}
