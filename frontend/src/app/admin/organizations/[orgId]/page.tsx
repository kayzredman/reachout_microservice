"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineUsers,
  HiOutlineChatAlt2,
  HiOutlineCreditCard,
  HiOutlineGlobeAlt,
  HiOutlineChevronRight,
  HiOutlineCalendar,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
} from "react-icons/hi";
import styles from "./admin-org-detail.module.css";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  membersCount: number;
  createdAt: number;
}

interface Member {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: number;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  escalated: "#ef4444",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const ROLE_LABELS: Record<string, string> = {
  "org:admin": "Admin",
  "org:member": "Member",
};

const TAB_ICONS = {
  members: <HiOutlineUsers />,
  tickets: <HiOutlineChatAlt2 />,
  billing: <HiOutlineCreditCard />,
  platforms: <HiOutlineGlobeAlt />,
};

export default function AdminOrgDetailPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const isSystemAdmin =
    (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [platforms, setPlatforms] = useState<Record<string, unknown>[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "billing" | "platforms" | "tickets">("members");

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSystemAdmin, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/organizations/${encodeURIComponent(orgId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrg(data.organization);
      setMembers(data.members || []);
      setBilling(data.billing);
      setPlatforms(data.platforms);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getToken, orgId]);

  useEffect(() => {
    if (isSystemAdmin && orgId) fetchData();
  }, [isSystemAdmin, orgId, fetchData]);

  if (!isLoaded || !isSystemAdmin)
    return <div className={styles.empty}>Checking access...</div>;

  if (loading) return (
    <div className={styles.dashboard}>
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <span>Loading organization...</span>
      </div>
    </div>
  );

  if (!org) return <div className={styles.empty}>Organization not found.</div>;

  const tabs = [
    { key: "members" as const, label: "Members", count: members.length },
    { key: "tickets" as const, label: "Tickets", count: tickets.length },
    { key: "billing" as const, label: "Billing" },
    { key: "platforms" as const, label: "Platforms" },
  ];

  return (
    <div className={styles.dashboard}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/admin/organizations" className={styles.breadcrumbLink}>
          Organizations
        </Link>
        <HiOutlineChevronRight className={styles.breadcrumbSep} />
        <span className={styles.breadcrumbCurrent}>{org.name}</span>
      </div>

      {/* Org header */}
      <div className={styles.orgHeader}>
        <div className={styles.orgHeaderLeft}>
          {org.imageUrl ? (
            <Image
              src={org.imageUrl}
              alt={org.name}
              width={56}
              height={56}
              className={styles.orgAvatar}
            />
          ) : (
            <div className={styles.orgAvatarPlaceholder}>
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className={styles.orgName}>{org.name}</h1>
            <div className={styles.orgMeta}>
              {org.slug && <span className={styles.orgSlug}>/{org.slug}</span>}
              <span className={styles.orgMetaItem}>
                <HiOutlineUsers style={{ fontSize: "0.85rem" }} />
                {org.membersCount} member{org.membersCount !== 1 ? "s" : ""}
              </span>
              <span className={styles.orgMetaItem}>
                <HiOutlineCalendar style={{ fontSize: "0.85rem" }} />
                {new Date(org.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData} title="Refresh data">
          <HiOutlineRefresh />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className={styles.tabIcon}>{TAB_ICONS[tab.key]}</span>
            {tab.label}
            {"count" in tab && tab.count !== undefined && (
              <span className={styles.tabCount}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "members" && <MembersTab members={members} />}
        {activeTab === "tickets" && <TicketsTab tickets={tickets} />}
        {activeTab === "billing" && <BillingTab billing={billing} />}
        {activeTab === "platforms" && <PlatformsTab platforms={platforms} />}
      </div>
    </div>
  );
}

function MembersTab({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return (
      <div className={styles.emptyState}>
        <HiOutlineUsers className={styles.emptyIcon} />
        <p>No members found</p>
      </div>
    );
  }

  return (
    <div className={styles.membersList}>
      {members.map((m) => (
        <div key={m.userId} className={styles.memberCard}>
          {m.imageUrl ? (
            <Image
              src={m.imageUrl}
              alt={`${m.firstName || ""} ${m.lastName || ""}`}
              width={40}
              height={40}
              className={styles.memberAvatar}
            />
          ) : (
            <div className={styles.memberAvatarPlaceholder}>
              {(m.firstName || "?").charAt(0)}
            </div>
          )}
          <div className={styles.memberInfo}>
            <div className={styles.memberName}>
              {m.firstName || ""} {m.lastName || ""}
            </div>
            <div className={styles.memberJoined}>
              Joined {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <span
            className={styles.roleBadge}
            style={m.role === "org:admin"
              ? { background: "#f3f0ff", color: "#7c3aed" }
              : { background: "#f4f4f5", color: "#52525b" }
            }
          >
            {m.role === "org:admin" && <HiOutlineShieldCheck style={{ fontSize: "0.8rem" }} />}
            {ROLE_LABELS[m.role] || m.role}
          </span>
        </div>
      ))}
    </div>
  );
}

function TicketsTab({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className={styles.emptyState}>
        <HiOutlineChatAlt2 className={styles.emptyIcon} />
        <p>No support tickets</p>
      </div>
    );
  }

  return (
    <div className={styles.ticketsList}>
      {tickets.map((t) => (
        <div key={t.id} className={styles.ticketCard}>
          <div className={styles.ticketHeader}>
            <div className={styles.ticketSubject}>{t.subject}</div>
            <span
              className={styles.badge}
              style={{
                background: `${STATUS_COLORS[t.status] || "#94a3b8"}15`,
                color: STATUS_COLORS[t.status] || "#94a3b8",
                borderColor: `${STATUS_COLORS[t.status] || "#94a3b8"}30`,
              }}
            >
              {t.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className={styles.ticketMeta}>
            <span
              className={styles.priorityDot}
              style={{ background: PRIORITY_COLORS[t.priority] || "#94a3b8" }}
            />
            <span className={styles.ticketMetaText}>{t.priority}</span>
            <span className={styles.ticketMetaSep} />
            <span className={styles.ticketMetaText}>{t.category}</span>
            <span className={styles.ticketMetaSep} />
            <span className={styles.ticketMetaText}>
              {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  ministry_pro: "Ministry Pro",
  enterprise: "Enterprise",
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: "#dcfce7", color: "#16a34a" },
  trialing: { bg: "#dbeafe", color: "#2563eb" },
  past_due: { bg: "#fef3c7", color: "#d97706" },
  canceled: { bg: "#fee2e2", color: "#dc2626" },
  inactive: { bg: "#f4f4f5", color: "#71717a" },
};

function BillingTab({ billing }: { billing: Record<string, unknown> | null }) {
  if (!billing) {
    return (
      <div className={styles.emptyState}>
        <HiOutlineCreditCard className={styles.emptyIcon} />
        <p>Billing data unavailable</p>
      </div>
    );
  }

  const tier = String(billing.tier || billing.plan || "free");
  const status = String(billing.status || "inactive");
  const badgeStyle = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.inactive;

  return (
    <div className={styles.billingLayout}>
      {/* Subscription card - full width */}
      <div className={`${styles.billingCard} ${styles.billingCardPrimary}`}>
        <div className={styles.billingPlanRow}>
          <div className={styles.billingPlanInfo}>
            <div className={styles.billingPlanName}>{TIER_LABELS[tier] || tier}</div>
            <div className={styles.billingPlanMeta}>Current plan</div>
          </div>
          <span
            className={styles.billingStatusBadge}
            style={{ background: badgeStyle.bg, color: badgeStyle.color }}
          >
            <span className={styles.statusDot} style={{ background: badgeStyle.color }} />
            {status.replace(/_/g, " ")}
          </span>
        </div>
        {billing.currentPeriodEnd ? (
          <div className={styles.billingRenewal}>
            <HiOutlineCalendar style={{ fontSize: "0.9rem", color: "#a1a1aa" }} />
            <span>Renews {formatDate(billing.currentPeriodEnd)}</span>
          </div>
        ) : null}
      </div>

      {/* Payment */}
      <div className={styles.billingCard}>
        <div className={styles.billingCardHeader}>
          <HiOutlineCreditCard />
          Payment Details
        </div>
        <div className={styles.billingRows}>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Provider</span>
            <span className={styles.billingRowValue}>
              {billing.paymentProvider ? String(billing.paymentProvider) : <span className={styles.muted}>Not configured</span>}
            </span>
          </div>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Customer ID</span>
            <span className={styles.billingRowValue}>
              {billing.paymentCustomerId
                ? <code className={styles.codeText}>{String(billing.paymentCustomerId)}</code>
                : <span className={styles.muted}>—</span>}
            </span>
          </div>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Subscription ID</span>
            <span className={styles.billingRowValue}>
              {billing.paymentSubscriptionId
                ? <code className={styles.codeText}>{String(billing.paymentSubscriptionId)}</code>
                : <span className={styles.muted}>—</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Record */}
      <div className={styles.billingCard}>
        <div className={styles.billingCardHeader}>
          <HiOutlineCalendar />
          Record Info
        </div>
        <div className={styles.billingRows}>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Billing ID</span>
            <span className={styles.billingRowValue}>
              <code className={styles.codeText}>{String(billing.id || "—")}</code>
            </span>
          </div>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Created</span>
            <span className={styles.billingRowValue}>{formatDate(billing.createdAt)}</span>
          </div>
          <div className={styles.billingRow}>
            <span className={styles.billingRowLabel}>Last updated</span>
            <span className={styles.billingRowValue}>{formatDate(billing.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  facebook: { bg: "#e8f0fe", color: "#1877f2", icon: "f" },
  instagram: { bg: "#fce7f3", color: "#e4405f", icon: "" },
  twitter: { bg: "#e8f4fd", color: "#1da1f2", icon: "" },
  youtube: { bg: "#fee2e2", color: "#ff0000", icon: "▶" },
  whatsapp: { bg: "#dcfce7", color: "#25d366", icon: "" },
  telegram: { bg: "#dbeafe", color: "#0088cc", icon: "" },
  tiktok: { bg: "#f4f4f5", color: "#18181b", icon: "♪" },
};

function PlatformsTab({ platforms }: { platforms: Record<string, unknown>[] | null }) {
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return (
      <div className={styles.emptyState}>
        <HiOutlineGlobeAlt className={styles.emptyIcon} />
        <p>No platforms connected</p>
      </div>
    );
  }

  return (
    <div className={styles.platformsList}>
      {platforms.map((p, i) => {
        const name = String(p.platform || p.name || `Platform ${i + 1}`).toLowerCase();
        const brandStyle = PLATFORM_COLORS[name] || { bg: "#f4f4f5", color: "#52525b", icon: "•" };
        return (
          <div key={i} className={styles.platformCard}>
            <div className={styles.platformIcon} style={{ background: brandStyle.bg, color: brandStyle.color }}>
              {brandStyle.icon || name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.platformInfo}>
              <div className={styles.platformName}>{name}</div>
              <div className={styles.platformStatus} style={{
                color: p.connected ? "#16a34a" : "#a1a1aa"
              }}>
                <span className={styles.statusDot} style={{
                  background: p.connected ? "#16a34a" : "#d4d4d8"
                }} />
                {p.connected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
