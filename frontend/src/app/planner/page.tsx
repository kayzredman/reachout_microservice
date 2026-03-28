"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { HiOutlineTrash } from "react-icons/hi";
import styles from "./planner.module.css";

interface Series {
  id: string;
  title: string;
  theme?: string;
  description?: string;
  status: "Active" | "Upcoming" | "Completed";
  color: string;
  totalPosts: number;
  startDate?: string;
  endDate?: string;
  platforms: string[];
  publishedCount: number;
  totalCreated: number;
  progress: number;
  createdAt: string;
}

interface SeriesPost {
  id: string;
  content: string;
  status: string;
  seriesNumber: number;
  platforms: string[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#10b981",
  Upcoming: "#2563eb",
  Completed: "#6b7280",
};

const TEMPLATES = [
  { title: "30-Day Challenge", desc: "Daily Devotionals", totalPosts: 30, theme: "Daily Devotionals" },
  { title: "Weekly Sermon Series", desc: "Sunday Messages", totalPosts: 12, theme: "Sunday Messages" },
  { title: "Prayer Journey", desc: "Spiritual Growth", totalPosts: 21, theme: "Spiritual Growth" },
  { title: "Bible Study Series", desc: "Scripture Deep Dive", totalPosts: 10, theme: "Scripture Study" },
];

export default function PlannerPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const router = useRouter();

  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Active");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Manage Posts panel state
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [seriesPosts, setSeriesPosts] = useState<SeriesPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formTheme, setFormTheme] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Upcoming" | "Completed">("Active");
  const [formTotalPosts, setFormTotalPosts] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchSeries = useCallback(async () => {
    if (!orgId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/series/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch series");
      const data = await res.json();
      setSeriesList(data);
    } catch {
      showToast("Failed to load series", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, getToken, showToast]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const resetForm = () => {
    setFormTitle("");
    setFormTheme("");
    setFormDescription("");
    setFormStatus("Active");
    setFormTotalPosts("");
    setFormStartDate("");
    setFormEndDate("");
  };

  const handleCreate = async () => {
    if (!orgId || !formTitle.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/series/${orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          theme: formTheme.trim() || undefined,
          description: formDescription.trim() || undefined,
          status: formStatus,
          totalPosts: formTotalPosts ? parseInt(formTotalPosts, 10) : 0,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create series");
      showToast("Series created!", "success");
      setShowModal(false);
      resetForm();
      fetchSeries();
    } catch {
      showToast("Failed to create series", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!orgId || !confirm("Delete this series? Posts will be unlinked but not deleted.")) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/series/${orgId}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Series deleted", "success");
      fetchSeries();
    } catch {
      showToast("Failed to delete series", "error");
    }
  };

  const handleUseTemplate = (tpl: typeof TEMPLATES[number]) => {
    resetForm();
    setFormTitle(tpl.title);
    setFormTheme(tpl.theme);
    setFormTotalPosts(String(tpl.totalPosts));
    setShowModal(true);
  };

  // Manage Posts: fetch posts for a series
  const handleManagePosts = async (seriesId: string) => {
    if (expandedSeriesId === seriesId) {
      setExpandedSeriesId(null);
      setSeriesPosts([]);
      return;
    }
    setExpandedSeriesId(seriesId);
    setLoadingPosts(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/series/${orgId}/${seriesId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSeriesPosts(data.posts || []);
    } catch {
      showToast("Failed to load series posts", "error");
    } finally {
      setLoadingPosts(false);
    }
  };

  // Remove a post from a series
  const handleRemovePost = async (seriesId: string, postId: string) => {
    if (!orgId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/series/${orgId}/${seriesId}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove");
      showToast("Post removed from series", "success");
      handleManagePosts(seriesId);
      fetchSeries();
    } catch {
      showToast("Failed to remove post", "error");
    }
  };

  // Navigate to Publisher with seriesId
  const handleCreatePostForSeries = (seriesId: string, seriesTitle: string) => {
    router.push(`/post?seriesId=${seriesId}&seriesTitle=${encodeURIComponent(seriesTitle)}`);
  };

  // Compute tab counts
  const counts = { Active: 0, Upcoming: 0, Completed: 0 };
  seriesList.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1; });
  const totalPlanned = seriesList.reduce((sum, s) => sum + s.totalPosts, 0);

  const filtered = seriesList.filter((s) => s.status === tab);

  const formatDate = (d?: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (!orgId) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Select an organization to view the planner.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Content Planner</h1>
        <p className={styles.subtitle}>Organize and manage your devotional series and content themes</p>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{counts.Active}</div>
          <div className={styles.statLabel}>Currently running</div>
          <div className={styles.statSub}>Active Series</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalPlanned}</div>
          <div className={styles.statLabel}>Across all series</div>
          <div className={styles.statSub}>Total Posts Planned</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{counts.Completed}</div>
          <div className={styles.statLabel}>Successfully finished</div>
          <div className={styles.statSub}>Completed Series</div>
        </div>
        <button className={styles.newSeriesBtn} onClick={() => { resetForm(); setShowModal(true); }}>
          + New Series
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["Active", "Upcoming", "Completed"] as const).map((label) => (
          <button
            key={label}
            className={`${styles.tab} ${tab === label ? styles.tabActive : ""}`}
            onClick={() => setTab(label)}
          >
            {label} ({counts[label]})
          </button>
        ))}
      </div>

      {/* Series Cards */}
      {loading ? (
        <div className={styles.loadingState}>Loading series…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>No {tab.toLowerCase()} series yet. Create one to get started!</div>
      ) : (
        <div className={styles.seriesGrid}>
          {filtered.map((s) => (
            <div key={s.id} className={styles.seriesCard}>
              <button className={styles.deleteBtn} onClick={() => handleDelete(s.id)} title="Delete series"><HiOutlineTrash /></button>
              <div className={styles.seriesHeader}>
                <div>
                  <h3 className={styles.seriesTitle}>{s.title}</h3>
                  {s.theme && <p className={styles.seriesTheme}>{s.theme}</p>}
                </div>
                <span className={styles.statusBadge} style={{ background: STATUS_COLORS[s.status] }}>
                  {s.status}
                </span>
              </div>
              <div className={styles.seriesStats}>
                <div className={styles.seriesStatItem}>
                  <label>Total Posts</label>
                  <span>{s.totalPosts}</span>
                </div>
                <div className={styles.seriesStatItem}>
                  <label>Published</label>
                  <span>{s.publishedCount}</span>
                </div>
                <div className={styles.progressWrap}>
                  <label>Progress</label>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${s.progress}%`, background: s.color }}
                    />
                  </div>
                  <span className={styles.progressText}>{s.progress}%</span>
                </div>
              </div>
              {(s.startDate || s.endDate) && (
                <div className={styles.seriesDate}>
                  📅 {formatDate(s.startDate)}{s.endDate ? ` – ${formatDate(s.endDate)}` : ""}
                </div>
              )}
              <button className={styles.manageBtn} onClick={() => handleManagePosts(s.id)}>
                {expandedSeriesId === s.id ? "▲ Close Posts" : "📄 Manage Posts"}
              </button>

              {/* Expanded Posts Panel */}
              {expandedSeriesId === s.id && (
                <div className={styles.postsPanel}>
                  <div className={styles.postsPanelHeader}>
                    <span>Posts in this series ({seriesPosts.length})</span>
                    <button
                      className={styles.createPostBtn}
                      onClick={() => handleCreatePostForSeries(s.id, s.title)}
                    >
                      + Create Post
                    </button>
                  </div>

                  {loadingPosts ? (
                    <div className={styles.postsLoading}>Loading posts…</div>
                  ) : seriesPosts.length === 0 ? (
                    <div className={styles.postsEmpty}>
                      No posts yet.
                      <button
                        className={styles.createPostLink}
                        onClick={() => handleCreatePostForSeries(s.id, s.title)}
                      >
                        Create the first one →
                      </button>
                    </div>
                  ) : (
                    <div className={styles.postsList}>
                      {seriesPosts.map((p) => (
                        <div key={p.id} className={styles.postItem}>
                          <div className={styles.postNumber}>#{p.seriesNumber}</div>
                          <div className={styles.postContent}>
                            {p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}
                          </div>
                          <span
                            className={styles.postStatus}
                            data-status={p.status}
                          >
                            {p.status}
                          </span>
                          <div className={styles.postActions}>
                            <button
                              className={styles.postEditBtn}
                              onClick={() => router.push(`/post?edit=${p.id}`)}
                              title="Edit post"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.postRemoveBtn}
                              onClick={() => handleRemovePost(s.id, p.id)}
                              title="Remove from series"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Templates */}
      <div className={styles.templatesSection}>
        <h2 className={styles.templatesSectionTitle}>Popular Content Templates</h2>
        <div className={styles.templatesGrid}>
          {TEMPLATES.map((t) => (
            <div key={t.title} className={styles.templateCard}>
              <h4 className={styles.templateTitle}>{t.title}</h4>
              <p className={styles.templateDesc}>{t.desc}</p>
              <button className={styles.templateBtn} onClick={() => handleUseTemplate(t)}>
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Series</h2>

            <div className={styles.formGroup}>
              <label>Title *</label>
              <input
                className={styles.formInput}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. 30-Day Prayer Journey"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Theme</label>
              <input
                className={styles.formInput}
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
                placeholder="e.g. Spiritual Growth"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                className={styles.formInput}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the series"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select
                  className={styles.formInput}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "Active" | "Upcoming" | "Completed")}
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Total Posts</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0"
                  value={formTotalPosts}
                  onChange={(e) => setFormTotalPosts(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <input
                  className={styles.formInput}
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>End Date</label>
                <input
                  className={styles.formInput}
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className={styles.saveBtn}
                disabled={!formTitle.trim() || saving}
                onClick={handleCreate}
              >
                {saving ? "Creating…" : "Create Series"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
