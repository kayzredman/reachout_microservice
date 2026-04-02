"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineTicket,
} from "react-icons/hi";
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

const FILTER_OPTIONS = ["all", "open", "escalated", "in_progress", "resolved"] as const;

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return `${Math.round(ms / 60000)} min`;
  if (hours < 24) return `${hours} hr`;
  return `${Math.round(hours / 24)} day(s)`;
}

export default function AdminSupportPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const isSystemAdmin = (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSystemAdmin, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/support/admin", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setTickets(data.tickets);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSystemAdmin) fetchData();
  }, [isSystemAdmin, fetchData]);

  if (!isLoaded || !isSystemAdmin) return <div className={styles.empty}>Checking access...</div>;

  const handleAssign = async (ticketId: string) => {
    const assignee = prompt("Enter admin name or ID to assign:");
    if (!assignee) return;
    try {
      await fetch(`/api/support/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", ticketId, assignedTo: assignee }),
      });
    } catch { /* ignore */ }
    fetchData();
  };

  const handleResolve = async (ticketId: string) => {
    if (!confirm("Mark this ticket as resolved?")) return;
    try {
      await fetch(`/api/support/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", ticketId }),
      });
    } catch { /* ignore */ }
    fetchData();
  };

  if (!isLoaded || !isSystemAdmin) return <div className={styles.empty}>Checking access...</div>;

  if (loading) return <div className={styles.dashboard}><div className={styles.inner}><div className={styles.empty}>Loading dashboard...</div></div></div>;

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className={styles.dashboard}>
      <div className={styles.inner}>
        <Link href="/admin" className={styles.backLink}>
          <HiOutlineArrowLeft /> Back to Dashboard
        </Link>

        <div className={styles.header}>
          <div>
            <h1>Support Tickets</h1>
            <p>Monitor and manage support tickets across all organizations.</p>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total</div>
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
              <div className={styles.statLabel}>Avg Resolve</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className={`${styles.filterPill} ${filter === f ? styles.filterPillActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Ticket cards */}
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <HiOutlineTicket className={styles.emptyIcon} />
            <h4>No tickets found</h4>
            <p>{filter === "all" ? "All clear — no support tickets." : `No ${filter.replace(/_/g, " ")} tickets right now.`}</p>
          </div>
        ) : (
          <div className={styles.ticketList}>
            {filtered.map((t) => (
              <div key={t.id} className={styles.ticketCard}>
                <div className={styles.ticketInfo}>
                  <div className={styles.ticketSubject}>{t.subject}</div>
                  <div className={styles.ticketMeta}>
                    <span className={`${styles.badge} ${STATUS_CLASS[t.status] || ""}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    <span className={PRIORITY_CLASS[t.priority] || styles.metaText}>
                      {t.priority}
                    </span>
                    <span className={styles.metaDot} />
                    <span className={styles.metaText}>{t.category}</span>
                    <span className={styles.metaDot} />
                    <span className={styles.metaText}>
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className={styles.metaDot} />
                    <span className={styles.metaText}>{t.orgId.slice(0, 10)}…</span>
                  </div>
                </div>
                <div className={styles.ticketActions}>
                  {!t.assignedTo ? (
                    <button className={styles.assignBtn} onClick={() => handleAssign(t.id)}>
                      Assign
                    </button>
                  ) : (
                    <span className={styles.assignedTag}>{t.assignedTo}</span>
                  )}
                  {t.status !== "resolved" && t.status !== "closed" && (
                    <button className={styles.resolveBtn} onClick={() => handleResolve(t.id)}>
                      <HiOutlineCheckCircle style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
