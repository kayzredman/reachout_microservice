"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineOfficeBuilding,
  HiOutlineTicket,
  HiOutlineExclamationCircle,
  HiOutlineCreditCard,
  HiOutlineUsers,
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlineLightningBolt,
} from "react-icons/hi";
import styles from "./admin.module.css";

interface Stats {
  totalOrgs: number;
  totalMembers: number;
  totalTickets: number;
  openTickets: number;
  escalatedTickets: number;
  activeSubscriptions: number;
}

interface EscalatedTicket {
  id: string;
  orgId: string;
  orgName?: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  assignedTo?: string;
}

export default function AdminDashboardPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const isSystemAdmin =
    (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;

  const [stats, setStats] = useState<Stats | null>(null);
  const [escalated, setEscalated] = useState<EscalatedTicket[]>([]);
  const [recentTickets, setRecentTickets] = useState<EscalatedTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) router.replace("/");
  }, [isLoaded, isSystemAdmin, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      // Fetch orgs + support data in parallel
      const [orgsRes, supportRes] = await Promise.all([
        fetch("/api/admin/organizations", { headers }),
        fetch("/api/support/admin", { headers }),
      ]);

      let totalOrgs = 0, totalMembers = 0, activeSubscriptions = 0;
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        const orgs = orgsData.organizations || [];
        totalOrgs = orgs.length;
        totalMembers = orgs.reduce((s: number, o: { membersCount: number }) => s + o.membersCount, 0);
        // Approximate active subs from org count (billing data is per-org)
        activeSubscriptions = orgs.length;
      }

      let totalTickets = 0, openTickets = 0, escalatedTickets = 0;
      let allTickets: EscalatedTicket[] = [];
      if (supportRes.ok) {
        const supportData = await supportRes.json();
        const st = supportData.stats;
        if (st) {
          totalTickets = st.total || 0;
          openTickets = st.open || 0;
          escalatedTickets = st.escalated || 0;
        }
        allTickets = supportData.tickets || [];
      }

      setStats({
        totalOrgs,
        totalMembers,
        totalTickets,
        openTickets,
        escalatedTickets,
        activeSubscriptions,
      });
      setEscalated(allTickets.filter((t) => t.status === "escalated"));
      setRecentTickets(allTickets.slice(0, 5));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSystemAdmin) fetchData();
  }, [isSystemAdmin, fetchData]);

  if (!isLoaded || !isSystemAdmin)
    return <div className={styles.page}><div className={styles.empty}>Checking access...</div></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1>System Admin</h1>
            <p>Overview of all organizations, support tickets, and escalations.</p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
            <HiOutlineRefresh className={loading ? styles.spinning : ""} />
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#f3f0ff", color: "#7c3aed" }}>
              <HiOutlineOfficeBuilding />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{stats?.totalOrgs ?? "—"}</div>
              <div className={styles.statLabel}>Organizations</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#dbeafe", color: "#2563eb" }}>
              <HiOutlineUsers />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{stats?.totalMembers ?? "—"}</div>
              <div className={styles.statLabel}>Total Members</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}>
              <HiOutlineTicket />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{stats?.openTickets ?? "—"}</div>
              <div className={styles.statLabel}>Open Tickets</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${(stats?.escalatedTickets ?? 0) > 0 ? styles.pulseRed : ""}`} style={{ background: "#fee2e2", color: "#dc2626" }}>
              <HiOutlineExclamationCircle />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{stats?.escalatedTickets ?? "—"}</div>
              <div className={styles.statLabel}>Escalated</div>
            </div>
          </div>
        </div>

        {/* Escalated tickets — prominent section */}
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitleGroup}>
              <HiOutlineLightningBolt className={styles.cardTitleIcon} style={{ color: "#dc2626" }} />
              <h2 className={styles.cardTitle}>AI Escalations</h2>
              {escalated.length > 0 && (
                <span className={styles.alertBadge}>{escalated.length}</span>
              )}
            </div>
            <Link href="/admin/support" className={styles.viewAllLink}>
              View all tickets <HiOutlineArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className={styles.empty}>Loading...</div>
          ) : escalated.length === 0 ? (
            <div className={styles.emptyState}>
              <HiOutlineExclamationCircle className={styles.emptyIcon} />
              <h4>No escalations</h4>
              <p>All AI-handled tickets are under control. Check back later.</p>
            </div>
          ) : (
            <div className={styles.ticketList}>
              {escalated.map((t) => (
                <div key={t.id} className={styles.ticketRow}>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketSubject}>{t.subject}</div>
                    <div className={styles.ticketMeta}>
                      <span className={styles.metaBadge} style={{ background: "#fee2e2", color: "#991b1b" }}>
                        escalated
                      </span>
                      <span className={styles.metaText}>{t.category}</span>
                      <span className={styles.metaDot} />
                      <span className={styles.metaText}>{t.priority} priority</span>
                      <span className={styles.metaDot} />
                      <span className={styles.metaText}>
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <Link href="/admin/support" className={styles.resolveLink}>
                    Resolve
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent tickets */}
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitleGroup}>
              <HiOutlineTicket className={styles.cardTitleIcon} style={{ color: "#7c3aed" }} />
              <h2 className={styles.cardTitle}>Recent Tickets</h2>
            </div>
            <Link href="/admin/support" className={styles.viewAllLink}>
              All tickets <HiOutlineArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className={styles.empty}>Loading...</div>
          ) : recentTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <HiOutlineTicket className={styles.emptyIcon} />
              <h4>No tickets yet</h4>
              <p>When users create support tickets, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className={styles.ticketList}>
              {recentTickets.map((t) => (
                <div key={t.id} className={styles.ticketRow}>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketSubject}>{t.subject}</div>
                    <div className={styles.ticketMeta}>
                      <StatusBadge status={t.status} />
                      <span className={styles.metaText}>{t.category}</span>
                      <span className={styles.metaDot} />
                      <span className={styles.metaText}>
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className={styles.quickLinks}>
          <Link href="/admin/organizations" className={styles.quickLinkCard}>
            <HiOutlineOfficeBuilding className={styles.qlIcon} />
            <div>
              <div className={styles.qlTitle}>Organizations</div>
              <div className={styles.qlDesc}>View all orgs, members & billing</div>
            </div>
            <HiOutlineArrowRight className={styles.qlArrow} />
          </Link>
          <Link href="/admin/support" className={styles.quickLinkCard}>
            <HiOutlineTicket className={styles.qlIcon} />
            <div>
              <div className={styles.qlTitle}>Support Tickets</div>
              <div className={styles.qlDesc}>Manage, assign & resolve tickets</div>
            </div>
            <HiOutlineArrowRight className={styles.qlArrow} />
          </Link>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: "#fef3c7", color: "#92400e" },
  escalated: { bg: "#fee2e2", color: "#991b1b" },
  in_progress: { bg: "#dbeafe", color: "#1e40af" },
  resolved: { bg: "#dcfce7", color: "#166534" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: "#f4f4f5", color: "#71717a" };
  return (
    <span className={styles.metaBadge} style={{ background: s.bg, color: s.color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
