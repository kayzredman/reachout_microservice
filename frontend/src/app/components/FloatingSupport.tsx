"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { io, Socket } from "socket.io-client";
import styles from "./floating-support.module.css";

interface ChatMsg {
  role: "user" | "assistant" | "admin" | "system";
  content: string;
  actions?: { action: string; result?: string }[];
  id?: string;
}

type View = "closed" | "menu" | "chat" | "ticket";

export default function FloatingSupport() {
  const { isSignedIn } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const orgId = organization?.id || "";
  const userId = user?.id || "";

  const [view, setView] = useState<View>("closed");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Live mode state (after escalation) */
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /* Ticket form state */
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  /* Close on outside click */
  useEffect(() => {
    if (view === "closed") return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setView("closed");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [view]);

  /* Connect WebSocket when ticketId is set */
  useEffect(() => {
    if (!ticketId) return;
    setConnecting(true);

    const wsUrl = process.env.NEXT_PUBLIC_SUPPORT_WS_URL || "http://localhost:3012";
    const socket = io(`${wsUrl}/tickets`, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_ticket", { ticketId });
      setLiveConnected(true);
      setConnecting(false);
    });

    socket.on("new_message", (msg: { id: string; senderId: string; senderRole: string; senderName?: string; content: string }) => {
      // Only show messages from admin/system — our own messages are already in state
      if (msg.senderId === userId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [
          ...prev,
          {
            role: msg.senderRole === "admin" ? "admin" as const : "system" as const,
            content: msg.content,
            id: msg.id,
          },
        ];
      });
    });

    socket.on("disconnect", () => {
      setLiveConnected(false);
    });

    return () => {
      socket.emit("leave_ticket", { ticketId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ticketId, userId]);

  /* Load existing ticket messages when connecting to live mode */
  useEffect(() => {
    if (!ticketId || !liveConnected) return;
    (async () => {
      try {
        const res = await fetch(`/api/support/tickets/${ticketId}/messages`);
        if (!res.ok) return;
        const existingMsgs: { id: string; senderId: string; senderRole: string; senderName?: string; content: string }[] = await res.json();
        // Only add admin/system messages we don't have yet
        const newMsgs = existingMsgs.filter(
          (m) => m.senderId !== userId && m.senderRole !== "user"
        );
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.filter((p) => p.id).map((p) => p.id));
            const toAdd = newMsgs
              .filter((m) => !ids.has(m.id))
              .map((m) => ({
                role: m.senderRole === "admin" ? "admin" as const : "system" as const,
                content: m.content,
                id: m.id,
              }));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        }
      } catch { /* ignore */ }
    })();
  }, [ticketId, liveConnected, userId]);

  const toggleWidget = () => setView(view === "closed" ? "menu" : "closed");

  /* ── Chat (AI mode) ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, userId, message: text, conversationId }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Something went wrong.",
          actions: data.actions,
        },
      ]);
      // If escalation happened, transition to live mode
      if (data.ticketId) {
        setTicketId(data.ticketId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Support is currently offline. Please try again shortly." },
      ]);
    } finally {
      setSending(false);
    }
  };

  /* ── Chat (Live mode — after escalation) ── */
  const sendLiveMessage = async () => {
    const text = input.trim();
    if (!text || sending || !ticketId) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      // Send via WebSocket for real-time delivery
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          ticketId,
          senderId: userId,
          senderRole: "user",
          senderName: user?.firstName || "User",
          content: text,
        });
      } else {
        // Fallback to REST
        await fetch(`/api/support/tickets/${ticketId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: userId,
            senderRole: "user",
            senderName: user?.firstName || "User",
            content: text,
          }),
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Failed to send message. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = ticketId ? sendLiveMessage : sendMessage;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Ticket ── */
  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim() || ticketSubmitting) return;
    setTicketSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          userId,
          subject: ticketSubject.trim(),
          category: ticketCategory,
          description: ticketDescription.trim(),
          priority: "medium",
        }),
      });
      if (res.ok) {
        setTicketSuccess(true);
        setTicketSubject("");
        setTicketCategory("general");
        setTicketDescription("");
        setTimeout(() => setTicketSuccess(false), 4000);
      }
    } catch {
      /* silent */
    } finally {
      setTicketSubmitting(false);
    }
  };

  return (
    <div className={styles.floatingWrapper} ref={panelRef}>
      {/* ── Panel ── */}
      {view !== "closed" && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.panelHeader}>
            {view !== "menu" && (
              <button className={styles.backBtn} onClick={() => setView("menu")} aria-label="Back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <span className={styles.panelTitle}>
              {view === "menu" && "How can we help?"}
              {view === "chat" && (ticketId ? "Support Engineer" : "AI Assistant")}
              {view === "ticket" && "Submit a Ticket"}
            </span>
            <div className={styles.headerSpacer} />
            <button className={styles.closeBtn} onClick={() => setView("closed")} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Menu ── */}
          {view === "menu" && (
            <div className={styles.menuBody}>
              <p className={styles.menuGreeting}>
                {isSignedIn
                  ? `Hi ${user?.firstName || "there"}! What do you need help with?`
                  : "Welcome to FaithReach! How can we assist you?"}
              </p>
              <div className={styles.menuOptions}>
                <button className={styles.menuCard} onClick={() => setView("chat")}>
                  <div className={styles.menuIconWrap}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <div className={styles.menuCardText}>
                    <span className={styles.menuCardTitle}>Chat with AI</span>
                    <span className={styles.menuCardDesc}>Get instant answers from our AI agent</span>
                  </div>
                  <svg className={styles.menuArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <button className={styles.menuCard} onClick={() => setView("ticket")}>
                  <div className={`${styles.menuIconWrap} ${styles.menuIconTicket}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                  </div>
                  <div className={styles.menuCardText}>
                    <span className={styles.menuCardTitle}>Submit a Ticket</span>
                    <span className={styles.menuCardDesc}>
                      {isSignedIn ? "Create a support request for your team" : "Send us a message"}
                    </span>
                  </div>
                  <svg className={styles.menuArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              <div className={styles.menuFooter}>
                <span>Powered by</span> <strong>FaithReach AI</strong>
              </div>
            </div>
          )}

          {/* ── Chat ── */}
          {view === "chat" && (
            <div className={styles.chatView}>
              <div className={styles.chatMessages}>
                {messages.length === 0 && (
                  <div className={styles.welcomeBlock}>
                    <div className={styles.welcomeAvatar}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <div className={styles.welcomeText}>
                      <strong>FaithReach AI</strong>
                      <p>
                        Hi{user?.firstName ? ` ${user.firstName}` : ""}! I can help with platform issues, 
                        failed posts, billing questions, and more. What&apos;s on your mind?
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={
                    m.role === "user" ? styles.msgUser
                    : m.role === "admin" ? styles.msgAdmin
                    : m.role === "system" ? styles.msgSystem
                    : styles.msgAssistant
                  }>
                    {m.role === "admin" && (
                      <span className={styles.adminLabel}>Support Engineer</span>
                    )}
                    {m.content}
                    {m.actions?.map((a, j) => (
                      <div key={j} className={styles.actionBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {a.action === "escalate_to_human" ? "Escalated to support engineer" : a.action.replace(/_/g, " ")}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Escalation transition banner */}
                {ticketId && (
                  <div className={styles.escalationBanner}>
                    <div className={styles.escalationIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className={styles.escalationText}>
                      {connecting ? (
                        <>
                          <strong>Connecting to support engineer...</strong>
                          <span>Please hold on while we connect you.</span>
                        </>
                      ) : liveConnected ? (
                        <>
                          <strong>Connected to support</strong>
                          <span>A support engineer will respond here shortly. You can continue chatting.</span>
                        </>
                      ) : (
                        <>
                          <strong>Connection lost</strong>
                          <span>Trying to reconnect...</span>
                        </>
                      )}
                    </div>
                    {connecting && (
                      <div className={styles.connectingDots}>
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                      </div>
                    )}
                  </div>
                )}
                {sending && (
                  <div className={styles.typingWrap}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
              <div className={styles.chatInputBar}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Ticket ── */}
          {view === "ticket" && (
            <div className={styles.ticketView}>
              {ticketSuccess ? (
                <div className={styles.successBlock}>
                  <div className={styles.successIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className={styles.successTitle}>Ticket Submitted!</p>
                  <p className={styles.successDesc}>We&apos;ll get back to you shortly.</p>
                </div>
              ) : !isSignedIn ? (
                <div className={styles.signInPrompt}>
                  <p>Sign in to submit a support ticket and track its progress.</p>
                  <a href="/sign-in" className={styles.signInLink}>Sign In</a>
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label>Subject</label>
                    <input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}>
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="technical">Technical</option>
                      <option value="platform">Platform Connection</option>
                      <option value="content">Content &amp; Publishing</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="Tell us more about what happened..."
                      rows={4}
                    />
                  </div>
                  <button
                    className={styles.submitBtn}
                    onClick={submitTicket}
                    disabled={ticketSubmitting || !ticketSubject.trim() || !ticketDescription.trim()}
                  >
                    {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className={`${styles.fab} ${view !== "closed" ? styles.fabOpen : ""}`}
        onClick={toggleWidget}
        aria-label={view === "closed" ? "Open support" : "Close support"}
      >
        <span className={`${styles.fabIcon} ${view !== "closed" ? styles.fabIconHidden : ""}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </span>
        <span className={`${styles.fabIcon} ${view === "closed" ? styles.fabIconHidden : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </button>
    </div>
  );
}
