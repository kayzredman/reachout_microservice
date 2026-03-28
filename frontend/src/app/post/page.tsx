"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import {
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
  FaXTwitter,
  FaImage,
  FaCircleCheck,
  FaCircleXmark,
} from "react-icons/fa6";
import styles from "./post.module.css";

type PlatformKey = "Instagram" | "Facebook" | "X (Twitter)" | "WhatsApp";

interface PlatformInfo {
  key: PlatformKey;
  icon: React.ReactNode;
  color: string;
  type: "text" | "image";
  handle: string;
  connected: boolean;
}

interface PublishResult {
  platform: string;
  status: "pending" | "published" | "failed";
  platformPostId?: string;
  error?: string;
}

interface PostRecord {
  id: string;
  content: string;
  imageUrl?: string;
  platforms: string[];
  status: string;
  publishResults: PublishResult[];
  createdAt: string;
}

const PLATFORM_DEFS: Omit<PlatformInfo, "handle" | "connected">[] = [
  { key: "X (Twitter)", icon: <FaXTwitter />, color: "#000", type: "text" },
  { key: "WhatsApp", icon: <FaWhatsapp />, color: "#25D366", type: "text" },
  { key: "Instagram", icon: <FaInstagram />, color: "#E1306C", type: "image" },
  { key: "Facebook", icon: <FaFacebookF />, color: "#1877F2", type: "image" },
];

const CHAR_LIMITS: Record<PlatformKey, number> = {
  "X (Twitter)": 280,
  WhatsApp: 4096,
  Instagram: 2200,
  Facebook: 63206,
};

/* ── Platform preview renderers ── */
function TwitterPreview({ content, handle }: { content: string; handle: string }) {
  return (
    <div className={styles.previewCard}>
      <div className={styles.previewHeader}>
        <div className={styles.previewAvatar} style={{ background: "#000" }}>
          <FaXTwitter style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <div>
          <div className={styles.previewDisplayName}>{handle || "Your Account"}</div>
          <div className={styles.previewHandle}>{handle ? `@${handle.replace("@", "")}` : "@handle"}</div>
        </div>
      </div>
      <div className={styles.previewBody}>
        {content ? content.slice(0, 280) : "Your tweet will appear here..."}
      </div>
      {content.length > 280 && (
        <div className={styles.previewWarn}>Truncated to 280 characters</div>
      )}
      <div className={styles.previewFooter}>
        <span>💬 Reply</span><span>🔁 Repost</span><span>❤️ Like</span><span>📊 View</span>
      </div>
    </div>
  );
}

function WhatsAppPreview({ content, handle }: { content: string; handle: string }) {
  return (
    <div className={styles.previewCard} style={{ background: "#e5ddd5" }}>
      <div className={styles.previewHeader} style={{ background: "#075e54", color: "#fff", borderRadius: "12px 12px 0 0", margin: "-16px -16px 12px -16px", padding: "12px 16px" }}>
        <div className={styles.previewAvatar} style={{ background: "#25D366" }}>
          <FaWhatsapp style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Channel</div>
          <div style={{ fontSize: 11, color: "#b5d9d0" }}>{handle || "Your number"}</div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", maxWidth: "85%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 14, color: "#303030", lineHeight: 1.5 }}>
          {content || "Your WhatsApp message will appear here..."}
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#999", marginTop: 4 }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ content, handle, imageUrl }: { content: string; handle: string; imageUrl: string }) {
  return (
    <div className={styles.previewCard}>
      <div className={styles.previewHeader}>
        <div className={styles.previewAvatar} style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
          <FaInstagram style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{handle || "your_account"}</div>
      </div>
      <div className={styles.previewImageArea}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Preview" />
        ) : (
          <div className={styles.previewImagePlaceholder}>
            <FaImage style={{ fontSize: 32, color: "#d1d5db" }} />
            <span>Image required for Instagram</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 20, padding: "10px 0 6px" }}>
        <span>❤️</span><span>💬</span><span>✈️</span>
      </div>
      <div className={styles.previewBody} style={{ fontSize: 13 }}>
        <strong>{handle || "your_account"}</strong>{" "}
        {content ? content.slice(0, 2200) : "Your caption will appear here..."}
      </div>
    </div>
  );
}

