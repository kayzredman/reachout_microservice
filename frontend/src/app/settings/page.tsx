"use client";

import { useState, useEffect, useCallback, Suspense, type JSX } from "react";
import { useAuth, useUser, useClerk, useOrganization } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { FaInstagram, FaFacebookF, FaXTwitter, FaYoutube, FaWhatsapp } from "react-icons/fa6";
import styles from "./settings.module.css";

type BackendUser = {
  name: string;
  email: string;
  imageUrl?: string;
  role?: string;
  organization?: string;
  bio?: string;
  location?: string;
};

type Tab = "Profile" | "Team" | "Platforms" | "Notifications" | "Billing";

const TAB_ICONS: Record<Tab, JSX.Element> = {
  Profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Platforms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Billing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

const PLATFORMS = [
  { name: "Instagram", icon: <FaInstagram />, color: "#E1306C", bg: "#fde8ef" },
  { name: "Facebook", icon: <FaFacebookF />, color: "#1877F2", bg: "#e8f0fe" },
  { name: "X (Twitter)", icon: <FaXTwitter />, color: "#181b20", bg: "#f3f4f6" },
  { name: "YouTube", icon: <FaYoutube />, color: "#FF0000", bg: "#fee2e2" },
  { name: "WhatsApp", icon: <FaWhatsapp />, color: "#25D366", bg: "#e8faf0" },
];

const PLAN_TIERS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: 0,
    tagline: "For getting started",
    color: "#6b7280",
    features: [
      "Up to 3 content series",
      "30 posts per month",
      "Template-based content planner",
      "All platform connections",
    ],
    limits: "3 series · 30 posts/mo",
  },
  {
    id: "creator" as const,
    name: "Creator",
    price: 9.99,
    tagline: "For growing ministries",
    color: "#7c3aed",
    popular: true,
    features: [
      "Up to 20 content series",
      "Unlimited posts per month",
      "AI content generation (20/mo)",
      "AI rewrite & hashtags",
      "All template features",
    ],
    limits: "20 series · Unlimited posts · 20 AI/mo",
  },
  {
    id: "ministry_pro" as const,
    name: "Ministry Pro",
    price: 29.99,
    tagline: "For established organizations",
    color: "#059669",
    features: [
      "Unlimited content series",
      "Unlimited posts per month",
      "Unlimited AI generation",
      "Team collaboration access",
      "Priority support",
      "Advanced analytics",
    ],
    limits: "Unlimited everything",
  },
];

type SubscriptionTier = "starter" | "creator" | "ministry_pro";

