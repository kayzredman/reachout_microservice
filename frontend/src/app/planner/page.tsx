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

interface PlannerTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  suggestedDuration: number;
  suggestedPostsPerWeek: number;
  suggestedPlatforms: string[];
  themes: string[];
}

interface GeneratedPost {
  content: string;
  platforms: string[];
  suggestedDate: string;
  seriesNumber: number;
}

interface GeneratedPlan {
  series: {
    title: string;
    theme: string;
    description: string;
    color: string;
    startDate: string;
    endDate: string;
    platforms: string[];
    totalPosts: number;
  };
  posts: GeneratedPost[];
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#10b981",
  Upcoming: "#2563eb",
  Completed: "#6b7280",
};

const ALL_PLATFORMS = ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"];

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

  // Template + Generate state
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [genStep, setGenStep] = useState<"closed" | "options" | "loading" | "preview" | "committing">("closed");
  const [selectedTemplate, setSelectedTemplate] = useState<PlannerTemplate | null>(null);
  const [genTopic, setGenTopic] = useState("");
  const [genDuration, setGenDuration] = useState("");
  const [genPostsPerWeek, setGenPostsPerWeek] = useState("");
  const [genStartDate, setGenStartDate] = useState("");
  const [genChurchName, setGenChurchName] = useState("");
  const [genPlatforms, setGenPlatforms] = useState<string[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  // AI generation state
  const [canUseAi, setCanUseAi] = useState(false);
  const [genMode, setGenMode] = useState<"template" | "ai">("template");
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("inspirational");
  const [aiPosts, setAiPosts] = useState("6");
  const [aiPlatforms, setAiPlatforms] = useState<string[]>(["Instagram", "Facebook"]);
  const [aiStartDate, setAiStartDate] = useState("");
  const [aiChurchName, setAiChurchName] = useState("");

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

  // Fetch templates from content planner service
  useEffect(() => {
    fetch("/api/planner/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => {});
  }, []);

  // Check if org can use AI features
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/planner/${orgId}/can-use-ai`)
      .then((r) => (r.ok ? r.json() : { allowed: false }))
      .then((d) => setCanUseAi(d.allowed === true))
      .catch(() => setCanUseAi(false));
  }, [orgId]);

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

  const handleSelectTemplate = (tpl: PlannerTemplate) => {
    setSelectedTemplate(tpl);
    setGenTopic(tpl.name);
    setGenDuration(String(tpl.suggestedDuration));
    setGenPostsPerWeek(String(tpl.suggestedPostsPerWeek));
    setGenStartDate(new Date().toISOString().split("T")[0]);
    setGenPlatforms([...tpl.suggestedPlatforms]);
    setGenChurchName("");
    setGeneratedPlan(null);
    setGenStep("options");
  };

  const handleGenerate = async () => {
    if (!orgId || !selectedTemplate) return;
    setGenStep("loading");
    try {
      const res = await fetch(`/api/planner/${orgId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          topic: genTopic || undefined,
          platforms: genPlatforms,
          postsPerWeek: genPostsPerWeek ? parseInt(genPostsPerWeek, 10) : undefined,
          duration: genDuration ? parseInt(genDuration, 10) : undefined,
          startDate: genStartDate || undefined,
          churchName: genChurchName || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const plan: GeneratedPlan = await res.json();
      setGeneratedPlan(plan);
      setGenStep("preview");
    } catch {
      showToast("Failed to generate plan", "error");
      setGenStep("options");
    }
  };

  const handleCommit = async () => {
    if (!orgId || !generatedPlan) return;
    setGenStep("committing");
    try {
      const token = await getToken();
      const res = await fetch(`/api/planner/${orgId}/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(generatedPlan),
      });
      if (!res.ok) throw new Error("Failed to commit");
      showToast(`Created series with ${generatedPlan.posts.length} posts!`, "success");
      setGenStep("closed");
      setGenMode("template");
      fetchSeries();
    } catch {
      showToast("Failed to create plan", "error");
      setGenStep("preview");
    }
  };

  const handleAiGenerate = async () => {
    if (!orgId || !aiTopic.trim()) return;
    setGenStep("loading");
    try {
      const res = await fetch(`/api/planner/${orgId}/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          posts: aiPosts ? parseInt(aiPosts, 10) : 6,
          platforms: aiPlatforms,
          tone: aiTone,
          churchName: aiChurchName || undefined,
          startDate: aiStartDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate AI plan");
      }
      const plan: GeneratedPlan = await res.json();
      setGeneratedPlan(plan);
      setGenStep("preview");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to generate AI plan", "error");
      setGenStep("options");
    }
  };

  const openAiGenerate = () => {
    setGenMode("ai");
    setSelectedTemplate(null);
    setAiTopic("");
    setAiTone("inspirational");
    setAiPosts("6");
    setAiPlatforms(["Instagram", "Facebook"]);
    setAiStartDate(new Date().toISOString().split("T")[0]);
    setAiChurchName("");
    setGeneratedPlan(null);
    setGenStep("options");
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
        <h2 className={styles.templatesSectionTitle}>Content Templates</h2>
        <p className={styles.templatesSubtitle}>
          Generate a complete content series with scripture-based posts, auto-scheduled to your preferred cadence.
        </p>

        {/* AI Generate Card */}
        <div className={styles.aiSection}>
          <div className={styles.aiCard}>
            <div className={styles.aiCardBadge}>
              {canUseAi ? "Premium" : "Upgrade to Unlock"}
            </div>
            <div className={styles.aiCardIcon}>🤖</div>
            <h3 className={styles.aiCardTitle}>AI Content Generator</h3>
            <p className={styles.aiCardDesc}>
              Let AI create a custom content plan tailored to your church&apos;s voice, 
              themes, and preferred tone — powered by GPT-4o.
            </p>
            {canUseAi ? (
              <button className={styles.aiGenerateBtn} onClick={openAiGenerate}>
                ✨ Generate with AI
              </button>
            ) : (
              <div className={styles.aiUpgradePrompt}>
                <p>Available on Creator and Ministry Pro plans.</p>
                <button className={styles.aiUpgradeBtn} onClick={() => router.push("/settings?tab=billing")}>
                  Upgrade Plan →
                </button>
              </div>
            )}
          </div>
        </div>

        {templates.length === 0 ? (
          <div className={styles.emptyState}>Loading templates…</div>
        ) : (
          <div className={styles.templatesGrid}>
            {templates.map((t) => (
              <div key={t.id} className={styles.templateCard} style={{ borderTop: `3px solid ${t.color}` }}>
                <div className={styles.templateIcon}>{t.icon}</div>
                <h4 className={styles.templateTitle}>{t.name}</h4>
                <p className={styles.templateDesc}>{t.description}</p>
                <div className={styles.templateMeta}>
                  <span>{t.suggestedDuration} days</span>
                  <span className={styles.metaDot}>·</span>
                  <span>{t.suggestedPostsPerWeek}/week</span>
                </div>
                <div className={styles.templateThemes}>
                  {t.themes.slice(0, 4).map((th) => (
                    <span key={th} className={styles.themeTag}>{th}</span>
                  ))}
                </div>
                <button className={styles.generateBtn} onClick={() => handleSelectTemplate(t)}>
                  ✨ Generate Content
                </button>
              </div>
            ))}
          </div>
        )}
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

      {/* Generate Modal */}
      {genStep !== "closed" && (selectedTemplate || genMode === "ai") && (
        <div className={styles.modalOverlay} onClick={() => { setGenStep("closed"); setGenMode("template"); }}>
          <div className={styles.genModal} onClick={(e) => e.stopPropagation()}>

            {/* Step: Options — Template mode */}
            {genStep === "options" && genMode === "template" && selectedTemplate && (
              <>
                <div className={styles.genHeader} style={{ borderLeftColor: selectedTemplate.color }}>
                  <span className={styles.genHeaderIcon}>{selectedTemplate.icon}</span>
                  <div>
                    <h2 className={styles.modalTitle} style={{ marginBottom: 4 }}>{selectedTemplate.name}</h2>
                    <p className={styles.genHeaderDesc}>{selectedTemplate.description}</p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Series Title</label>
                  <input
                    className={styles.formInput}
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    placeholder="e.g. 30-Day Faith Challenge"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Duration (days)</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="1"
                      value={genDuration}
                      onChange={(e) => setGenDuration(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Posts per Week</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="1"
                      max="7"
                      value={genPostsPerWeek}
                      onChange={(e) => setGenPostsPerWeek(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Start Date</label>
                    <input
                      className={styles.formInput}
                      type="date"
                      value={genStartDate}
                      onChange={(e) => setGenStartDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Church Name (optional)</label>
                    <input
                      className={styles.formInput}
                      value={genChurchName}
                      onChange={(e) => setGenChurchName(e.target.value)}
                      placeholder="e.g. Grace Community"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Platforms</label>
                  <div className={styles.platformToggles}>
                    {ALL_PLATFORMS.map((p) => (
                      <label key={p} className={`${styles.platformToggle} ${genPlatforms.includes(p) ? styles.platformActive : ""}`}>
                        <input
                          type="checkbox"
                          checked={genPlatforms.includes(p)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGenPlatforms((prev) => [...prev, p]);
                            } else {
                              setGenPlatforms((prev) => prev.filter((x) => x !== p));
                            }
                          }}
                          style={{ display: "none" }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.genEstimate}>
                  ≈ {genDuration && genPostsPerWeek
                    ? Math.ceil(parseInt(genPostsPerWeek, 10) * (parseInt(genDuration, 10) / 7))
                    : "—"} posts will be generated
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => { setGenStep("closed"); setGenMode("template"); }}>Cancel</button>
                  <button
                    className={styles.saveBtn}
                    disabled={!genTopic.trim() || genPlatforms.length === 0}
                    onClick={handleGenerate}
                  >
                    ✨ Generate Preview
                  </button>
                </div>
              </>
            )}

            {/* Step: Options — AI mode */}
            {genStep === "options" && genMode === "ai" && (
              <>
                <div className={styles.genHeader} style={{ borderLeftColor: "#8b5cf6" }}>
                  <span className={styles.genHeaderIcon}>🤖</span>
                  <div>
                    <h2 className={styles.modalTitle} style={{ marginBottom: 4 }}>AI Content Generator</h2>
                    <p className={styles.genHeaderDesc}>Describe your topic and let AI create a custom content plan.</p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Topic / Series Theme *</label>
                  <input
                    className={styles.formInput}
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Overcoming Anxiety Through Faith"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Number of Posts</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="1"
                      max="30"
                      value={aiPosts}
                      onChange={(e) => setAiPosts(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Tone</label>
                    <select
                      className={styles.formInput}
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                    >
                      <option value="inspirational">Inspirational</option>
                      <option value="conversational">Conversational</option>
                      <option value="educational">Educational</option>
                      <option value="pastoral">Pastoral</option>
                      <option value="youthful">Youthful</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Start Date</label>
                    <input
                      className={styles.formInput}
                      type="date"
                      value={aiStartDate}
                      onChange={(e) => setAiStartDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Church Name (optional)</label>
                    <input
                      className={styles.formInput}
                      value={aiChurchName}
                      onChange={(e) => setAiChurchName(e.target.value)}
                      placeholder="e.g. Grace Community"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Platforms</label>
                  <div className={styles.platformToggles}>
                    {ALL_PLATFORMS.map((p) => (
                      <label key={p} className={`${styles.platformToggle} ${aiPlatforms.includes(p) ? styles.platformActive : ""}`}>
                        <input
                          type="checkbox"
                          checked={aiPlatforms.includes(p)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAiPlatforms((prev) => [...prev, p]);
                            } else {
                              setAiPlatforms((prev) => prev.filter((x) => x !== p));
                            }
                          }}
                          style={{ display: "none" }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => { setGenStep("closed"); setGenMode("template"); }}>Cancel</button>
                  <button
                    className={styles.saveBtn}
                    disabled={!aiTopic.trim() || aiPlatforms.length === 0}
                    onClick={handleAiGenerate}
                  >
                    🤖 Generate with AI
                  </button>
                </div>
              </>
            )}

            {/* Step: Loading */}
            {genStep === "loading" && (
              <div className={styles.genLoading}>
                <div className={styles.spinner} />
                <p>{genMode === "ai" ? "AI is crafting your content plan…" : "Generating your content plan…"}</p>
              </div>
            )}

            {/* Step: Preview */}
            {genStep === "preview" && generatedPlan && (
              <>
                <h2 className={styles.modalTitle}>Plan Preview</h2>

                <div className={styles.previewSeries}>
                  <div className={styles.previewSeriesBar} style={{ background: generatedPlan.series.color }} />
                  <div className={styles.previewSeriesInfo}>
                    <h3>{generatedPlan.series.title}</h3>
                    <p>
                      {formatDate(generatedPlan.series.startDate)} – {formatDate(generatedPlan.series.endDate)}
                      {" · "}
                      {generatedPlan.series.totalPosts} posts
                    </p>
                    <div className={styles.previewPlatforms}>
                      {generatedPlan.series.platforms.map((p) => (
                        <span key={p} className={styles.platformBadge}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.previewPostsList}>
                  {generatedPlan.posts.map((post) => (
                    <div key={post.seriesNumber} className={styles.previewPost}>
                      <div className={styles.previewPostNum}>#{post.seriesNumber}</div>
                      <div className={styles.previewPostBody}>
                        <div className={styles.previewPostDate}>{formatDate(post.suggestedDate)}</div>
                        <div className={styles.previewPostContent}>
                          {post.content.length > 200
                            ? post.content.slice(0, 200) + "…"
                            : post.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => setGenStep("options")}>← Back</button>
                  <button className={styles.saveBtn} onClick={handleCommit}>
                    🚀 Create {generatedPlan.posts.length} Posts
                  </button>
                </div>
              </>
            )}

            {/* Step: Committing */}
            {genStep === "committing" && (
              <div className={styles.genLoading}>
                <div className={styles.spinner} />
                <p>Creating series and posts…</p>
              </div>
            )}
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
