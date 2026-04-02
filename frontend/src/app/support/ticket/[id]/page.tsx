"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import styles from "./ticket-detail.module.css";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo?: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: "user" | "admin" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  escalated: "Escalated",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  ai_handled: "AI Handled",
};

const STATUS_CLASS: Record<string, string> = {
  open: "statusOpen",
  escalated: "statusEscalated",
  in_progress: "statusInProgress",
  resolved: "statusResolved",
  closed: "statusClosed",
  ai_handled: "statusAiHandled",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId, userId } = useAuth();
  const { user } = useUser();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch ticket + messages
  const fetchData = useCallback(async () => {
    try {
      const [ticketRes, msgRes] = await Promise.all([
        fetch(`/api/support/tickets/${id}`),
        fetch(`/api/support/tickets/${id}/messages`),
      ]);
      if (ticketRes.ok) setTicket(await ticketRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Connect WebSocket
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_SUPPORT_WS_URL || "http://localhost:3012";
    const socket = io(`${wsUrl}/tickets`, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_ticket", { ticketId: id });
    });

    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("leave_ticket", { ticketId: id });
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          senderRole: "user",
          senderName: user?.firstName
            ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
            : "User",
          content: text,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      /* ignore */
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

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading ticket...</div></div>;
  if (!ticket) return <div className={styles.page}><div className={styles.loading}>Ticket not found.</div></div>;

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/support" className={styles.backLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Support
        </Link>
      </div>

      {/* Ticket Info */}
      <div className={styles.ticketInfo}>
        <div className={styles.ticketTop}>
          <h1 className={styles.ticketSubject}>{ticket.subject}</h1>
          <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[ticket.status] || "statusOpen"]}`}>
            {STATUS_LABEL[ticket.status] || ticket.status}
          </span>
        </div>
        <p className={styles.ticketDesc}>{ticket.description}</p>
        <div className={styles.ticketMeta}>
          <span>Priority: <strong>{ticket.priority}</strong></span>
          <span>Category: <strong>{ticket.category.replace(/_/g, " ")}</strong></span>
          <span>Created: <strong>{new Date(ticket.createdAt).toLocaleDateString()}</strong></span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          Conversation {ticket.assignedTo ? "" : "— Waiting for assignment"}
        </div>

        <div className={styles.chatMessages}>
          {messages.length === 0 && (
            <div className={styles.emptyChat}>
              No messages yet. A support engineer will be with you soon.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.senderRole === "user"
                  ? styles.msgUser
                  : m.senderRole === "system"
                  ? styles.msgSystem
                  : styles.msgAdmin
              }
            >
              {m.senderRole !== "user" && (
                <span className={styles.senderName}>
                  {m.senderRole === "system" ? "System" : m.senderName || "Support"}
                </span>
              )}
              <div className={styles.msgContent}>{m.content}</div>
              <span className={styles.msgTime}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        {!isClosed ? (
          <div className={styles.chatInput}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending}
            />
            <button className={styles.sendBtn} onClick={sendMessage} disabled={!input.trim() || sending}>
              {sending ? "..." : "Send"}
            </button>
          </div>
        ) : (
          <div className={styles.closedBanner}>
            This ticket has been {ticket.status === "resolved" ? "resolved" : "closed"}.
          </div>
        )}
      </div>
    </div>
  );
}
