import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOA-ESS | Learning Outcome-Aware Educational Summarization",
  description:
    "AI-powered educational summarization system that produces summaries aligned with curriculum-defined learning outcomes using LO-RAG architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside
            style={{
              width: 260,
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {/* Logo */}
            <div style={{ marginBottom: 32, padding: "0 8px" }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
                className="gradient-text"
              >
                LOA-ESS
              </h1>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                Educational Summarization System
              </p>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <a href="/" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Dashboard
              </a>
              <a href="/modules" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Modules
              </a>
              <a href="/summarize" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Summarize
              </a>
              <a href="/flashcards" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Flashcards
              </a>
              <a href="/quiz" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Quiz
              </a>
              <a href="/compare" className="nav-link" style={{ position: "relative" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
                Compare
                <span style={{ marginLeft: "auto", fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "rgba(62,207,142,0.2)", color: "var(--accent)", fontWeight: 800, letterSpacing: "0.04em" }}>LIVE</span>
              </a>

              <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

              <a href="/upload" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload
              </a>
            </nav>

            {/* Footer */}
            <div style={{ marginTop: "auto", padding: "0 8px" }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--primary-glow)",
                  borderRadius: 8,
                  border: "1px solid rgba(110,86,207,0.2)",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                  Research Project
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  LO-RAG Architecture
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
