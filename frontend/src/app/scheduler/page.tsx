"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import {
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
} from "react-icons/fa";
import { FaXTwitter, FaYoutube } from "react-icons/fa6";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineViewList,
  HiOutlineTrash,
} from "react-icons/hi";
import Link from "next/link";
import styles from "./scheduler.module.css";

/* ── Types ── */
type PostRecord = {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

/* ── Helpers ── */
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function platformIcon(name: string) {
  const map: Record<string, React.ReactNode> = {
    Instagram: <FaInstagram style={{ color: "#E1306C" }} />,
    Facebook: <FaFacebookF style={{ color: "#1877F2" }} />,
    "X (Twitter)": <FaXTwitter style={{ color: "#000" }} />,
    WhatsApp: <FaWhatsapp style={{ color: "#25D366" }} />,
    YouTube: <FaYoutube style={{ color: "#FF0000" }} />,
  };
  return map[name] || null;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/* ── Component ── */
export default function SchedulerPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [allPosts, setAllPosts] = useState<PostRecord[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Fetch posts ── */
  const fetchPosts = useCallback(async () => {
    if (!orgId) return;
    try {
      const token = await getToken();
      const [allRes, schedRes] = await Promise.all([
        fetch(`/api/posts/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/posts/${orgId}/scheduled`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (allRes.ok) {
        const data = await allRes.json();
        setAllPosts(data);
      }
      if (schedRes.ok) {
        const data = await schedRes.json();
        setScheduledPosts(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [orgId, getToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Cancel schedule ── */
  const handleCancel = async (postId: string) => {
    if (!orgId) return;
    setCancelling(postId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}/${postId}/schedule`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to cancel");
      }
      showToast("success", "Schedule cancelled — post reverted to draft");
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel";
      showToast("error", msg);
    } finally {
      setCancelling(null);
    }
  };

  /* ── Calendar logic ── */
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Build grid of weeks
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Posts mapped by day for the current month
  const postsByDay: Record<number, PostRecord[]> = {};
  const relevantPosts = [...allPosts].filter(p =>
    (p.status === "scheduled" && p.scheduledAt) ||
    (p.status === "published" && p.publishedAt) ||
    (p.status === "partially_failed" && p.publishedAt)
  );
  for (const p of relevantPosts) {
    const dateStr = p.scheduledAt || p.publishedAt;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(p);
    }
  }

  // Posts for selected date
  const selectedDayPosts = selectedDate
    ? relevantPosts.filter(p => {
        const dateStr = p.scheduledAt || p.publishedAt;
        return dateStr && isSameDay(new Date(dateStr), selectedDate);
      })
    : [];

  // Upcoming scheduled (for list view and sidebar)
  const upcoming = scheduledPosts.filter(p => p.scheduledAt && new Date(p.scheduledAt) > new Date());

  if (!orgId) {
    return (
      <div className={styles.container}>
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 60 }}>
          Select an organization to view your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Scheduler</h1>
        <p className={styles.subtitle}>
          Manage and schedule your content across platforms
        </p>
      </div>

      {/* View toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.viewBtn} ${view === "calendar" ? styles.viewBtnActive : ""}`}
          onClick={() => setView("calendar")}
        >
          <HiOutlineCalendar /> Calendar
        </button>
        <button
          className={`${styles.viewBtn} ${view === "list" ? styles.viewBtnActive : ""}`}
          onClick={() => setView("list")}
        >
          <HiOutlineViewList /> List
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── Main area ── */}
        <div className={styles.mainCol}>
          {view === "calendar" ? (
            <div className={styles.card}>
              {/* Month navigation */}
              <div className={styles.calendarHeader}>
                <button className={styles.calNavBtn} onClick={prevMonth}>
                  <HiOutlineChevronLeft />
                </button>
                <span className={styles.calMonthLabel}>
                  {MONTH_NAMES[month]} {year}
                </span>
                <button className={styles.calNavBtn} onClick={nextMonth}>
                  <HiOutlineChevronRight />
                </button>
              </div>

              {/* Day headers */}
              <div className={styles.calGrid}>
                {DAY_HEADERS.map((d) => (
                  <div key={d} className={styles.calDayHeader}>{d}</div>
                ))}

                {/* Calendar days */}
                {weeks.flat().map((day, idx) => {
                  if (day === null) {
                    return <div key={idx} className={styles.calCell} />;
                  }
                  const isToday = isSameDay(new Date(year, month, day), today);
                  const isSelected = selectedDate && isSameDay(new Date(year, month, day), selectedDate);
                  const hasPosts = postsByDay[day] && postsByDay[day].length > 0;
                  const hasScheduled = postsByDay[day]?.some(p => p.status === "scheduled");
                  const hasPublished = postsByDay[day]?.some(p => p.status === "published" || p.status === "partially_failed");

                  return (
                    <div
                      key={idx}
                      className={`${styles.calCell} ${styles.calCellClickable} ${isToday ? styles.calCellToday : ""} ${isSelected ? styles.calCellSelected : ""}`}
                      onClick={() => setSelectedDate(new Date(year, month, day))}
                    >
                      <span className={styles.calDayNum}>{day}</span>
                      {hasPosts && (
                        <div className={styles.calDots}>
                          {hasScheduled && <span className={styles.dotScheduled} />}
                          {hasPublished && <span className={styles.dotPublished} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className={styles.calLegend}>
                <span className={styles.legendItem}>
                  <span className={styles.dotScheduled} /> Scheduled
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.dotPublished} /> Published
                </span>
              </div>
            </div>
          ) : (
            /* List view */
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Upcoming Scheduled Posts</h2>
              {loading ? (
                <p className={styles.emptyText}>Loading...</p>
              ) : upcoming.length === 0 ? (
                <div className={styles.emptyState}>
                  <HiOutlineClock style={{ fontSize: 32, color: "#d1d5db" }} />
                  <p>No upcoming scheduled posts</p>
                  <p className={styles.emptyHint}>Go to the Publisher page to schedule content</p>
                </div>
              ) : (
                <div className={styles.postList}>
                  {upcoming.map((post) => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postCardHeader}>
                        <span className={styles.postTime}>
                          <HiOutlineClock /> {post.scheduledAt && formatDate(post.scheduledAt)} at {post.scheduledAt && formatTime(post.scheduledAt)}
                        </span>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancel(post.id)}
                          disabled={cancelling === post.id}
                          title="Cancel schedule"
                        >
                          {cancelling === post.id ? "..." : <HiOutlineTrash />}
                        </button>
                      </div>
                      <div className={styles.postContent}>{post.content}</div>
                      <div className={styles.postPlatforms}>
                        {post.platforms.map((p) => (
                          <span key={p} className={styles.platformTag}>
                            {platformIcon(p)} {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected date detail (calendar view) */}
          {view === "calendar" && selectedDate && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                {selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              {selectedDayPosts.length === 0 ? (
                <p className={styles.emptyText}>No posts on this date</p>
              ) : (
                <div className={styles.postList}>
                  {selectedDayPosts.map((post) => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postCardHeader}>
                        <span className={styles.postTime}>
                          <HiOutlineClock /> {(post.scheduledAt || post.publishedAt) && formatTime(post.scheduledAt || post.publishedAt!)}
                        </span>
                        <span className={`${styles.statusBadge} ${
                          post.status === "scheduled" ? styles.statusScheduled
                            : post.status === "published" ? styles.statusPublished
                            : styles.statusFailed
                        }`}>
                          {post.status}
                        </span>
                        {post.status === "scheduled" && (
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleCancel(post.id)}
                            disabled={cancelling === post.id}
                            title="Cancel schedule"
                          >
                            {cancelling === post.id ? "..." : <HiOutlineTrash />}
                          </button>
                        )}
                      </div>
                      <div className={styles.postContent}>{post.content}</div>
                      <div className={styles.postPlatforms}>
                        {post.platforms.map((p) => (
                          <span key={p} className={styles.platformTag}>
                            {platformIcon(p)} {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Side column ── */}
        <div className={styles.sideCol}>
          {/* Upcoming queue */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <HiOutlineClock style={{ marginRight: 6 }} /> Upcoming Queue
            </h3>
            {loading ? (
              <p className={styles.emptyText}>Loading...</p>
            ) : upcoming.length === 0 ? (
              <p className={styles.emptyText}>No scheduled posts</p>
            ) : (
              <div className={styles.queueList}>
                {upcoming.slice(0, 5).map((post) => (
                  <div key={post.id} className={styles.queueItem}>
                    <div className={styles.queueTime}>
                      {post.scheduledAt && formatDate(post.scheduledAt)}
                      <span className={styles.queueTimeDetail}>
                        {post.scheduledAt && formatTime(post.scheduledAt)}
                      </span>
                    </div>
                    <div className={styles.queueContent}>{post.content}</div>
                    <div className={styles.queuePlatforms}>
                      {post.platforms.map((p) => (
                        <span key={p} style={{ fontSize: 14 }}>{platformIcon(p)}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {upcoming.length > 5 && (
                  <p className={styles.emptyText}>+{upcoming.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Quick Stats</h3>
            <div className={styles.statsGrid}>
              <Link href="/content?filter=scheduled" className={styles.statBoxLink}>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>{scheduledPosts.length}</span>
                  <span className={styles.statLabel}>Scheduled</span>
                </div>
              </Link>
              <Link href="/content?filter=published" className={styles.statBoxLink}>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>
                    {allPosts.filter(p => p.status === "published").length}
                  </span>
                  <span className={styles.statLabel}>Published</span>
                </div>
              </Link>
              <Link href="/content?filter=draft" className={styles.statBoxLink}>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>
                    {allPosts.filter(p => p.status === "draft").length}
                  </span>
                  <span className={styles.statLabel}>Drafts</span>
                </div>
              </Link>
              <Link href="/content?filter=failed" className={styles.statBoxLink}>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>
                    {allPosts.filter(p => p.status === "failed" || p.status === "partially_failed").length}
                  </span>
                  <span className={styles.statLabel}>Failed</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Tip */}
          <div className={styles.tipBox}>
            💡 Schedule posts from the <strong>Publisher</strong> page using the Schedule button
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