function FacebookPreview({ content, handle, imageUrl }: { content: string; handle: string; imageUrl: string }) {
  return (
    <div className={styles.previewCard}>
      <div className={styles.previewHeader}>
        <div className={styles.previewAvatar} style={{ background: "#1877F2" }}>
          <FaFacebookF style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <div>
          <div className={styles.previewDisplayName}>{handle || "Your Page"}</div>
          <div className={styles.previewHandle}>Just now · 🌐</div>
        </div>
      </div>
      <div className={styles.previewBody}>
        {content || "Your Facebook post will appear here..."}
      </div>
      {imageUrl && (
        <div className={styles.previewImageArea}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Preview" />
        </div>
      )}
      <div className={styles.previewFooter} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
        <span>👍 Like</span><span>💬 Comment</span><span>↗️ Share</span>
      </div>
    </div>
  );
}

export default function PostPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;

  // Content state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(
    new Set()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform connections from backend
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  // Preview tab
  const [previewTab, setPreviewTab] = useState<PlatformKey>("X (Twitter)");

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(
    null
  );

  // Recent posts
  const [recentPosts, setRecentPosts] = useState<PostRecord[]>([]);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error" | "info", msg: string) => {
      setToast({ type, msg });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // Image file handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Image must be under 10 MB");
      return;
    }

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
  };

  const removeImage = () => {
    if (imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Load connected platforms
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/platforms/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load platforms");
        const data = await res.json();

        if (cancelled) return;

        const mapped: PlatformInfo[] = PLATFORM_DEFS.map((def) => {
          const conn = data.find(
            (c: { platform: string; connected: boolean; handle: string }) =>
              c.platform === def.key
          );
          return {
            ...def,
            handle: conn?.handle || "",
            connected: conn?.connected || false,
          };
        });
        setPlatforms(mapped);
      } catch {
        if (!cancelled) {
          setPlatforms(
            PLATFORM_DEFS.map((def) => ({
              ...def,
              handle: "",
              connected: false,
            }))
          );
        }
      } finally {
        if (!cancelled) setLoadingPlatforms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, getToken]);

  // Load recent posts
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/posts/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setRecentPosts(data.slice(0, 5));
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, getToken]);

  // Derived state
  const hasImagePlatforms = Array.from(selectedPlatforms).some(
    (p) => p === "Instagram" || p === "Facebook"
  );
  const needsImage = selectedPlatforms.has("Instagram");
  const lowestCharLimit = Math.min(
    ...Array.from(selectedPlatforms).map(
      (p) => CHAR_LIMITS[p] || 9999
    ),
    9999
  );
  const isOverLimit =
    selectedPlatforms.size > 0 && content.length > lowestCharLimit;
  const canPublish =
    content.trim().length > 0 &&
    selectedPlatforms.size > 0 &&
    (!needsImage || imageUrl.trim().length > 0) &&
    !isOverLimit;

  const togglePlatform = (key: PlatformKey) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Publish handler
  const handlePublish = async () => {
    if (!canPublish || !orgId) return;
    setPublishing(true);
    setPublishResults(null);

    try {
      const token = await getToken();

      // If we have a file, upload it first to get a URL
      let finalImageUrl = imageUrl;
      if (imageFile && imageUrl.startsWith("blob:")) {
        // For now, convert to base64 data URL as a fallback;
        // in production this would upload to CDN/S3
        finalImageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      // 1. Create the post
      const createRes = await fetch(`/api/posts/${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          imageUrl: finalImageUrl || undefined,
          platforms: Array.from(selectedPlatforms),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || "Failed to create post");
      }

      const post = await createRes.json();

      // 2. Publish it
      const publishRes = await fetch(`/api/posts/${orgId}/${post.id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await publishRes.json();
      setPublishResults(result.publishResults || []);

      if (result.status === "published") {
        showToast("success", "Published to all platforms!");
        setContent("");
        removeImage();
        setSelectedPlatforms(new Set());
      } else if (result.status === "partially_failed") {
        showToast(
          "info",
          "Published to some platforms. Check results below."
        );
      } else {
        showToast("error", "Publishing failed. Check results below.");
      }

      // Refresh recent posts
      const listRes = await fetch(`/api/posts/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setRecentPosts(data.slice(0, 5));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong";
      showToast("error", msg);
    } finally {
      setPublishing(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!content.trim() || !orgId || selectedPlatforms.size === 0) return;
    setSavingDraft(true);

    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          imageUrl: imageUrl.startsWith("blob:") ? undefined : imageUrl || undefined,
          platforms: Array.from(selectedPlatforms),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save draft");
      }

      showToast("success", "Draft saved!");
      setContent("");
      removeImage();
      setSelectedPlatforms(new Set());

      // Refresh recent posts
      const listRes = await fetch(`/api/posts/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setRecentPosts(data.slice(0, 5));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save draft";
      showToast("error", msg);
    } finally {
      setSavingDraft(false);
    }
  };

  const platformIcon = (name: string) => {
    const map: Record<string, React.ReactNode> = {
      Instagram: <FaInstagram style={{ color: "#E1306C" }} />,
      Facebook: <FaFacebookF style={{ color: "#1877F2" }} />,
      "X (Twitter)": <FaXTwitter style={{ color: "#000" }} />,
      WhatsApp: <FaWhatsapp style={{ color: "#25D366" }} />,
    };
    return map[name] || null;
  };

  const getHandle = (key: PlatformKey) =>
    platforms.find((p) => p.key === key)?.handle || "";

  if (!orgId) {
    return (
      <div className={styles.container}>
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 60 }}>
          Select an organization to start publishing.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Publisher</h1>
        <p className={styles.subtitle}>
          Create and publish content across your connected platforms
        </p>
      </div>

      <div className={styles.layout}>
        {/* ── Main Column ── */}
        <div className={styles.mainCol}>
          {/* Platform Selector — all 4 on one row */}
          <div className={styles.card}>
            <div className={styles.platformSectionTitle}>Select Platforms</div>

            {loadingPlatforms ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading platforms...</p>
            ) : (
              <div className={styles.platformRow}>
                {platforms.map((p) => (
                  <label
                    key={p.key}
                    className={`${styles.platformChip} ${
                      selectedPlatforms.has(p.key) ? styles.platformChipSelected : ""
                    } ${!p.connected ? styles.platformChipDisabled : ""}`}
                    style={
                      selectedPlatforms.has(p.key) ? { borderColor: p.color, background: `${p.color}08` } : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className={styles.platformCheckbox}
                      checked={selectedPlatforms.has(p.key)}
                      onChange={() => p.connected && togglePlatform(p.key)}
                      disabled={!p.connected}
                      aria-label={p.key}
                    />
                    <span className={styles.platformChipIcon} style={{ color: p.color }}>
                      {p.icon}
                    </span>
                    <div className={styles.platformChipInfo}>
                      <span className={styles.platformChipName}>{p.key}</span>
                      <span className={styles.platformChipHandle}>
                        {p.connected ? p.handle : "Not connected"}
                      </span>
                    </div>
                    <span
                      className={`${styles.platformBadge} ${
                        p.type === "text"
                          ? styles.badgeText
                          : p.key === "Instagram"
                            ? styles.badgeRequired
                            : styles.badgeImage
                      }`}
                    >
                      {p.type === "text"
                        ? "Text"
                        : p.key === "Instagram"
                          ? "Image req."
                          : "Image opt."}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Content Editor */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Content Editor</h2>

            <div className={styles.textareaWrap}>
              <textarea
                id="post-content"
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your devotional, message, or inspiration here..."
                rows={6}
              />
              <div
                className={`${styles.charCount} ${isOverLimit ? styles.charCountWarn : ""}`}
              >
                {content.length}
                {selectedPlatforms.size > 0 && ` / ${lowestCharLimit}`}{" "}
                characters
                {isOverLimit && " — over limit for selected platforms"}
              </div>
            </div>

            {/* Image Upload — shown when image platforms selected */}
            <div
              className={`${styles.imageSection} ${
                !hasImagePlatforms ? styles.imageSectionHidden : ""
              }`}
            >
              <label className={styles.label}>
                Attach Image{" "}
                {needsImage && <span style={{ color: "#dc2626" }}>* required for Instagram</span>}
              </label>

              {!imageUrl ? (
                <div
                  className={styles.dropZone}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dropZoneActive); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove(styles.dropZoneActive); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(styles.dropZoneActive);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      // Simulate a file input change
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      if (fileInputRef.current) {
                        fileInputRef.current.files = dt.files;
                        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                      }
                    }
                  }}
                >
                  <FaImage className={styles.dropZoneIcon} />
                  <span className={styles.dropZoneText}>
                    Click to upload or drag & drop
                  </span>
                  <span className={styles.dropZoneSub}>
                    PNG, JPG, WEBP up to 10 MB
                  </span>
                </div>
              ) : (
                <div className={styles.imagePreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Post preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    className={styles.imageRemoveBtn}
                    onClick={removeImage}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                  {imageFile && (
                    <div className={styles.imageFileName}>
                      {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />

              {needsImage && !imageUrl && (
                <p className={`${styles.imageNote} ${styles.imageNoteWarn}`}>
                  Instagram requires an image to publish
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              <button
                className={styles.publishBtn}
                onClick={handlePublish}
                disabled={!canPublish || publishing}
              >
                {publishing ? (
                  <>
                    <span className={styles.spinner} /> Publishing...
                  </>
                ) : (
                  <>✈️ Publish Now</>
                )}
              </button>
              <button
                className={styles.draftBtn}
                onClick={handleSaveDraft}
                disabled={
                  !content.trim() ||
                  selectedPlatforms.size === 0 ||
                  savingDraft
                }
              >
                {savingDraft ? "Saving..." : "💾 Save Draft"}
              </button>
            </div>

            {/* Publish results */}
            {publishResults && (
              <div className={styles.resultsPanel}>
                <h3 className={styles.cardTitle} style={{ marginTop: 16 }}>
                  Publish Results
                </h3>
                {publishResults.map((r) => (
                  <div key={r.platform} className={styles.resultItem}>
                    <span style={{ fontSize: 18 }}>
                      {platformIcon(r.platform)}
                    </span>
                    <span className={styles.resultPlatform}>{r.platform}</span>
                    <span className={styles.resultStatus}>
                      {r.status === "published" ? (
                        <><FaCircleCheck style={{ color: "#10b981" }} /> Published</>
                      ) : r.status === "failed" ? (
                        <><FaCircleXmark style={{ color: "#ef4444" }} /> Failed</>
                      ) : (
                        "Pending"
                      )}
                    </span>
                    {r.error && (
                      <span className={styles.resultError}>{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Previews — Tabbed */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Platform Previews</h2>
            <div className={styles.previewTabs}>
              {PLATFORM_DEFS.map((def) => (
                <button
                  key={def.key}
                  className={`${styles.previewTab} ${
                    previewTab === def.key ? styles.previewTabActive : ""
                  }`}
                  onClick={() => setPreviewTab(def.key)}
                  style={previewTab === def.key ? { borderColor: def.color, color: def.color } : undefined}
                >
                  <span style={{ fontSize: 16, color: def.color }}>{def.icon}</span>
                  {def.key === "X (Twitter)" ? "X" : def.key}
                </button>
              ))}
            </div>
            <div className={styles.previewPane}>
              {previewTab === "X (Twitter)" && (
                <TwitterPreview content={content} handle={getHandle("X (Twitter)")} />
              )}
              {previewTab === "WhatsApp" && (
                <WhatsAppPreview content={content} handle={getHandle("WhatsApp")} />
              )}
              {previewTab === "Instagram" && (
                <InstagramPreview content={content} handle={getHandle("Instagram")} imageUrl={imageUrl} />
              )}
              {previewTab === "Facebook" && (
                <FacebookPreview content={content} handle={getHandle("Facebook")} imageUrl={imageUrl} />
              )}
            </div>
          </div>
        </div>

        {/* ── Side Column ── */}
        <div className={styles.sideCol}>
          {/* Connected Platforms */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Connected Platforms</h3>
            {loadingPlatforms ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</p>
            ) : (
              <div className={styles.connectedGrid}>
                {platforms.map((p) => (
                  <div
                    key={p.key}
                    className={`${styles.connectedTile} ${
                      p.connected ? styles.connectedTileOn : styles.connectedTileOff
                    }`}
                  >
                    <span className={styles.connectedTileIcon} style={{ color: p.color }}>
                      {p.icon}
                    </span>
                    <span className={styles.connectedTileName}>{p.key}</span>
                    <span
                      className={`${styles.connectedTag} ${
                        p.connected ? styles.tagConnected : styles.tagDisconnected
                      }`}
                    >
                      {p.connected ? "✓ Ready" : "Setup"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publishing Tips — redesigned */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Publishing Tips</h3>
            <div className={styles.tipsGrid}>
              <div className={styles.tipCard}>
                <div className={styles.tipCardIcon} style={{ background: "#f3f4f6" }}>
                  <FaXTwitter style={{ color: "#000" }} />
                </div>
                <div className={styles.tipCardBody}>
                  <strong>X (Twitter)</strong>
                  <span>280 chars max. Keep it punchy.</span>
                </div>
              </div>
              <div className={styles.tipCard}>
                <div className={styles.tipCardIcon} style={{ background: "#ecfdf5" }}>
                  <FaWhatsapp style={{ color: "#25D366" }} />
                </div>
                <div className={styles.tipCardBody}>
                  <strong>WhatsApp</strong>
                  <span>Channel posts. Add emojis!</span>
                </div>
              </div>
              <div className={styles.tipCard}>
                <div className={styles.tipCardIcon} style={{ background: "#fef2f2" }}>
                  <FaInstagram style={{ color: "#E1306C" }} />
                </div>
                <div className={styles.tipCardBody}>
                  <strong>Instagram</strong>
                  <span>Image required. 1080×1080 ideal.</span>
                </div>
              </div>
              <div className={styles.tipCard}>
                <div className={styles.tipCardIcon} style={{ background: "#eff6ff" }}>
                  <FaFacebookF style={{ color: "#1877F2" }} />
                </div>
                <div className={styles.tipCardBody}>
                  <strong>Facebook</strong>
                  <span>Images boost engagement 2.3×.</span>
                </div>
              </div>
            </div>
            <div className={styles.tipHighlight}>
              💡 Post during peak hours (7–9 AM) for maximum reach
            </div>
          </div>

          {/* Recent Posts */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Recent Posts</h3>
            {recentPosts.length === 0 ? (
              <div className={styles.emptyState}>
                No posts yet. Create your first one!
              </div>
            ) : (
              <div className={styles.recentList}>
                {recentPosts.map((post) => (
                  <div key={post.id} className={styles.recentItem}>
                    <div className={styles.recentContent}>
                      {post.content}
                    </div>
                    <div className={styles.recentMeta}>
                      <span
                        className={`${styles.recentStatus} ${
                          post.status === "published"
                            ? styles.statusPublished
                            : post.status === "draft"
                              ? styles.statusDraft
                              : post.status === "failed"
                                ? styles.statusFailed
                                : styles.statusPartial
                        }`}
                      >
                        {post.status}
                      </span>
                      <span className={styles.recentDate}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <span className={styles.recentPlatforms}>
                        {post.platforms.map((pName) => (
                          <span key={pName}>{platformIcon(pName)}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
                ? styles.toastError
                : styles.toastInfo
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
