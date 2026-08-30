"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage, { Message } from "./components/ChatMessage";
import Sidebar from "./components/Sidebar";
import AnalyticsPanel from "./components/AnalyticsPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SUGGESTED_QUERIES = [
  "Explain the concept of polymorphism",
  "What is a binary search tree?",
  "Describe the OSI model layers",
  "How does TCP/IP work?",
  "What are design patterns in software engineering?",
];

interface ConversationMsg {
  role: string;
  content: string;
}

interface MaterialInfo {
  filename: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMsg[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [llmStatus, setLlmStatus] = useState("checking");
  const [dbCount, setDbCount] = useState(0);
  const [selfConsistency, setSelfConsistency] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage on initial mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("auralearn_chat_messages");
      const savedHistory = localStorage.getItem("auralearn_conv_history");
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          const restored: Message[] = parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          setMessages(restored);
        }
      }
      if (savedHistory) {
        const parsedHist = JSON.parse(savedHistory);
        if (Array.isArray(parsedHist)) {
          setConversationHistory(parsedHist);
        }
      }
    } catch (err) {
      console.warn("Failed to load chat history from localStorage:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save chat history to localStorage whenever messages or conversationHistory change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("auralearn_chat_messages", JSON.stringify(messages));
      localStorage.setItem("auralearn_conv_history", JSON.stringify(conversationHistory));
    } catch (err) {
      console.warn("Failed to save chat to localStorage:", err);
    }
  }, [messages, conversationHistory, isLoaded]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Check system status on mount and poll every 10 seconds
  useEffect(() => {
    checkLLMStatus();
    fetchMaterials();

    const interval = setInterval(() => {
      checkLLMStatus();
      fetchMaterials();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkLLMStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/llm/status`);
      const data = await res.json();
      setLlmStatus(data.status === "available" && data.model_available ? "available" : "offline");
    } catch {
      setLlmStatus("offline");
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/materials`);
      const data = await res.json();
      if (data.unique_files) {
        setMaterials(data.unique_files.map((f: string) => ({ filename: f })));
      }
      setDbCount(data.document_count || 0);
    } catch {
      /* backend not running yet */
    }
  };

  // Send a chat message
  const sendMessage = async (queryText?: string) => {
    const query = (queryText || input).trim();
    if (!query || isLoading) return;

    // Add user message to UI
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversation_history: conversationHistory,
          top_k: 5,
          enable_self_consistency: selfConsistency,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Add assistant message
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        confidence: data.confidence,
        response_type: data.response_type,
        response_label: data.response_label,
        sources: data.sources,
        log_id: data.log_id ?? null,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update conversation history
      if (data.conversation_history) {
        setConversationHistory(data.conversation_history);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Error:** ${errorMessage}\n\nPlease ensure the backend server is running (\`python main.py\`) and your \`GEMINI_API_KEY\` is configured in \`backend/.env\`.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PDF upload
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadMessage(`✅ ${file.name} ingested successfully!`);
        fetchMaterials(); // Refresh materials list
      } else {
        setUploadMessage(`❌ ${data.error || data.detail || "Upload failed"}`);
      }
    } catch {
      setUploadMessage("❌ Could not connect to backend.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMessage(""), 5000);
    }
  };

  // Handle PDF deletion with loading state
  const handleDelete = async (filename: string) => {
    if (deletingFile) return;
    setDeletingFile(filename);
    try {
      const res = await fetch(`${API_URL}/api/materials/${filename}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchMaterials(); // Refresh materials list
      } else {
        const data = await res.json();
        console.error("Delete failed:", data);
      }
    } catch (err) {
      console.error("Could not connect to backend to delete.", err);
    } finally {
      setDeletingFile(null);
    }
  };

  // New chat — clears state and localStorage
  const handleNewChat = () => {
    setMessages([]);
    setConversationHistory([]);
    setInput("");
    try {
      localStorage.removeItem("auralearn_chat_messages");
      localStorage.removeItem("auralearn_conv_history");
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        materials={materials}
        onUpload={handleUpload}
        onDelete={handleDelete}
        isUploading={isUploading}
        uploadMessage={uploadMessage}
        onNewChat={handleNewChat}
        llmStatus={llmStatus}
        dbCount={dbCount}
        selfConsistency={selfConsistency}
        onToggleSelfConsistency={() => setSelfConsistency((prev) => !prev)}
        deletingFile={deletingFile}
      />

      {/* Chat Area */}
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button
              className="btn-toggle-sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="toggle-sidebar-btn"
            >
              ☰
            </button>
            <div>
              <div className="chat-title">AuraLearn Tutor</div>
              <div className="chat-subtitle">
                Confidence-aware, hallucination-controlled responses
              </div>
            </div>
          </div>
          {/* Analytics trigger button */}
          <button
            id="open-analytics-btn"
            onClick={() => setAnalyticsOpen(true)}
            title="View research analytics"
            style={{
              background: 'linear-gradient(135deg, rgba(124,92,252,0.15) 0%, rgba(56,189,248,0.15) 100%)',
              border: '1px solid rgba(124,92,252,0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.18s ease',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,92,252,0.6)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(124,92,252,0.2)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,92,252,0.3)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            📊 Analytics
          </button>
        </div>

        {/* Messages */}
        <div className="messages-container" id="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎓</div>
              <h2>Welcome to AuraLearn</h2>
              <p>
                Ask academic questions and receive grounded, confidence-aware
                responses based on your uploaded course materials. Every answer
                is verified against your study content.
              </p>
              <div className="suggested-queries">
                {SUGGESTED_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    className="suggested-query"
                    onClick={() => sendMessage(q)}
                    id={`suggested-query-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="typing-indicator">
                  <div className="message-avatar" style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    background: "linear-gradient(135deg, #7C5CFC 0%, #38BDF8 100%)",
                    boxShadow: "0 0 24px rgba(124, 92, 252, 0.25)",
                  }}>
                    ✨
                  </div>
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              className="input-field"
              placeholder="Ask an academic question..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              id="chat-input"
            />
            <button
              className="btn-send"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              id="send-btn"
            >
              ➤
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send · Shift+Enter for new line · Responses are grounded in uploaded course materials
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      <AnalyticsPanel
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </div>
  );
}
