"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./analytics.module.css";

/* ── Types ────────────────────────────────────────────── */

interface OrgMetrics {
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  byPlatform: Record<
    string,
    { impressions: number; likes: number; comments: number; shares: number; reach: number }
  >;
}

interface Post {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  publishedAt?: string;
  publishResults: { platform: string; status: string; platformPostId?: string }[];
}

interface PostMetricsSnapshot {
  id: string;
  postId: string;
  platform: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  views: number;
  saves: number;
  engagementRate: number;
  deliveryStatus?: string;
  fetchedAt: string;
}

interface PostWithMetrics {
  post: Post;
  metrics: Record<string, PostMetricsSnapshot>;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
}

interface TrendPoint {
  date: string;
  engagement: number;
  reach: number;
  impressions: number;
}

type MetricTab = "engagement" | "reach" | "impressions";

/* ── Main component ───────────────────────────────────── */

export default function AnalyticsPage() {
  const { getToken, isSignedIn } = useAuth();
  const { organization } = useOrganization();
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [postsWithMetrics, setPostsWithMetrics] = useState<PostWithMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricTab, setMetricTab] = useState<MetricTab>("engagement");

  useEffect(() => {
    if (!isSignedIn && typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  }, [isSignedIn]);

  const fetchAnalytics = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const orgId = organization.id;

      const [metricsRes, postsRes] = await Promise.all([
        fetch(`/api/metrics/${orgId}`, { headers }),
        fetch(`/api/posts/${orgId}`, { headers }),
      ]);

      const orgMetrics: OrgMetrics | null = metricsRes.ok ? await metricsRes.json() : null;
      const allPosts: Post[] = postsRes.ok ? await postsRes.json() : [];

      setMetrics(orgMetrics);

      const published = allPosts.filter(
        (p) => p.status === "published" || p.status === "partially_failed",
      );

      const postMetricsResults = await Promise.all(
        published.slice(0, 20).map(async (post) => {
          try {
            const res = await fetch(`/api/metrics/${orgId}/post/${post.id}`, { headers });
            const data: Record<string, PostMetricsSnapshot> = res.ok ? await res.json() : {};
            const values = Object.values(data);
            return {
              post,
              metrics: data,
              totalEngagement: values.reduce((s, m) => s + m.likes + m.comments + m.shares, 0),
              totalReach: values.reduce((s, m) => s + m.reach, 0),
              totalImpressions: values.reduce((s, m) => s + m.impressions, 0),
            };
          } catch {
            return { post, metrics: {}, totalEngagement: 0, totalReach: 0, totalImpressions: 0 };
          }
        }),
      );

      postMetricsResults.sort((a, b) => b.totalEngagement - a.totalEngagement);
      setPostsWithMetrics(postMetricsResults);

      // Fetch history for growth trends
      const historyResults = await Promise.all(
        published.slice(0, 15).map(async (post) => {
          try {
            const res = await fetch(`/api/metrics/${orgId}/post/${post.id}/history`, { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
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
      setError("Failed to load analytics data. Make sure your services are running.");
    } finally {
      setLoading(false);
    }
  }, [getToken, organization?.id]);

  useEffect(() => {
    if (isSignedIn && organization?.id) {
      fetchAnalytics();
    }
  }, [isSignedIn, organization?.id, fetchAnalytics]);

  if (!isSignedIn) return null;

  const totalEngagement = metrics
    ? metrics.totalLikes + metrics.totalComments + metrics.totalShares
    : 0;
  const engagementRate =
    metrics && metrics.totalImpressions > 0
      ? ((totalEngagement / metrics.totalImpressions) * 100).toFixed(2)
      : "0.00";
  const platforms = metrics ? Object.keys(metrics.byPlatform) : [];
  const maxPlatformReach = metrics
    ? Math.max(...Object.values(metrics.byPlatform).map((p) => p.reach), 1)
    : 1;
  const maxPlatformEngagement = metrics
    ? Math.max(
        ...Object.values(metrics.byPlatform).map((p) => p.likes + p.comments + p.shares),
        1,
      )
    : 1;
  const maxPlatformImpressions = metrics
    ? Math.max(...Object.values(metrics.byPlatform).map((p) => p.impressions), 1)
    : 1;

  const topPosts = postsWithMetrics.slice(0, 10);
  const maxPostEng = Math.max(...topPosts.map((p) => p.totalEngagement), 1);

  return (
    <div className={styles.analyticsWrap}>
      <div className={styles.analyticsHeader}>
        <div>
          <h1 className={styles.analyticsTitle}>Analytics</h1>
          <p className={styles.analyticsSub}>
            {organization?.name
              ? `${organization.name} — engagement & performance insights`
              : "Track your growth and engagement across all platforms"}
          </p>
        </div>
        {metrics && !loading && (
          <button className={styles.refreshBtn} onClick={fetchAnalytics} title="Refresh data">
            ↻
          </button>
        )}
      </div>
      {/* ── Loading ── */}
      {loading && (
        <div className={styles.row}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.card} ${styles.skeleton}`}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", height: 32 }} />
              <div className={styles.skeletonLine} style={{ width: "80%" }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p>{error}</p>
          <button className={styles.emptyAction} onClick={fetchAnalytics}>
            Retry
          </button>
        </div>
      )}

      {/* ── No org ── */}
      {!organization && isSignedIn && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏛️</span>
          <p>Select or create an organization from the sidebar to get started.</p>
        </div>
      )}

      {/* ── Data loaded ── */}
      {metrics && !loading && !error && (
        <>
          {/* ── Overview metric cards ── */}
          <div className={styles.row}>
            <MetricCard
              title="Total Engagement"
              value={fmt(totalEngagement)}
              sub={`${fmt(metrics.totalLikes)} likes · ${fmt(metrics.totalComments)} comments · ${fmt(metrics.totalShares)} shares`}
              icon="❤️"
              accent="rose"
            />
            <MetricCard
              title="Total Reach"
              value={fmt(metrics.totalReach)}
              sub={`${fmt(metrics.totalImpressions)} impressions`}
              icon="👁️"
              accent="blue"
            />
            <MetricCard
              title="Engagement Rate"
              value={`${engagementRate}%`}
              sub="(Likes + comments + shares) / impressions"
              icon="📊"
              accent="green"
            />
            <MetricCard
              title="Platforms Tracked"
              value={String(platforms.length)}
              sub={platforms.length > 0 ? platforms.join(", ") : "No platform metrics yet"}
              icon="🔗"
              accent="violet"
            />
          </div>

          {/* ── Growth Trends ── */}
          {trendData.length >= 2 && (
            <div className={styles.card} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionTitle}>Growth Trends</h2>
              <TrendChart data={trendData} />
            </div>
          )}

          {/* ── Platform breakdown with bars ── */}
          {platforms.length > 0 && (
            <div className={styles.card} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Platform Breakdown</h2>
                <div className={styles.tabs}>
                  {(["engagement", "reach", "impressions"] as MetricTab[]).map((tab) => (
                    <button
                      key={tab}
                      className={`${styles.tab} ${metricTab === tab ? styles.tabActive : ""}`}
                      onClick={() => setMetricTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.platformGrid}>
                {Object.entries(metrics.byPlatform).map(([platform, stats]) => {
                  const engagement = stats.likes + stats.comments + stats.shares;
                  let barValue: number;
                  let barMax: number;
                  let barDisplay: string;

                  if (metricTab === "engagement") {
                    barValue = engagement;
                    barMax = maxPlatformEngagement;
                    barDisplay = fmt(engagement);
                  } else if (metricTab === "reach") {
                    barValue = stats.reach;
                    barMax = maxPlatformReach;
                    barDisplay = fmt(stats.reach);
                  } else {
                    barValue = stats.impressions;
                    barMax = maxPlatformImpressions;
                    barDisplay = fmt(stats.impressions);
                  }

                  const pct = barMax > 0 ? (barValue / barMax) * 100 : 0;

                  return (
                    <div key={platform}>
                      <div className={styles.platformRow}>
                        <div className={styles.platformName}>
                          <span
                            className={styles.platformDot}
                            style={{ background: platformColor(platform) }}
                          />
                          {platform}
                        </div>
                        <div className={styles.barWrap}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              background: platformColor(platform),
                              opacity: 0.7,
                            }}
                          />
                          <span className={styles.barLabel}>{barDisplay}</span>
                        </div>
                      </div>
                      <div className={styles.platformStatRow}>
                        <span>{fmt(stats.likes)} likes</span>
                        <span>{fmt(stats.comments)} comments</span>
                        <span>{fmt(stats.shares)} shares</span>
                        <span>{fmt(stats.reach)} reach</span>
                        <span>{fmt(stats.impressions)} impressions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Two-column: Post engagement chart + Recent performance ── */}
          <div className={styles.row}>
            <div className={`${styles.card} ${styles.flexCard}`} style={{ flex: 1 }}>
              <h3 className={styles.sectionTitle}>Post Engagement</h3>
              {topPosts.length === 0 ? (
                <div className={styles.emptyInline}>
                  <span className={styles.emptyIcon}>📊</span>
                  <p>No post engagement data yet.</p>
                  <Link href="/post" className={styles.emptyAction}>
                    Create a Post
                  </Link>
                </div>
              ) : (
                <div className={styles.chartWrap}>
                  <div className={styles.engChart} style={{ paddingBottom: 28 }}>
                    {topPosts.map((pw, i) => {
                      const h = maxPostEng > 0 ? (pw.totalEngagement / maxPostEng) * 150 : 0;
                      return (
                        <div
                          key={pw.post.id}
                          className={styles.engBar}
                          style={{
                            height: Math.max(h, 4),
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                          title={pw.post.content.slice(0, 80)}
                        >
                          <span className={styles.engBarValue}>{fmt(pw.totalEngagement)}</span>
                          <span className={styles.engBarLabel}>Post {i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`${styles.card} ${styles.flexCard}`} style={{ flex: 1 }}>
              <h3 className={styles.sectionTitle}>Recent Post Performance</h3>
              {postsWithMetrics.length === 0 ? (
                <div className={styles.emptyInline}>
                  <span className={styles.emptyIcon}>🚀</span>
                  <p>No published posts with metrics yet.</p>
                  <Link href="/post" className={styles.emptyAction}>
                    Publish a Post
                  </Link>
                </div>
              ) : (
                <div className={styles.recentList}>
                  {postsWithMetrics.slice(0, 5).map((pw) => (
                    <div key={pw.post.id} className={styles.itemCard}>
                      <div className={styles.recentContent}>
                        {pw.post.content.length > 100
                          ? pw.post.content.slice(0, 100) + "…"
                          : pw.post.content}
                      </div>
                      <div className={styles.recentMeta}>
                        <span>{fmt(pw.totalEngagement)} engagement</span>
                        <span>{fmt(pw.totalReach)} reach</span>
                        <span>{fmt(pw.totalImpressions)} impressions</span>
                        {pw.post.platforms.map((p) => (
                          <span key={p} className={styles.platformBadge}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Top performing posts table ── */}
          {postsWithMetrics.length > 0 && (
            <div className={styles.card} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionTitle}>Top Performing Posts</h2>
              <div style={{ overflowX: "auto" }}>
                <table className={styles.postTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Content</th>
                      <th>Platforms</th>
                      <th>Engagement</th>
                      <th>Reach</th>
                      <th>Impressions</th>
                      <th>Eng. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postsWithMetrics.slice(0, 10).map((pw, i) => {
                      const rate =
                        pw.totalImpressions > 0
                          ? ((pw.totalEngagement / pw.totalImpressions) * 100).toFixed(1)
                          : "—";
                      return (
                        <tr key={pw.post.id}>
                          <td>
                            <span className={styles.postRank}>{i + 1}</span>
                          </td>
                          <td>
                            <div className={styles.postContent}>
                              {pw.post.content.length > 80
                                ? pw.post.content.slice(0, 80) + "…"
                                : pw.post.content}
                            </div>
                          </td>
                          <td>
                            {pw.post.platforms.map((p) => (
                              <span key={p} className={styles.platformBadge}>
                                {p}
                              </span>
                            ))}
                          </td>
                          <td>
                            <span className={styles.postMetric}>{fmt(pw.totalEngagement)}</span>
                          </td>
                          <td>
                            <span className={styles.postMetric}>{fmt(pw.totalReach)}</span>
                          </td>
                          <td>
                            <span className={styles.postMetric}>{fmt(pw.totalImpressions)}</span>
                          </td>
                          <td>
                            <span
                              className={`${styles.engRateBadge} ${
                                rate !== "—" && parseFloat(rate) < 1 ? styles.engRateBadgeLow : ""
                              }`}
                            >
                              {rate === "—" ? rate : `${rate}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Insight summary cards ── */}
          <div className={styles.insightsRow}>
            <div className={styles.insightCard} style={{ borderTopColor: "#22c55e" }}>
              <div className={styles.insightLabel} style={{ color: "#16a34a" }}>
                📈 Top Platform
              </div>
              <div className={styles.insightValue}>{topPlatformByEngagement(metrics)}</div>
              <div className={styles.insightSub}>Highest total engagement across all posts</div>
            </div>
            <div className={styles.insightCard} style={{ borderTopColor: "#8b5cf6" }}>
              <div className={styles.insightLabel} style={{ color: "#7c3aed" }}>
                🏆 Best Post
              </div>
              <div className={styles.insightValue}>
                {postsWithMetrics[0]
                  ? `${fmt(postsWithMetrics[0].totalEngagement)} engagements`
                  : "—"}
              </div>
              <div className={styles.insightSub}>
                {postsWithMetrics[0]
                  ? postsWithMetrics[0].post.content.slice(0, 60) +
                    (postsWithMetrics[0].post.content.length > 60 ? "…" : "")
                  : "Publish posts to see insights"}
              </div>
            </div>
            <div className={styles.insightCard} style={{ borderTopColor: "#3b82f6" }}>
              <div className={styles.insightLabel} style={{ color: "#2563eb" }}>
                🎯 Avg Engagement Rate
              </div>
              <div className={styles.insightValue}>{engagementRate}%</div>
              <div className={styles.insightSub}>
                {parseFloat(engagementRate) >= 3
                  ? "Great rate! Keep it up"
                  : parseFloat(engagementRate) >= 1
                    ? "Solid rate — room to grow"
                    : "Try different content formats to boost engagement"}
              </div>
            </div>
          </div>

          {/* ── No data state ── */}
          {totalEngagement === 0 && platforms.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📈</span>
              <p>
                No analytics data yet. Publish posts to connected platforms and metrics will appear
                here as they&apos;re collected.
              </p>
              <Link href="/post" className={styles.emptyAction}>
                Create Your First Post
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function MetricCard({
  title,
  value,
  sub,
  icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: string;
  accent?: string;
}) {
  const accentClass = accent ? styles[`accent_${accent}`] : "";
  return (
    <div className={`${styles.card} ${styles.metricCard} ${accentClass}`}>
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

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#f43f5e", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#14b8a6"];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function platformColor(name: string): string {
  const colors: Record<string, string> = {
    Instagram: "#E1306C",
    Facebook: "#1877F2",
    "X (Twitter)": "#000",
    YouTube: "#FF0000",
    WhatsApp: "#25D366",
    TikTok: "#010101",
    LinkedIn: "#0A66C2",
    Pinterest: "#E60023",
  };
  return colors[name] || "#6b7280";
}

function topPlatformByEngagement(metrics: OrgMetrics): string {
  const entries = Object.entries(metrics.byPlatform);
  if (entries.length === 0) return "—";
  let best = entries[0];
  for (const entry of entries) {
    const eng = entry[1].likes + entry[1].comments + entry[1].shares;
    const bestEng = best[1].likes + best[1].comments + best[1].shares;
    if (eng > bestEng) best = entry;
  }
  return best[0];
}

/* ── Trend Chart ──────────────────────────────────────── */

function TrendChart({ data }: { data: TrendPoint[] }) {
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
        {/* Grid lines */}
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
        {/* Lines */}
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
        {/* X labels */}
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
