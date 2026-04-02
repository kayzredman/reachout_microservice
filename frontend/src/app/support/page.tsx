"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import styles from "./support.module.css";

/* ── Types ─────────────────────────────────── */
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  actions?: { action: string; result?: string }[];
}
interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
}

const FAQ = [
  {
    q: "How do I connect a social media platform?",
    a: "Go to Settings > Platforms, pick the platform you want, and follow the OAuth prompt. FaithReach supports Instagram, Facebook, X (Twitter), YouTube, and WhatsApp.",
  },
  {
    q: "Why did my post fail to publish?",
    a: "Common reasons: your platform token expired (reconnect in Settings > Platforms), the content exceeded character limits, or the platform API was temporarily down. You can retry from the Publisher page.",
  },
  {
    q: "How does the Content Planner work?",
    a: "The Planner lets you create content series from templates or AI. Pick a template, customize your settings, and it generates a full series with scheduled posts.",
  },
  {
    q: "How do I upgrade my subscription?",
    a: "Go to Settings > Billing and choose a plan. You can pay with card or mobile money (MoMo). Your new features unlock instantly.",
  },
  {
    q: "Can I schedule posts in advance?",
    a: "Yes! When creating a post in the Publisher, click 'Schedule' instead of 'Publish Now'. Pick your date and time, and FaithReach will publish automatically.",
  },
  {
    q: "How do I add team members?",
    a: "Go to Settings > Team and invite members with their email. They'll get a Clerk invitation to join your organization.",
  },
];

const STATUS_CLASS: Record<string, string> = {
  open: styles.statusOpen,
  escalated: styles.statusEscalated,
  resolved: styles.statusResolved,
  in_progress: styles.statusInProgress,
  closed: styles.statusClosed,
  ai_handled: styles.statusAiHandled,
};

export default function SupportPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const orgId = organization?.id || "";
  const userId = user?.id || "";

  const [tab, setTab] = useState<"chat" | "tickets" | "faq">("chat");

  /* ── Chat state ── */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  /* ── Tickets state ── */
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  /* ── FAQ state ── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  /* ── Fetch tickets ── */
  const fetchTickets = useCallback(async () => {
    if (!orgId) return;
    setTicketsLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?orgId=${orgId}`);
      if (res.ok) setTickets(await res.json());
    } catch {
      /* ignore */
    } finally {
      setTicketsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (tab === "tickets") fetchTickets();
  }, [tab, fetchTickets]);

  /* ── Send chat ── */
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
        body: JSON.stringify({
          orgId,
          userId,
          message: text,
          conversationId,
        }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Something went wrong. Please try again.",
          actions: data.actions,
        },
      ]);
      // Auto-refresh tickets if an escalation happened
      if (data.actions?.some((a: { action: string }) => a.action === "escalate_to_human")) {
        fetchTickets();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.supportPage}>
      <div className={styles.header}>
        <h1>Support</h1>
        <p>Get instant help from our AI agent, or browse your tickets and FAQ.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["chat", "tickets", "faq"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "chat" ? "AI Chat" : t === "tickets" ? "My Tickets" : "FAQ"}
          </button>
        ))}
      </div>

      {/* ── AI Chat Tab ── */}
      {tab === "chat" && (
        <div className={styles.chatContainer}>
          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.msgAssistant}>
                Hi there! I&apos;m the FaithReach support agent. How can I help you today?
                I can check your platforms, retry failed posts, look into billing, and more.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? styles.msgUser : styles.msgAssistant}
              >
                {m.content}
                {m.actions?.map((a, j) => (
                  <div key={j} className={styles.actionBadge}>
                    {a.action === "escalate_to_human" ? "Escalated to support engineer" : `Action: ${a.action.replace(/_/g, " ")}`}
                    {a.result ? ` — ${a.result}` : ""}
                  </div>
                ))}
              </div>
            ))}
            {sending && <div className={styles.typing}>Thinking...</div>}
            <div ref={messagesEnd} />
          </div>
          <div className={styles.chatInput}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about FaithReach..."
              disabled={sending}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {tab === "tickets" && (
        <div>
          {ticketsLoading ? (
            <div className={styles.emptyState}>Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No support tickets yet. Use the AI Chat to get instant help!</p>
            </div>
          ) : (
            <div className={styles.ticketList}>
              {tickets.map((t) => (
                <div key={t.id} className={styles.ticketCard}>
                  <div>
                    <div className={styles.ticketSubject}>{t.subject}</div>
                    <div className={styles.ticketMeta}>
                      {t.category} &middot; {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${STATUS_CLASS[t.status] || ""}`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAQ Tab ── */}
      {tab === "faq" && (
        <div className={styles.faqList}>
          {FAQ.map((item, i) => (
            <div key={i} className={styles.faqItem}>
              <div
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <span>{openFaq === i ? "−" : "+"}</span>
              </div>
              {openFaq === i && (
                <div className={styles.faqAnswer}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
