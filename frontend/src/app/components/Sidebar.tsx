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
  onDelete: (filename: string) => void;
  isUploading: boolean;
  uploadMessage: string;
  onNewChat: () => void;
  llmStatus: string;
  dbCount: number;
  selfConsistency: boolean;
  onToggleSelfConsistency: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  materials,
  onUpload,
  onDelete,
  isUploading,
  uploadMessage,
  onNewChat,
  llmStatus,
  dbCount,
  selfConsistency,
  onToggleSelfConsistency,
}: SidebarProps) {
  const [showScInfo, setShowScInfo] = useState(false);
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
          <div className="upload-zone-icon">📂</div>
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

      {/* Self-Consistency Toggle */}
      <div className="sidebar-section" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
              Self-Consistency
            </span>
            {/* Info icon with tooltip */}
            <span
              style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', position: 'relative' }}
              onMouseEnter={() => setShowScInfo(true)}
              onMouseLeave={() => setShowScInfo(false)}
              id="sc-info-icon"
            >

              {showScInfo && (
                <div style={{
                  position: 'absolute',
                  left: '110%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-surface-active)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  width: 210,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  zIndex: 100,
                  boxShadow: 'var(--shadow-lg)',
                  whiteSpace: 'normal',
                }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>🔄 Self-Consistency Check</strong>
                  Asks the LLM the <strong>same question 3 times</strong> with slightly different settings, then checks if the answers agree.
                  <br /><br />
                  <span style={{ color: 'var(--warning)' }}>⚠ Makes responses ~3× slower</span> but produces a more accurate confidence score.
                </div>
              )}
            </span>
          </div>

          {/* Toggle switch */}
          <button
            id="self-consistency-toggle"
            onClick={onToggleSelfConsistency}
            title={selfConsistency ? 'Disable self-consistency (faster)' : 'Enable self-consistency (more accurate)'}
            style={{
              position: 'relative',
              width: 42,
              height: 22,
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              background: selfConsistency
                ? 'linear-gradient(135deg, #7C5CFC 0%, #38BDF8 100%)'
                : 'var(--bg-surface-active)',
              transition: 'background 0.25s ease',
              flexShrink: 0,
              boxShadow: selfConsistency ? '0 0 10px rgba(124,92,252,0.4)' : 'none',
              padding: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: selfConsistency ? 23 : 3,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.25s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* Status label */}
        <div style={{
          fontSize: 11,
          color: selfConsistency ? 'var(--accent-secondary)' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          transition: 'color 0.2s',
        }}>
          <span style={{ fontSize: 9 }}>{selfConsistency ? '●' : '○'}</span>
          {selfConsistency
            ? '3-signal mode — Thorough & accurate'
            : '2-signal mode — Fast responses'}
        </div>
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
            <div className="material-item" key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <span className="material-icon">📄</span>
                <span className="material-name" title={mat.filename}>
                  {mat.filename}
                </span>
              </div>
              <button
                onClick={() => onDelete(mat.filename)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Delete file"
              >
                ✕
              </button>
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
