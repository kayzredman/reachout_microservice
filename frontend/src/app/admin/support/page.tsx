"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import styles from "./admin-support.module.css";

interface Stats {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
  avgResolutionMs: number | null;
}

interface Ticket {
  id: string;
  orgId: string;
  userId: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  assignedTo?: string;
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  open: styles.badgeOpen,
  escalated: styles.badgeEscalated,
  in_progress: styles.badgeInProgress,
  resolved: styles.badgeResolved,
};

const PRIORITY_CLASS: Record<string, string> = {
  critical: styles.priorityCritical,
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow,
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return `${Math.round(ms / 60000)} min`;
  if (hours < 24) return `${hours} hr`;
  return `${Math.round(hours / 24)} day(s)`;
}

export default function AdminSupportPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/admin");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setTickets(data.tickets);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (ticketId: string) => {
    const assignee = prompt("Enter admin user ID to assign:");
    if (!assignee) return;
    await fetch(`/api/support/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", ticketId, assignedTo: assignee }),
    });
    fetchData();
  };

  if (loading) return <div className={styles.empty}>Loading dashboard...</div>;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Support Dashboard</h1>
        <p>Monitor and manage user support tickets across all organizations.</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Tickets</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.open}</div>
            <div className={styles.statLabel}>Open</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.escalated}</div>
            <div className={styles.statLabel}>Escalated</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statLabel}>Resolved</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatDuration(stats.avgResolutionMs)}</div>
            <div className={styles.statLabel}>Avg Resolution</div>
          </div>
        </div>
      )}

      {/* Tickets table */}
      {tickets.length === 0 ? (
        <div className={styles.empty}>No open tickets. All clear!</div>
      ) : (
        <table className={styles.ticketTable}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Org</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.subject}</td>
                <td style={{ fontSize: "0.82rem", color: "#71717a" }}>
                  {t.orgId.slice(0, 12)}...
                </td>
                <td>
                  <span className={`${styles.badge} ${STATUS_CLASS[t.status] || ""}`}>
                    {t.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  <span className={PRIORITY_CLASS[t.priority] || ""}>
                    {t.priority}
                  </span>
                </td>
                <td>{t.category}</td>
                <td style={{ fontSize: "0.82rem", color: "#71717a" }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {!t.assignedTo && (
                    <button
                      className={styles.assignBtn}
                      onClick={() => handleAssign(t.id)}
                    >
                      Assign
                    </button>
                  )}
                  {t.assignedTo && (
                    <span style={{ fontSize: "0.82rem", color: "#166534" }}>
                      Assigned
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
