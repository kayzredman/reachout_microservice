"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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

const ROLE_LABELS: Record<string, string> = {
  "org:admin": "Admin",
  "org:member": "Member",
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

  if (loading) return <div className={styles.empty}>Loading organization...</div>;

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
        <Link href="/admin/organizations">Organizations</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{org.name}</span>
      </div>

      {/* Org header */}
      <div className={styles.orgHeader}>
        {org.imageUrl ? (
          <Image
            src={org.imageUrl}
            alt={org.name}
            width={64}
            height={64}
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
            {org.slug && <span>/{org.slug}</span>}
            <span>{org.membersCount} member{org.membersCount !== 1 ? "s" : ""}</span>
            <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
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
    return <div className={styles.empty}>No members found.</div>;
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
            <div className={styles.memberRole}>
              {ROLE_LABELS[m.role] || m.role}
            </div>
          </div>
          <div className={styles.memberJoined}>
            Joined {new Date(m.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function TicketsTab({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return <div className={styles.empty}>No support tickets.</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Category</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr key={t.id}>
            <td style={{ fontWeight: 600 }}>{t.subject}</td>
            <td>
              <span
                className={styles.badge}
                style={{
                  background: `${STATUS_COLORS[t.status] || "#94a3b8"}20`,
                  color: STATUS_COLORS[t.status] || "#94a3b8",
                }}
              >
                {t.status.replace(/_/g, " ")}
              </span>
            </td>
            <td>{t.priority}</td>
            <td>{t.category}</td>
            <td style={{ fontSize: "0.82rem", color: "#71717a" }}>
              {new Date(t.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BillingTab({ billing }: { billing: Record<string, unknown> | null }) {
  if (!billing) {
    return <div className={styles.empty}>Billing data unavailable.</div>;
  }

  return (
    <div className={styles.infoGrid}>
      {Object.entries(billing).map(([key, value]) => (
        <div key={key} className={styles.infoItem}>
          <div className={styles.infoLabel}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</div>
          <div className={styles.infoValue}>{String(value ?? "—")}</div>
        </div>
      ))}
    </div>
  );
}

function PlatformsTab({ platforms }: { platforms: Record<string, unknown>[] | null }) {
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return <div className={styles.empty}>No platforms connected.</div>;
  }

  return (
    <div className={styles.platformsList}>
      {platforms.map((p, i) => (
        <div key={i} className={styles.platformCard}>
          <div className={styles.platformName}>
            {String(p.platform || p.name || `Platform ${i + 1}`)}
          </div>
          <div className={styles.platformStatus}>
            {p.connected ? (
              <span style={{ color: "#22c55e" }}>Connected</span>
            ) : (
              <span style={{ color: "#a1a1aa" }}>Disconnected</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
