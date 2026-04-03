"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface NotifItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { getToken, isSignedIn, userId } = useAuth();
  const { organization } = useOrganization();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/notifications/${organization.id}/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch { /* silent */ }
  }, [getToken, organization?.id]);

  // Fetch notifications on mount and when org changes
  useEffect(() => {
    if (isSignedIn && organization?.id) {
      fetchNotifications();
    }
  }, [isSignedIn, organization?.id, fetchNotifications]);

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (!isSignedIn || !userId || !organization?.id) return;

    const notifUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL || "http://localhost:3004";
    const socket = io(`${notifUrl}/notifications`, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("subscribe", { userId, orgId: organization.id });
    });

    socket.on("notification", (notif: NotifItem) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 30));
      setUnreadCount((c) => c + 1);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [isSignedIn, userId, organization?.id]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    if (!organization?.id) return;
    try {
      const token = await getToken();
      await fetch(`/api/notifications/${organization.id}/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  if (!isSignedIn || !organization) return null;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "1.08rem",
          fontWeight: 500,
          color: "#222",
          width: "100%",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#f5f0ff")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "none")}
      >
        <span style={{ fontSize: "1.2em", position: "relative" }}>
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                background: "#ef4444",
                color: "#fff",
                borderRadius: "50%",
                width: 18,
                height: 18,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        Notifications
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: 0,
            width: 340,
            maxHeight: 440,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #f1f1f1",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7c3aed",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#888", fontSize: 14 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #f8f8f8",
                    background: n.read ? "transparent" : "#f8f5ff",
                  }}
                >
                  <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                    {n.body.length > 100 ? n.body.slice(0, 100) + "…" : n.body}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
