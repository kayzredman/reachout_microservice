"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineTicket,
  HiOutlineChevronDown,
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

interface AdminUser {
  id: string;
  name: string;
  imageUrl?: string;
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
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "escalated", label: "Escalated" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return `${Math.round(ms / 60000)} min`;
  if (hours < 24) return `${hours} hr`;
  return `${Math.round(hours / 24)} day(s)`;
}

/* ── Dropdown component ─────────────────────────────── */
function Dropdown({ trigger, children, open, onToggle }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  return (
    <div className={styles.dropdown} ref={ref}>
      <div onClick={onToggle}>{trigger}</div>
      {open && <div className={styles.dropdownMenu}>{children}</div>}
    </div>
  );
}

export default function AdminSupportPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const isSystemAdmin = (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [openAssign, setOpenAssign] = useState<string | null>(null);
  const [openStatus, setOpenStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSystemAdmin, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const [ticketRes, adminRes] = await Promise.all([
        fetch("/api/support/admin", { headers }),
        fetch("/api/support/admin?admins=true", { headers }),
      ]);
      if (ticketRes.ok) {
        const data = await ticketRes.json();
        setStats(data.stats);
        setTickets(data.tickets);
      }
      if (adminRes.ok) {
        const data = await adminRes.json();
        setAdmins(data.admins || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const silentRefresh = useCallback(async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const [ticketRes, adminRes] = await Promise.all([
        fetch("/api/support/admin", { headers }),
        fetch("/api/support/admin?admins=true", { headers }),
      ]);
      if (ticketRes.ok) {
        const data = await ticketRes.json();
        setStats(data.stats);
        setTickets(data.tickets);
      }
      if (adminRes.ok) {
        const data = await adminRes.json();
        setAdmins(data.admins || []);
      }
    } catch { /* ignore */ }
  }, [getToken]);

  useEffect(() => {
    if (isSystemAdmin) fetchData();
  }, [isSystemAdmin, fetchData]);

  // Auto-refresh ticket list every 15s
  useEffect(() => {
    if (!isSystemAdmin) return;
    const interval = setInterval(silentRefresh, 15000);
    return () => clearInterval(interval);
  }, [isSystemAdmin, silentRefresh]);

  const handleAssign = useCallback(async (ticketId: string, assignedTo: string) => {
    setOpenAssign(null);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, assignedTo } : t)));
    try {
      await fetch(`/api/support/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", ticketId, assignedTo }),
      });
    } catch { /* ignore */ }
    silentRefresh();
  }, [silentRefresh]);

  const handleStatusChange = useCallback(async (ticketId: string, status: string) => {
    setOpenStatus(null);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
    try {
      await fetch(`/api/support/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status_change", ticketId, status }),
      });
    } catch { /* ignore */ }
    silentRefresh();
  }, [silentRefresh]);

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
                  <Link href={`/admin/support/ticket/${t.id}`} className={styles.ticketSubjectLink}>
                    {t.subject}
                  </Link>
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
                  {/* Assign dropdown */}
                  <Dropdown
                    open={openAssign === t.id}
                    onToggle={() => setOpenAssign(openAssign === t.id ? null : t.id)}
                    trigger={
                      <button className={styles.assignBtn}>
                        {t.assignedTo
                          ? admins.find((a) => a.id === t.assignedTo || a.name === t.assignedTo)?.name || t.assignedTo
                          : "Assign"}
                        <HiOutlineChevronDown style={{ marginLeft: 4, fontSize: "0.75rem" }} />
                      </button>
                    }
                  >
                    {admins.length === 0 ? (
                      <div className={styles.dropdownItem} style={{ color: "#9ca3af" }}>No admins found</div>
                    ) : (
                      admins.map((a) => (
                        <button
                          key={a.id}
                          className={`${styles.dropdownItem} ${t.assignedTo === a.id || t.assignedTo === a.name ? styles.dropdownItemActive : ""}`}
                          onClick={() => handleAssign(t.id, a.name)}
                        >
                          {a.name}
                        </button>
                      ))
                    )}
                  </Dropdown>

                  {/* Status dropdown */}
                  <Dropdown
                    open={openStatus === t.id}
                    onToggle={() => setOpenStatus(openStatus === t.id ? null : t.id)}
                    trigger={
                      <button className={styles.statusBtn}>
                        <span className={`${styles.statusDot} ${STATUS_CLASS[t.status] || ""}`} />
                        {t.status.replace(/_/g, " ")}
                        <HiOutlineChevronDown style={{ marginLeft: 4, fontSize: "0.75rem" }} />
                      </button>
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`${styles.dropdownItem} ${t.status === opt.value ? styles.dropdownItemActive : ""}`}
                        onClick={() => handleStatusChange(t.id, opt.value)}
                      >
                        <span className={`${styles.badge} ${STATUS_CLASS[opt.value] || ""}`} style={{ fontSize: "0.68rem" }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
