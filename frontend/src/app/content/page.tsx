"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineClock,
  HiOutlineDuplicate,
  HiOutlineExternalLink,
  HiOutlinePencil,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import styles from "./content.module.css";

/* ── Types ── */
type PostRecord = {
  id: string;
  content: string;
  imageUrl?: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  publishResults?: { platform: string; status: string; error?: string; platformPostId?: string }[];
};

type StatusFilter = "all" | "draft" | "scheduled" | "published" | "failed";

/* ── Helpers ── */
function platformIcon(name: string) {
  const map: Record<string, React.ReactNode> = {
    Instagram: <FaInstagram style={{ color: "#E1306C" }} />,
    Facebook: <FaFacebookF style={{ color: "#1877F2" }} />,
    "X (Twitter)": <FaXTwitter style={{ color: "#000" }} />,
    WhatsApp: <FaWhatsapp style={{ color: "#25D366" }} />,
  };
  return map[name] || null;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
];

/* ── Component ── */
function ContentLibraryPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilter = (searchParams.get("filter") as StatusFilter) || "all";
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Fetch all posts ── */
  const fetchPosts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
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

  /* ── Filtered + searched posts ── */
  const filteredPosts = posts
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "failed") return p.status === "failed" || p.status === "partially_failed";
      return p.status === filter;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      return p.content.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  /* ── Counts for tabs ── */
  const counts: Record<StatusFilter, number> = {
    all: posts.length,
    draft: posts.filter(p => p.status === "draft").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
    failed: posts.filter(p => p.status === "failed" || p.status === "partially_failed").length,
  };

  /* ── Actions ── */
  const handlePublish = async (postId: string) => {
    if (!orgId) return;
    setActionLoading(postId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}/${postId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Publish failed");
      }
      showToast("success", "Post published successfully!");
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publish failed";
      showToast("error", msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    if (!orgId) return;
    setActionLoading(postId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}/${postId}/schedule`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Cancel failed");
      }
      showToast("success", "Schedule cancelled — reverted to draft");
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancel failed";
      showToast("error", msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!orgId) return;
    setActionLoading(postId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Delete failed");
      }
      showToast("success", "Post deleted");
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      showToast("error", msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReuse = (post: PostRecord) => {
    const params = new URLSearchParams();
    params.set("reuse", post.id);
    router.push(`/post?${params.toString()}`);
  };

  const handleEdit = (post: PostRecord) => {
    const params = new URLSearchParams();
    params.set("edit", post.id);
    router.push(`/post?${params.toString()}`);
  };

  if (!orgId) {
    return (
      <div className={styles.container}>
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 60 }}>
          Select an organization to view your content.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Library</h1>
          <p className={styles.subtitle}>Browse, manage, and reuse all your posts</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchPosts} disabled={loading}>
          <HiOutlineRefresh className={loading ? styles.spinning : ""} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${filter === tab.key ? styles.tabActive : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            <span className={styles.tabCount}>{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <HiOutlineSearch className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search posts by content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Loading your content...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            {search ? "No posts match your search" : `No ${filter === "all" ? "" : filter} posts yet`}
          </p>
          <p className={styles.emptyHint}>
            Head to the Publisher to create new content
          </p>
        </div>
      ) : (
        <div className={styles.postGrid}>
          {filteredPosts.map((post) => (
            <div key={post.id} className={styles.postCard}>
              {/* Status + date header */}
              <div className={styles.postHeader}>
                <span className={`${styles.statusBadge} ${
                  post.status === "draft" ? styles.statusDraft
                  : post.status === "scheduled" ? styles.statusScheduled
                  : post.status === "published" ? styles.statusPublished
                  : styles.statusFailed
                }`}>
                  {post.status === "partially_failed" ? "partial fail" : post.status}
                </span>
                <span className={styles.postDate}>
                  {formatDateTime(post.createdAt)}
                </span>
              </div>

              {/* Content preview */}
              <div className={styles.postContent}>{post.content}</div>

              {/* Image thumbnail */}
              {post.imageUrl && (
                <div className={styles.postImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.imageUrl} alt="" className={styles.postImageImg} />
                </div>
              )}

              {/* Platforms */}
              {post.platforms && post.platforms.length > 0 && (
                <div className={styles.postPlatforms}>
                  {post.platforms.map((p) => (
                    <span key={p} className={styles.platformTag}>
                      {platformIcon(p)}
                    </span>
                  ))}
                </div>
              )}

              {/* Schedule/publish time */}
              {post.scheduledAt && post.status === "scheduled" && (
                <div className={styles.postMeta}>
                  <HiOutlineClock /> Scheduled: {formatDateTime(post.scheduledAt)}
                </div>
              )}
              {post.publishedAt && (
                <div className={styles.postMeta}>
                  <HiOutlineExternalLink /> Published: {formatDateTime(post.publishedAt)}
                </div>
              )}

              {/* Error details (expandable for failed) */}
              {(post.status === "failed" || post.status === "partially_failed") && post.publishResults && (
                <div className={styles.errorSection}>
                  <button
                    className={styles.errorToggle}
                    onClick={() => setExpandedErrors(expandedErrors === post.id ? null : post.id)}
                  >
                    <HiOutlineExclamationCircle /> {expandedErrors === post.id ? "Hide errors" : "View errors"}
                  </button>
                  {expandedErrors === post.id && (
                    <div className={styles.errorList}>
                      {post.publishResults
                        .filter(r => r.platform !== "__auth__" && r.status === "failed")
                        .map((r, i) => (
                          <div key={i} className={styles.errorItem}>
                            <strong>{r.platform}:</strong> {r.error || "Unknown error"}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className={styles.postActions}>
                {/* Draft actions */}
                {post.status === "draft" && (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handlePublish(post.id)}
                      disabled={actionLoading === post.id}
                      title="Publish now"
                    >
                      <HiOutlineExternalLink /> Publish
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleEdit(post)}
                      title="Edit in Publisher"
                    >
                      <HiOutlinePencil /> Edit
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionDanger}`}
                      onClick={() => handleDelete(post.id)}
                      disabled={actionLoading === post.id}
                      title="Delete"
                    >
                      <HiOutlineTrash />
                    </button>
                  </>
                )}

                {/* Scheduled actions */}
                {post.status === "scheduled" && (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleCancelSchedule(post.id)}
                      disabled={actionLoading === post.id}
                      title="Cancel schedule"
                    >
                      <HiOutlineClock /> Unschedule
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleReuse(post)}
                      title="Reuse content"
                    >
                      <HiOutlineDuplicate /> Reuse
                    </button>
                  </>
                )}

                {/* Published actions */}
                {post.status === "published" && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleReuse(post)}
                    title="Reuse content in a new post"
                  >
                    <HiOutlineDuplicate /> Reuse
                  </button>
                )}

                {/* Failed / partially_failed actions */}
                {(post.status === "failed" || post.status === "partially_failed") && (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handlePublish(post.id)}
                      disabled={actionLoading === post.id}
                      title="Retry publish"
                    >
                      <HiOutlineRefresh /> Retry
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleReuse(post)}
                      title="Reuse content"
                    >
                      <HiOutlineDuplicate /> Reuse
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionDanger}`}
                      onClick={() => handleDelete(post.id)}
                      disabled={actionLoading === post.id}
                      title="Delete"
                    >
                      <HiOutlineTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
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

export default function ContentLibraryPageWrapper() {
  return (
    <Suspense>
      <ContentLibraryPage />
    </Suspense>
  );
}