function SettingsContent() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>("Profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Billing state
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("starter");
  const [billingLoading, setBillingLoading] = useState(false);
  const [tierSwitching, setTierSwitching] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<{ id: string; tier: string; amount: number; currency: string; status: string; paymentMethod: string | null; createdAt: string }[]>([]);

  // Profile form state
  const [profile, setProfile] = useState({
    name: "", email: "", role: "", organization: "", bio: "", location: "",
  });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [editMode, setEditMode] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  // Notification prefs (local state)
  const [notifPrefs, setNotifPrefs] = useState({
    scheduled: true, engagement: true, followers: true, tips: true,
    push: false, weeklyReport: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Platform connections (from backend)
  const [connections, setConnections] = useState<Record<string, { connected: boolean; handle: string; channelId?: string; tokenExpiresAt?: string; connectedAt?: string; updatedAt?: string }>>({});
  const [platformLoading, setPlatformLoading] = useState<string | null>(null);
  const [whatsappQr, setWhatsappQr] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [showWhatsappQr, setShowWhatsappQr] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Team / Org state
  const { organization, membership } = useOrganization();
  const isAdmin = membership?.role === "org:admin";
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org:admin" | "org:member">("org:member");
  const [inviting, setInviting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const loadTeamData = useCallback(async () => {
    if (!organization) return;
    try {
      const [mRes, iRes] = await Promise.all([
        organization.getMemberships({ pageSize: 100 }),
        organization.getInvitations({ status: ["pending"], pageSize: 100 }),
      ]);
      setTeamMembers(mRes.data ?? []);
      setPendingInvites(iRes.data ?? []);
    } catch {
      // silently fail on poll
    }
  }, [organization]);

  // Load team data on mount + auto-refresh every 5s while Team tab is active
  useEffect(() => {
    if (tab !== "Team" || !organization) return;
    loadTeamData();
    const id = setInterval(loadTeamData, 5000);
    return () => clearInterval(id);
  }, [tab, organization, loadTeamData]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data: BackendUser = await res.json();
      const p = {
        name: data.name || "",
        email: data.email || "",
        role: data.role || "",
        organization: data.organization || "",
        bio: data.bio || "",
        location: data.location || "",
      };
      setProfile(p);
      setSavedProfile(p);
      setImageUrl(data.imageUrl || clerkUser?.imageUrl || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [getToken, clerkUser?.imageUrl]);

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchProfile();
  }, [isLoaded, isSignedIn, fetchProfile]);

  // Handle ?tab=billing query param
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "billing") setTab("Billing");
  }, [searchParams]);

  // Load billing data when Billing tab active
  useEffect(() => {
    if (tab !== "Billing" || !organization) return;
    setBillingLoading(true);
    Promise.all([
      fetch(`/api/billing/${organization.id}`)
        .then((r) => (r.ok ? r.json() : { tier: "starter" }))
        .then((d) => setCurrentTier(d.tier || "starter"))
        .catch(() => setCurrentTier("starter")),
      fetch(`/api/payment/history/${organization.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setPaymentHistory(Array.isArray(d) ? d : []))
        .catch(() => setPaymentHistory([])),
    ]).finally(() => setBillingLoading(false));
  }, [tab, organization]);

  // Load notification prefs when Notifications tab active
  const loadNotifPrefs = useCallback(async () => {
    if (!organization) return;
    setNotifLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/notifications/${organization.id}/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs({
          scheduled: data.scheduled ?? true,
          engagement: data.engagement ?? true,
          followers: data.followers ?? true,
          tips: data.tips ?? true,
          push: data.push ?? false,
          weeklyReport: data.weeklyReport ?? true,
        });
      }
    } catch {
      // keep defaults
    } finally {
      setNotifLoading(false);
    }
  }, [organization, getToken]);

  useEffect(() => {
    if (tab === "Notifications" && organization) loadNotifPrefs();
  }, [tab, organization, loadNotifPrefs]);

  const saveNotifPref = async (key: string, value: boolean) => {
    setNotifPrefs((p) => ({ ...p, [key]: value }));
    if (!organization) return;
    try {
      const token = await getToken();
      await fetch(`/api/notifications/${organization.id}/preferences`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // revert on failure
      setNotifPrefs((p) => ({ ...p, [key]: !value }));
      showToast("error", "Failed to save notification preference");
    }
  };

  const handleChangeTier = async (newTier: SubscriptionTier) => {
    if (!organization || newTier === currentTier) return;
    setTierSwitching(newTier);

    const plan = PLAN_TIERS.find((t) => t.id === newTier);

    // Downgrade to free tier — no payment needed
    if (newTier === "starter") {
      try {
        const res = await fetch(`/api/billing/${organization.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: newTier }),
        });
        if (!res.ok) throw new Error("Failed to update plan");
        setCurrentTier(newTier);
        showToast("success", `Switched to ${plan?.name || newTier} plan!`);
      } catch {
        showToast("error", "Failed to change plan");
      } finally {
        setTierSwitching(null);
      }
      return;
    }

    // Paid tier — redirect to payment checkout page
    try {
      const email = clerkUser?.primaryEmailAddress?.emailAddress || "";
      const name = clerkUser?.fullName || organization.name || "";
      const params = new URLSearchParams({
        orgId: organization.id,
        tier: newTier,
        email,
        name,
      });
      window.location.href = `/payment/checkout?${params.toString()}`;
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to start payment");
      setTierSwitching(null);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const res = await fetch("/api/user/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          bio: profile.bio,
          location: profile.location,
          organization: profile.organization,
          role: profile.role,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data: BackendUser = await res.json();
      const p = {
        name: data.name || "",
        email: data.email || "",
        role: data.role || "",
        organization: data.organization || "",
        bio: data.bio || "",
        location: data.location || "",
      };
      setProfile(p);
      setSavedProfile(p);
      setEditMode(false);
      showToast("success", "Profile updated successfully");
    } catch {
      showToast("error", "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setProfile(savedProfile);
    setEditMode(false);
  };

  // ── Platform connection logic ──────────────────────────
  const loadPlatformData = useCallback(async () => {
    if (!organization) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/platforms/${organization.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, { connected: boolean; handle: string; channelId?: string; tokenExpiresAt?: string; connectedAt?: string; updatedAt?: string }> = {};
      for (const conn of data) {
        map[conn.platform] = {
          connected: conn.connected,
          handle: conn.handle || "",
          channelId: conn.channelId,
          tokenExpiresAt: conn.tokenExpiresAt,
          connectedAt: conn.createdAt,
          updatedAt: conn.updatedAt,
        };
      }
      setConnections(map);
    } catch {
      // silently fail
    }
  }, [organization, getToken]);

  useEffect(() => {
    if (tab === "Platforms" && organization) loadPlatformData();
  }, [tab, organization, loadPlatformData]);

  // ── WhatsApp QR session poller ──────────────────────
  useEffect(() => {
    if (tab !== "Platforms" || !organization || !showWhatsappQr) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/platforms/${organization.id}/whatsapp/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setWhatsappStatus(data.status === "connected" ? "connected" : data.qr ? "connecting" : "disconnected");
        if (data.qr) setWhatsappQr(data.qr);
        if (data.phone) setWhatsappPhone(data.phone);
        if (data.status === "connected") {
          setShowWhatsappQr(false);
          await loadPlatformData();
          showToast("success", "WhatsApp connected!");
        }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab, organization, showWhatsappQr, getToken, loadPlatformData]);

  const handleConnectPlatform = async (name: string) => {
    if (!organization) return;
    setPlatformLoading(name);
    try {
      const token = await getToken();

      if (name === "WhatsApp") {
        // Start QR pairing session
        setShowWhatsappQr(true);
        setWhatsappStatus("connecting");
        try {
          const res = await fetch(`/api/platforms/${organization.id}/whatsapp/qr`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed to start WhatsApp session");
          const data = await res.json();
          if (data.qr) setWhatsappQr(data.qr);
          if (data.status === "connected") {
            setWhatsappStatus("connected");
            setShowWhatsappQr(false);
            await loadPlatformData();
            showToast("success", "WhatsApp connected!");
          }
        } catch {
          showToast("error", "Failed to start WhatsApp pairing");
          setShowWhatsappQr(false);
          setWhatsappStatus("disconnected");
        }
        setPlatformLoading(null);
        return;
      }

      // OAuth platforms: get the auth URL and redirect
      const res = await fetch(`/api/platforms/${organization.id}/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Failed to start OAuth for ${name}`);
      }
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : `Failed to connect ${name}`);
    }
    setPlatformLoading(null);
  };

  const handleDisconnectPlatform = async (name: string) => {
    if (!organization) return;
    // Require confirmation first
    if (disconnectConfirm !== name) {
      setDisconnectConfirm(name);
      return;
    }
    setDisconnectConfirm(null);
    setPlatformLoading(name);
    try {
      const token = await getToken();
      const res = await fetch(`/api/platforms/${organization.id}/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to disconnect");
      }
      showToast("success", `${name} disconnected`);
      await loadPlatformData();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : `Failed to disconnect ${name}`);
    }
    setPlatformLoading(name === platformLoading ? null : platformLoading);
    setPlatformLoading(null);
  };

  // ── Loading & error states ─────────────────────────────
  if (!isLoaded || loading) {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.settingsContainer}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.settingsContainer}>
          <div className={styles.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsContainer}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1>Settings</h1>
          <p>Manage your account, connections, and preferences</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(["Profile", "Team", "Platforms", "Notifications", "Billing"] as Tab[])
            .filter((t) => isAdmin || t === "Profile" || t === "Notifications")
            .map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
            >
              {TAB_ICONS[t]}
              {t}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ───────────────────────────────── */}
        {tab === "Profile" && (
          <>
            {/* Profile Information Card */}
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <h3 className={styles.cardTitle}>Profile Information</h3>
                {!editMode && (
                  <button className={styles.btnEdit} onClick={() => setEditMode(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              <div className={styles.avatarRow}>
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {profile.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className={styles.avatarActions}>
                  <label className={styles.changePhotoBtn} style={{ cursor: avatarUploading ? "wait" : "pointer" }}>
                    {avatarUploading ? "Uploading..." : "Change Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      style={{ display: "none" }}
                      disabled={avatarUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !clerkUser) return;
                        if (file.size > 2 * 1024 * 1024) {
                          showToast("error", "Image must be under 2MB");
                          return;
                        }
                        try {
                          setAvatarUploading(true);
                          await clerkUser.setProfileImage({ file });
                          setImageUrl(clerkUser.imageUrl);
                          showToast("success", "Profile photo updated!");
                        } catch {
                          showToast("error", "Failed to upload photo");
                        } finally {
                          setAvatarUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <span className={styles.avatarHint}>JPG, PNG or GIF. Max size 2MB</span>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  {editMode ? (
                    <input
                      className={styles.formInput}
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    />
                  ) : (
                    <div className={styles.formValue}>{profile.name || "—"}</div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email</label>
                  <div className={styles.formValue}>{profile.email || "—"}</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Role</label>
                  <div className={styles.formValue}>{isAdmin ? "Admin" : membership?.role === "org:member" ? "Member" : profile.role || "—"}</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Organization</label>
                  <div className={styles.formValue}>{organization?.name || profile.organization || "—"}</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location</label>
                  {editMode ? (
                    <input
                      className={styles.formInput}
                      value={profile.location}
                      onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    />
                  ) : (
                    <div className={styles.formValue}>{profile.location || "—"}</div>
                  )}
                </div>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>Bio</label>
                  {editMode ? (
                    <textarea
                      className={styles.formTextarea}
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about your ministry..."
                    />
                  ) : (
                    <div className={styles.formValue}>{profile.bio || "No bio yet"}</div>
                  )}
                </div>
              </div>

              {editMode && (
                <div className={styles.formActions}>
                  <button className={styles.btnCancel} onClick={handleCancelProfile}>Cancel</button>
                  <button className={styles.btnSave} onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            {/* Security Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Security</h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 16 }}>
                Your password and authentication are managed securely through Clerk.
              </p>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email</label>
                  <div className={styles.formValue}>{clerkUser?.primaryEmailAddress?.emailAddress || "—"}</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Authentication</label>
                  <div className={styles.formValue}>
                    {clerkUser?.passwordEnabled ? "Password + Social" : "Social login only"}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Two-Factor Auth</label>
                  <div className={styles.formValue}>
                    {clerkUser?.twoFactorEnabled
                      ? <span style={{ color: "#16a34a" }}>✓ Enabled</span>
                      : <span style={{ color: "#94a3b8" }}>Not enabled</span>}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Last Sign In</label>
                  <div className={styles.formValue}>
                    {clerkUser?.lastSignInAt
                      ? new Date(clerkUser.lastSignInAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </div>
                </div>
              </div>
              <button
                className={styles.btnOutline}
                onClick={() => clerkUser?.createExternalAccount && window.open("https://accounts.clerk.dev/user", "_blank")}
                style={{ marginTop: 8 }}
              >
                Manage Security Settings
              </button>
            </div>

            {/* Danger Zone */}
            <div className={styles.dangerCard}>
              <h3 className={styles.dangerTitle}>Danger Zone</h3>
              <div className={styles.dangerItem}>
                <div className={styles.dangerItemInfo}>
                  <h4>Log Out</h4>
                  <p>Sign out of your FaithReach account</p>
                </div>
                <button className={styles.btnLogout} onClick={() => signOut({ redirectUrl: "/" })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log Out
                </button>
              </div>
              {isAdmin && (
                <div className={styles.dangerItem}>
                  <div className={styles.dangerItemInfo}>
                    <h4>Delete Account</h4>
                    <p>Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  {!showDeleteConfirm ? (
                    <button className={styles.btnDelete} onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <p style={{ fontSize: "0.8rem", color: "#ef4444", margin: 0 }}>
                        Type <strong>DELETE</strong> to confirm
                      </p>
                      <input
                        className={styles.formInput}
                        placeholder="Type DELETE"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        style={{ width: 160, fontSize: "0.85rem" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className={styles.btnDisconnect} onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}>Cancel</button>
                        <button
                          className={styles.btnDelete}
                          disabled={deleteConfirmText !== "DELETE" || deleting}
                          onClick={async () => {
                            if (deleteConfirmText !== "DELETE" || !clerkUser) return;
                            setDeleting(true);
                            try {
                              await clerkUser.delete();
                              window.location.href = "/";
                            } catch {
                              showToast("error", "Failed to delete account");
                              setDeleting(false);
                            }
                          }}
                        >
                          {deleting ? "Deleting..." : "Confirm Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Team Tab ──────────────────────────────────── */}
        {tab === "Team" && (
          <>
            {/* Org info card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Team &amp; Organization</h3>
              <p className={styles.teamDesc}>
                Manage your workspace members, invite collaborators, and assign roles.
              </p>

              {!organization ? (
                <div className={styles.teamEmpty}>
                  <div className={styles.teamEmptyIcon}>👥</div>
                  <h4>No organization yet</h4>
                  <p>Create or join an organization using the switcher in the sidebar to manage your team here.</p>
                </div>
              ) : (
                <>
                  {/* Org header */}
                  <div className={styles.orgHeader}>
                    {organization.imageUrl ? (
                      <img src={organization.imageUrl} alt={organization.name} className={styles.orgAvatar} />
                    ) : (
                      <div className={styles.orgAvatarFallback}>
                        {organization.name?.[0]?.toUpperCase() || "O"}
                      </div>
                    )}
                    <div>
                      <div className={styles.orgName}>{organization.name}</div>
                      <div className={styles.orgSlug}>{organization.slug ? `@${organization.slug}` : ""}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Members card */}
            {organization && (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h3 className={styles.cardTitle}>Members</h3>
                  <span className={styles.memberCount}>
                    {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Invite form — admin only */}
                {isAdmin && (
                  <div className={styles.inviteRow}>
                    <input
                      className={styles.formInput}
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className={styles.roleSelect}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "org:admin" | "org:member")}
                    >
                      <option value="org:member">Member</option>
                      <option value="org:admin">Admin</option>
                    </select>
                    <button
                      className={styles.btnSave}
                      disabled={inviting || !inviteEmail}
                      onClick={async () => {
                        try {
                          setInviting(true);
                          await organization.inviteMember({ emailAddress: inviteEmail, role: inviteRole });
                          setInviteEmail("");
                          await loadTeamData();
                          showToast("success", "Invitation sent!");
                        } catch {
                          showToast("error", "Failed to send invitation");
                        } finally {
                          setInviting(false);
                        }
                      }}
                    >
                      {inviting ? "Sending..." : "Invite"}
                    </button>
                  </div>
                )}

                {/* Pending invitations */}
                {pendingInvites.length > 0 && (
                  <div className={styles.pendingSection}>
                    <div className={styles.pendingSectionTitle}>Pending Invitations</div>
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className={styles.memberRow}>
                        <div className={styles.memberAvatarFallback}>✉</div>
                        <div className={styles.memberInfo}>
                          <div className={styles.memberName}>{inv.emailAddress}</div>
                          <div className={styles.memberRole}>Invited · {inv.role?.replace("org:", "")}</div>
                        </div>
                        {isAdmin && (
                          <button
                            className={styles.btnDisconnect}
                            onClick={async () => {
                              try {
                                await inv.revoke();
                                await loadTeamData();
                                showToast("success", "Invitation revoked");
                              } catch {
                                showToast("error", "Failed to revoke");
                              }
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Member list */}
                <div className={styles.memberList}>
                  {teamMembers.map((m) => (
                    <div key={m.id} className={styles.memberRow}>
                      {m.publicUserData?.imageUrl ? (
                        <img src={m.publicUserData.imageUrl} alt="" className={styles.memberAvatar} />
                      ) : (
                        <div className={styles.memberAvatarFallback}>
                          {m.publicUserData?.firstName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className={styles.memberInfo}>
                        <div className={styles.memberName}>
                          {m.publicUserData?.firstName} {m.publicUserData?.lastName}
                        </div>
                        <div className={styles.memberRole}>
                          {m.publicUserData?.identifier}
                        </div>
                      </div>
                      {isAdmin ? (
                        <div className={styles.memberActions}>
                          <select
                            className={styles.roleSelect}
                            value={m.role}
                            onChange={async (e) => {
                              try {
                                await m.update({ role: e.target.value });
                                await loadTeamData();
                                showToast("success", "Role updated");
                              } catch {
                                showToast("error", "Failed to update role");
                              }
                            }}
                          >
                            <option value="org:admin">Admin</option>
                            <option value="org:member">Member</option>
                          </select>
                          <button
                            className={styles.btnRemoveMember}
                            title="Remove member"
                            onClick={async () => {
                              try {
                                await m.destroy();
                                await loadTeamData();
                                showToast("success", "Member removed");
                              } catch {
                                showToast("error", "Cannot remove this member");
                              }
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className={styles.memberRole} style={{ marginLeft: "auto" }}>
                          {m.role?.replace("org:", "")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Platforms Tab ──────────────────────────────── */}
        {tab === "Platforms" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Connected Platforms</h3>

            {PLATFORMS.map((p) => {
              const conn = connections[p.name];
              const isLoading = platformLoading === p.name;
              return (
                <div key={p.name} className={styles.platformItem}>
                  <div
                    className={styles.platformIcon}
                    style={{ background: p.bg, color: p.color }}
                  >
                    {p.icon}
                  </div>
                  <div className={styles.platformInfo}>
                    <div className={styles.platformName}>{p.name}</div>
                    <div className={styles.platformHandle}>
                      {conn?.connected
                        ? `Connected as ${conn.handle}`
                        : p.name === "WhatsApp" && showWhatsappQr
                          ? "Scan the QR code with your WhatsApp to connect"
                          : "Not connected"}
                    </div>
                    {/* Connected since */}
                    {conn?.connected && conn.connectedAt && (
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                        Connected since {new Date(conn.connectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                    {/* WhatsApp phone number */}
                    {p.name === "WhatsApp" && conn?.connected && whatsappPhone && (
                      <div style={{ fontSize: "0.75rem", color: "#25D366", marginTop: 2 }}>
                        📱 {whatsappPhone}
                      </div>
                    )}
                    {/* Token status & reconnect */}
                    {conn?.connected && conn.tokenExpiresAt && p.name !== "WhatsApp" && (() => {
                      const expiryDate = new Date(conn.tokenExpiresAt!);
                      const now = new Date();
                      const expired = expiryDate < now;
                      const diffMs = Math.abs(expiryDate.getTime() - now.getTime());
                      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const expiringSoon = !expired && expiryDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                      const relativeLabel = expired
                        ? diffDays > 0 ? `Expired ${diffDays}d ago` : `Expired ${diffHrs}h ago`
                        : diffDays > 0 ? `Expires in ${diffDays}d` : `Expires in ${diffHrs}h`;
                      return (
                        <div style={{ fontSize: "0.75rem", color: expired ? "#ef4444" : expiringSoon ? "#f59e0b" : "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span>
                            {relativeLabel}
                            {expired && " ⚠️"}
                            {expiringSoon && " ⚠️"}
                          </span>
                          {(expired || expiringSoon) && isAdmin && (
                            <button
                              style={{ fontSize: "0.75rem", color: "#7c3aed", background: "none", border: "1px solid #7c3aed", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}
                              onClick={() => handleConnectPlatform(p.name)}
                              disabled={platformLoading === p.name}
                            >
                              {platformLoading === p.name ? "..." : "Reconnect"}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {/* WhatsApp QR code pairing */}
                    {p.name === "WhatsApp" && showWhatsappQr && !conn?.connected && (
                      <div style={{ marginTop: 12, textAlign: "center", maxWidth: 300 }}>
                        {whatsappQr ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={whatsappQr}
                              alt="WhatsApp QR Code"
                              style={{ width: 256, height: 256, borderRadius: 12, border: "2px solid #e2e8f0" }}
                            />
                            <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 8 }}>
                              Open WhatsApp → Settings → Linked Devices → Link a Device
                            </p>
                          </>
                        ) : (
                          <div style={{ padding: 40, color: "#94a3b8", fontSize: "0.85rem" }}>
                            Generating QR code...
                          </div>
                        )}
                        <button
                          className={styles.btnDisconnect}
                          style={{ marginTop: 8 }}
                          onClick={() => { setShowWhatsappQr(false); setWhatsappQr(""); setWhatsappStatus("disconnected"); }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.platformStatus}>
                    {conn?.connected ? (
                      <>
                        <span className={`${styles.statusBadge} ${styles.statusConnected}`}>
                          ✓ Connected
                        </span>
                        {isAdmin && (
                          disconnectConfirm === p.name ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>Disconnect?</span>
                              <button
                                className={styles.btnDisconnect}
                                style={{ background: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
                                disabled={isLoading}
                                onClick={() => handleDisconnectPlatform(p.name)}
                              >
                                {isLoading ? "..." : "Yes"}
                              </button>
                              <button
                                className={styles.btnDisconnect}
                                onClick={() => setDisconnectConfirm(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className={styles.btnDisconnect}
                              disabled={isLoading}
                              onClick={() => handleDisconnectPlatform(p.name)}
                            >
                              {isLoading ? "..." : "Disconnect"}
                            </button>
                          )
                        )}
                      </>
                    ) : (
                      !(p.name === "WhatsApp" && showWhatsappQr) && isAdmin && (
                        <button
                          className={styles.btnConnect}
                          disabled={isLoading}
                          onClick={() => handleConnectPlatform(p.name)}
                        >
                          {isLoading ? "Connecting..." : "Connect"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}

            <div className={styles.permissionsBox}>
              <div className={styles.permissionsTitle}>OAuth Permissions</div>
              <ul className={styles.permissionsList}>
                <li><span className={styles.permGreen}>✓</span> Publish posts on your behalf</li>
                <li><span className={styles.permGreen}>✓</span> Read engagement metrics and analytics</li>
                <li><span className={styles.permGreen}>✓</span> Manage scheduled posts</li>
                <li><span className={styles.permRed}>✗</span> We never access your private messages</li>
                <li><span className={styles.permRed}>✗</span> We never modify your account settings</li>
              </ul>
            </div>

          </div>
        )}

        {/* ── Notifications Tab ─────────────────────────── */}
        {tab === "Notifications" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Notification Preferences</h3>

            {notifLoading ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Loading preferences…</p>
            ) : (
              <>
                <div className={styles.notifSection}>
                  <div className={styles.notifSectionTitle}>Email Notifications</div>
                  <div className={styles.notifSectionDesc}>
                    Receive email updates about your posts and engagement
                  </div>
                  {[
                    { key: "scheduled" as const, label: "When a scheduled post is published" },
                    { key: "engagement" as const, label: "When you reach engagement milestones" },
                    { key: "followers" as const, label: "When you gain new followers" },
                    { key: "tips" as const, label: "Growth tips and best practices" },
                  ].map(({ key, label }) => (
                    <div key={key} className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>{label}</span>
                      <input
                        type="checkbox"
                        className={styles.toggle}
                        checked={notifPrefs[key]}
                        onChange={() => saveNotifPref(key, !notifPrefs[key])}
                      />
                    </div>
                  ))}
                </div>

                <div className={styles.notifSection}>
                  <div className={styles.notifSectionTitle}>Push Notifications</div>
                  <div className={styles.notifSectionDesc}>
                    Get notified about important updates and milestones
                  </div>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>Enable push notifications</span>
                    <input
                      type="checkbox"
                      className={styles.toggle}
                      checked={notifPrefs.push}
                      onChange={() => saveNotifPref("push", !notifPrefs.push)}
                    />
                  </div>
                </div>

                <div className={styles.notifSection}>
                  <div className={styles.notifSectionTitle}>Weekly Report</div>
                  <div className={styles.notifSectionDesc}>
                    Receive a weekly summary of your analytics and growth
                  </div>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>Enable weekly report</span>
                    <input
                      type="checkbox"
                      className={styles.toggle}
                      checked={notifPrefs.weeklyReport}
                      onChange={() => saveNotifPref("weeklyReport", !notifPrefs.weeklyReport)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Billing Tab ───────────────────────────────── */}
        {tab === "Billing" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Subscription Plan</h3>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: 20 }}>
              Choose the plan that&apos;s right for your ministry. Changes take effect immediately.
            </p>

            {billingLoading ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Loading billing info…</p>
            ) : (
              <div className={styles.tierGrid}>
                {PLAN_TIERS.map((plan) => {
                  const isCurrent = plan.id === currentTier;
                  const isSwitching = tierSwitching === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`${styles.tierCard} ${isCurrent ? styles.tierCardActive : ""}`}
                      style={{ borderColor: isCurrent ? plan.color : undefined }}
                    >
                      {plan.popular && (
                        <div className={styles.tierPopular} style={{ background: plan.color }}>
                          Most Popular
                        </div>
                      )}
                      <h4 className={styles.tierName} style={{ color: plan.color }}>{plan.name}</h4>
                      <div className={styles.tierPrice}>
                        <span className={styles.tierPriceAmount}>
                          {plan.price === 0 ? "Free" : `$${plan.price}`}
                        </span>
                        {plan.price > 0 && <span className={styles.tierPricePeriod}>/month</span>}
                      </div>
                      <p className={styles.tierTagline}>{plan.tagline}</p>
                      <ul className={styles.tierFeatures}>
                        {plan.features.map((f) => (
                          <li key={f}><span className={styles.permGreen}>✓</span> {f}</li>
                        ))}
                      </ul>
                      <div className={styles.tierLimits}>{plan.limits}</div>
                      {isCurrent ? (
                        <div className={styles.tierCurrentBadge} style={{ borderColor: plan.color, color: plan.color }}>
                          Current Plan
                        </div>
                      ) : (
                        <button
                          className={styles.tierSelectBtn}
                          style={{ background: plan.color }}
                          disabled={!!tierSwitching}
                          onClick={() => handleChangeTier(plan.id)}
                        >
                          {isSwitching ? "Switching…" : plan.price > (PLAN_TIERS.find((t) => t.id === currentTier)?.price || 0) ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.billingMeta} style={{ marginTop: 24 }}>
              <div className={styles.billingMetaRow}>
                <span className={styles.billingMetaLabel}>Current plan</span>
                <span className={styles.billingMetaValue} style={{ textTransform: "capitalize" }}>
                  {currentTier.replace("_", " ")}
                </span>
              </div>
              <div className={styles.billingMetaRow}>
                <span className={styles.billingMetaLabel}>Payment</span>
                <span className={styles.billingMetaValue}>
                  {currentTier === "starter" ? "No payment required" : "Powered by Flutterwave"}
                </span>
              </div>
            </div>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 12, color: "#374151" }}>Payment History</h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Date</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Plan</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Amount</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Method</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "8px 12px", textTransform: "capitalize", color: "#374151" }}>
                            {p.tier.replace("_", " ")}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>
                            {p.currency} {Number(p.amount).toFixed(2)}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#6b7280", textTransform: "capitalize" }}>
                            {p.paymentMethod?.replace("_", " ") || "Card"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 9999,
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              background: p.status === "successful" ? "#d1fae5" : p.status === "failed" ? "#fee2e2" : "#fef3c7",
                              color: p.status === "successful" ? "#065f46" : p.status === "failed" ? "#991b1b" : "#92400e",
                            }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
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

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
