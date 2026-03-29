"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

/* ── Type definitions ─────────────────────────────────── */

interface OrgMetrics {
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  byPlatform: Record<string, { impressions: number; likes: number; comments: number; shares: number; reach: number }>;
}

interface Post {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  publishResults: { platform: string; status: string; platformPostId?: string; error?: string }[];
  createdAt: string;
}

interface Series {
  id: string;
  title: string;
  theme?: string;
  status: string;
  totalPosts: number;
  startDate?: string;
  endDate?: string;
  color: string;
}

interface PlatformConnection {
  id: string;
  platform: string;
  connected: boolean;
  handle?: string;
}

interface DashboardData {
  metrics: OrgMetrics | null;
  posts: Post[];
  scheduled: Post[];
  series: Series[];
  platforms: PlatformConnection[];
}

interface TrendPoint {
  date: string;
  engagement: number;
  reach: number;
  impressions: number;
}

/* ── Main Dashboard ───────────────────────────────────── */

export default function DashboardPage() {
  const { getToken, isSignedIn } = useAuth();
  const { organization } = useOrganization();
  const [data, setData] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn && typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  }, [isSignedIn]);

  const fetchDashboard = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const orgId = organization.id;

      const [metricsRes, postsRes, scheduledRes, seriesRes, platformsRes] = await Promise.all([
        fetch(`/api/metrics/${orgId}`, { headers }),
        fetch(`/api/posts/${orgId}`, { headers }),
        fetch(`/api/posts/${orgId}/scheduled`, { headers }),
        fetch(`/api/series/${orgId}`, { headers }),
        fetch(`/api/platforms/${orgId}`, { headers }),
      ]);

      const [metrics, posts, scheduled, series, platforms] = await Promise.all([
        metricsRes.ok ? metricsRes.json() : null,
        postsRes.ok ? postsRes.json() : [],
        scheduledRes.ok ? scheduledRes.json() : [],
        seriesRes.ok ? seriesRes.json() : [],
        platformsRes.ok ? platformsRes.json() : [],
      ]);

      setData({ metrics, posts, scheduled, series, platforms });

      // Fetch history for growth trends
      const published = (posts as Post[]).filter(
        (p: Post) => p.status === "published" || p.status === "partially_failed",
      );
      const historyResults = await Promise.all(
        published.slice(0, 15).map(async (post: Post) => {
          try {
            const res = await fetch(`/api/metrics/${orgId}/post/${post.id}/history`, { headers });
            if (!res.ok) return [];
            const d = await res.json();
            return Array.isArray(d) ? d : [];
          } catch {
            return [];
          }
        }),
      );
      const allSnapshots = historyResults.flat();
      const byDate: Record<string, { engagement: number; reach: number; impressions: number }> = {};
      for (const snap of allSnapshots) {
        const day = new Date(snap.fetchedAt).toISOString().split("T")[0];
        if (!byDate[day]) byDate[day] = { engagement: 0, reach: 0, impressions: 0 };
        byDate[day].engagement += (snap.likes || 0) + (snap.comments || 0) + (snap.shares || 0);
        byDate[day].reach += snap.reach || 0;
        byDate[day].impressions += snap.impressions || 0;
      }
      setTrendData(
        Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({ date, ...vals })),
      );
    } catch {
      setError("Failed to load dashboard data. Make sure your services are running.");
    } finally {
      setLoading(false);
    }
  }, [getToken, organization?.id]);

  useEffect(() => {
    if (isSignedIn && organization?.id) {
      fetchDashboard();
    }
  }, [isSignedIn, organization?.id, fetchDashboard]);

  if (!isSignedIn) return null;

  /* Derived data */
  const connectedPlatforms = data?.platforms.filter((p) => p.connected) ?? [];
  const publishedPosts = data?.posts.filter((p) => p.status === "published" || p.status === "partially_failed") ?? [];
  const recentPosts = publishedPosts.slice(0, 5);
  const activeSeries = data?.series.filter((s) => s.status === "Active" || s.status === "Upcoming") ?? [];
  const totalEngagement = data?.metrics
    ? data.metrics.totalLikes + data.metrics.totalComments + data.metrics.totalShares
    : 0;

  return (
    <div className={styles.dashboardWrap}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Dashboard</h1>
          <p className={styles.dashboardSub}>
            {organization?.name ? `${organization.name} — content overview` : "Welcome back! Here\u2019s your content overview."}
          </p>
        </div>
        {data && !loading && (
          <button className={styles.refreshBtn} onClick={fetchDashboard} title="Refresh data">
            ↻
          </button>
        )}
      </div>

      {/* ── Loading state ─────────────────────── */}
      {loading && (
        <div className={styles.dashboardRow}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.dashboardCard} ${styles.skeleton}`}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", height: 32 }} />
              <div className={styles.skeletonLine} style={{ width: "80%" }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ───────────────────────── */}
      {error && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p>{error}</p>
          <button className={styles.emptyAction} onClick={fetchDashboard}>Retry</button>
        </div>
      )}

      {/* ── Data loaded ───────────────────────── */}
      {data && !loading && !error && (
        <>
          {/* ── Metric cards ─────────────────── */}
          <div className={styles.dashboardRow}>
            <MetricCard
              title="Total Engagement"
              value={fmt(totalEngagement)}
              sub={totalEngagement > 0
                ? `${fmt(data.metrics!.totalLikes)} likes · ${fmt(data.metrics!.totalComments)} comments · ${fmt(data.metrics!.totalShares)} shares`
                : "Likes + comments + shares"}
              icon="❤️"
              accent="rose"
            />
            <MetricCard
              title="Total Reach"
              value={fmt(data.metrics?.totalReach ?? 0)}
              sub={data.metrics?.totalImpressions ? `${fmt(data.metrics.totalImpressions)} impressions` : "Across all platforms"}
              icon="👁️"
              accent="blue"
            />
            <MetricCard
              title="Published Posts"
              value={String(publishedPosts.length)}
              sub={data.posts.length > publishedPosts.length
                ? `${data.posts.length - publishedPosts.length} drafts / scheduled`
                : "Total published"}
              icon="📝"
              accent="amber"
            />
            <MetricCard
              title="Connected Platforms"
              value={String(connectedPlatforms.length)}
              sub={connectedPlatforms.length > 0
                ? connectedPlatforms.map((p) => p.platform).join(", ")
                : "No platforms connected yet"}
              icon="🔗"
              accent="violet"
            />
          </div>

          {/* ── Platform Breakdown ────────────── */}
          {data.metrics && Object.keys(data.metrics.byPlatform).length > 0 && (
            <div className={styles.dashboardCard} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionTitle}>Platform Breakdown</h2>
              <div className={styles.platformGrid}>
                {Object.entries(data.metrics.byPlatform).map(([platform, stats]) => (
                  <div key={platform} className={styles.platformItem}>
                    <div className={styles.platformName}>
                      <span className={styles.platformDot} style={{ background: platformColor(platform) }} />
                      {platform}
                    </div>
                    <div className={styles.platformStats}>
                      <span>{fmt(stats.impressions)} impressions</span>
                      <span>{fmt(stats.likes)} likes</span>
                      <span>{fmt(stats.comments)} comments</span>
                      <span>{fmt(stats.reach)} reach</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Growth Trends ────────────────── */}
          {trendData.length >= 2 && (
            <div className={styles.dashboardCard} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionTitle}>Growth Trends</h2>
              <DashTrendChart data={trendData} />
            </div>
          )}

          {/* ── Two-column: Upcoming Posts + Active Series ── */}
          <div className={styles.dashboardRow}>
            {/* Upcoming Posts */}
            <div className={`${styles.dashboardCard} ${styles.flexCard}`}>
              <h3 className={styles.sectionTitle}>Upcoming Posts</h3>
              {data.scheduled.length === 0 ? (
                <div className={styles.emptyInline}>
                  <span className={styles.emptyIcon}>📅</span>
                  <p>No scheduled posts yet.</p>
                  <Link href="/post" className={styles.emptyAction}>Schedule a Post</Link>
                </div>
              ) : (
                <div className={styles.itemList}>
                  {data.scheduled.slice(0, 4).map((post) => (
                    <div key={post.id} className={styles.itemCard}>
                      <div className={styles.listContent}>
                        {post.content.length > 100 ? post.content.slice(0, 100) + "…" : post.content}
                      </div>
                      <div className={styles.listMeta}>
                        {post.scheduledAt && formatDate(post.scheduledAt)}
                        {post.platforms.map((p) => (
                          <span key={p} className={styles.platformBadge}>{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {data.scheduled.length > 4 && (
                    <Link href="/scheduler" className={styles.viewAllLink}>
                      View all {data.scheduled.length} scheduled →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Active Series */}
            <div className={`${styles.dashboardCard} ${styles.flexCard}`}>
              <h3 className={styles.sectionTitle}>Active Series</h3>
              {activeSeries.length === 0 ? (
                <div className={styles.emptyInline}>
                  <span className={styles.emptyIcon}>📚</span>
                  <p>No active content series.</p>
                  <Link href="/planner" className={styles.emptyAction}>Create a Series</Link>
                </div>
              ) : (
                <div className={styles.itemList}>
                  {activeSeries.slice(0, 4).map((s) => (
                    <div key={s.id} className={styles.itemCard}>
                      <div className={styles.seriesHeader}>
                        <span className={styles.seriesColor} style={{ background: s.color }} />
                        <b>{s.title}</b>
                        <span className={`${styles.statusBadge} ${s.status === "Active" ? styles.statusActive : styles.statusUpcoming}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className={styles.listMeta}>
                        {s.theme && <span>{s.theme}</span>}
                        <span>{s.totalPosts} posts</span>
                        {s.startDate && s.endDate && (
                          <span>{formatShortDate(s.startDate)} – {formatShortDate(s.endDate)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeSeries.length > 4 && (
                    <Link href="/planner" className={styles.viewAllLink}>
                      View all {activeSeries.length} series →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Activity ────────────────── */}
          <div className={styles.dashboardCard} style={{ marginTop: 24 }}>
            <h3 className={styles.sectionTitle}>Recent Activity</h3>
            {recentPosts.length === 0 ? (
              <div className={styles.emptyInline}>
                <span className={styles.emptyIcon}>🚀</span>
                <p>No published posts yet. Create and publish your first post!</p>
                <Link href="/post" className={styles.emptyAction}>Create a Post</Link>
              </div>
            ) : (
              <div className={styles.itemList}>
                {recentPosts.map((post) => (
                  <div key={post.id} className={styles.itemCard}>
                    <div className={styles.listContent}>
                      {post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content}
                    </div>
                    <div className={styles.listMeta}>
                      {post.publishedAt && <span>Published {formatDate(post.publishedAt)}</span>}
                      {post.publishResults.map((r) => (
                        <span
                          key={r.platform}
                          className={`${styles.platformBadge} ${r.status === "published" ? styles.badgeSuccess : styles.badgeFail}`}
                        >
                          {r.platform} {r.status === "published" ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {publishedPosts.length > 5 && (
                  <Link href="/content" className={styles.viewAllLink}>
                    View all {publishedPosts.length} posts →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Quick Actions ─────────────────── */}
          <div className={styles.dashboardActions}>
            <Link href="/post" className={styles.actionPrimary}>
              ✈️ Create New Post
            </Link>
            {connectedPlatforms.length < 2 && (
              <Link href="/settings" className={styles.actionSecondary}>
                🔗 Connect Platforms
              </Link>
            )}
            <Link href="/analytics" className={styles.actionSecondary}>
              📈 View Analytics
            </Link>
          </div>
        </>
      )}

      {/* ── No org selected ───────────────────── */}
      {!organization && isSignedIn && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏛️</span>
          <p>Select or create an organization from the sidebar to get started.</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function MetricCard({ title, value, sub, icon, accent }: { title: string; value: string; sub?: string; icon?: string; accent?: string }) {
  const accentClass = accent ? styles[`accent_${accent}`] : "";
  return (
    <div className={`${styles.dashboardCard} ${styles.metricCard} ${accentClass}`}>
      <div className={styles.metricHeader}>
        {icon && <span className={styles.metricIcon}>{icon}</span>}
        <span className={styles.metricTitle}>{title}</span>
      </div>
      <div className={styles.metricValue}>{value}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function platformColor(name: string): string {
  const colors: Record<string, string> = {
    Instagram: "#E1306C",
    Facebook: "#1877F2",
    "X (Twitter)": "#000",
    YouTube: "#FF0000",
    WhatsApp: "#25D366",
  };
  return colors[name] ?? "#6b7280";
}

/* ── Dashboard Trend Chart ────────────────────────────── */

function DashTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null;

  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 36, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const series: { key: keyof TrendPoint; color: string; label: string }[] = [
    { key: "impressions", color: "#22c55e", label: "Impressions" },
    { key: "reach", color: "#3b82f6", label: "Reach" },
    { key: "engagement", color: "#f43f5e", label: "Engagement" },
  ];

  const allValues = data.flatMap((d) => series.map((s) => d[s.key] as number));
  const maxVal = Math.max(...allValues, 1);

  function toX(i: number) {
    return PAD.left + (i / (data.length - 1)) * chartW;
  }
  function toY(v: number) {
    return PAD.top + chartH - (v / maxVal) * chartH;
  }

  return (
    <div>
      <div className={styles.trendLegend}>
        {series.map((s) => (
          <span key={s.key} className={styles.trendLegendItem}>
            <span className={styles.trendLegendDot} style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.trendSvg}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize={10}>
                {fmt(Math.round(maxVal * pct))}
              </text>
            </g>
          );
        })}
        {series.map((s) => {
          const points = data.map((d, i) => `${toX(i)},${toY(d[s.key] as number)}`).join(" ");
          return (
            <g key={s.key}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={toX(i)}
                  cy={toY(d[s.key] as number)}
                  r={4}
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}
        {data.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={10}
          >
            {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    </div>
  );
}
