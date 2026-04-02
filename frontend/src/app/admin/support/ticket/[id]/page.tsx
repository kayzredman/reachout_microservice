"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import styles from "./admin-ticket-detail.module.css";

interface Ticket {
  id: string;
  orgId: string;
  userId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo?: string;
  whatsappPhone?: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: "user" | "admin" | "system";
  senderName?: string;
  content: string;
  sentViaWhatsApp?: boolean;
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

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "escalated", label: "Escalated" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const { user, isLoaded } = useUser();
  const isSystemAdmin = (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) router.replace("/");
  }, [isLoaded, isSystemAdmin, router]);

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
    if (isSystemAdmin) fetchData();
  }, [isSystemAdmin, fetchData]);

  // WebSocket
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
      const body: Record<string, unknown> = {
        senderId: userId,
        senderRole: "admin",
        senderName: user?.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
          : "Support",
        content: text,
      };

      // Send via WebSocket so message is broadcast to all connected clients (including user widget)
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          ticketId: id,
          senderId: userId,
          senderRole: "admin",
          senderName: body.senderName,
          content: text,
        });
      } else {
        // Fallback to REST if WebSocket is disconnected
        const res = await fetch(`/api/support/tickets/${id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const msg = await res.json();
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }

      // Send via WhatsApp if toggled on and ticket has WhatsApp phone
      if (sendViaWhatsApp && ticket?.whatsappPhone && ticket.orgId) {
        fetch("/api/support/tickets/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: ticket.orgId,
            phone: ticket.whatsappPhone,
            message: text,
          }),
        }).catch(() => { /* silent */ });
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

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    setTicket((prev) => prev ? { ...prev, status } : prev);
    try {
      await fetch("/api/support/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status_change", ticketId: id, status }),
      });
    } catch { /* ignore */ }
  };

  if (!isLoaded || !isSystemAdmin) return <div className={styles.page}><div className={styles.loading}>Checking access...</div></div>;
  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading ticket...</div></div>;
  if (!ticket) return <div className={styles.page}><div className={styles.loading}>Ticket not found.</div></div>;

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <Link href="/admin/support" className={styles.backLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Tickets
        </Link>
      </div>

      <div className={styles.layout}>
        {/* Left: Ticket Info */}
        <div className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h2 className={styles.subject}>{ticket.subject}</h2>
            <p className={styles.description}>{ticket.description}</p>

            <div className={styles.fieldGroup}>
              <label>Status</label>
              <select
                className={styles.statusSelect}
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Priority</label>
              <span className={styles.fieldValue}>{ticket.priority}</span>
            </div>

            <div className={styles.fieldGroup}>
              <label>Category</label>
              <span className={styles.fieldValue}>{ticket.category.replace(/_/g, " ")}</span>
            </div>

            <div className={styles.fieldGroup}>
              <label>Organization</label>
              <span className={styles.fieldValue}>{ticket.orgId.slice(0, 16)}…</span>
            </div>

            <div className={styles.fieldGroup}>
              <label>Assigned To</label>
              <span className={styles.fieldValue}>{ticket.assignedTo || "Unassigned"}</span>
            </div>

            <div className={styles.fieldGroup}>
              <label>Created</label>
              <span className={styles.fieldValue}>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>

            {ticket.whatsappPhone && (
              <div className={styles.fieldGroup}>
                <label>WhatsApp</label>
                <span className={styles.fieldValue}>{ticket.whatsappPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Conversation with User
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                No messages yet. Start the conversation with the user.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.senderRole === "admin"
                    ? styles.msgAdmin
                    : m.senderRole === "system"
                    ? styles.msgSystem
                    : styles.msgUser
                }
              >
                <span className={styles.senderName}>
                  {m.senderRole === "system" ? "System" : m.senderName || (m.senderRole === "admin" ? "Support" : "User")}
                </span>
                <div className={styles.msgContent}>{m.content}</div>
                <div className={styles.msgMeta}>
                  <span className={styles.msgTime}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {m.sentViaWhatsApp && (
                    <span className={styles.whatsappBadge}>WhatsApp</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {!isClosed ? (
            <div className={styles.chatInputArea}>
              {ticket.whatsappPhone && (
                <label className={styles.waToggle}>
                  <input
                    type="checkbox"
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                  />
                  <span className={styles.waToggleLabel}>Also send via WhatsApp</span>
                </label>
              )}
              <div className={styles.chatInput}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply..."
                  disabled={sending}
                />
                <button className={styles.sendBtn} onClick={sendMessage} disabled={!input.trim() || sending}>
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.closedBanner}>
              This ticket has been {ticket.status}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
