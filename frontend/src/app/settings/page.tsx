"use client";

import { useState, useEffect, useCallback, type JSX } from "react";
import { useAuth, useUser, useClerk, useOrganization } from "@clerk/nextjs";
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

const PLAN = {
  name: "Pro Plan",
  price: 29,
  tagline: "For growing ministries",
  features: [
    "Unlimited posts across all platforms",
    "Advanced analytics and insights",
    "AI Growth Assistant",
    "Priority support",
  ],
  nextBilling: "April 22, 2026",
  card: "4242",
  history: [
    { date: "March 22, 2026", amount: 29 },
    { date: "February 22, 2026", amount: 29 },
    { date: "January 22, 2026", amount: 29 },
  ],
};

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  const [tab, setTab] = useState<Tab>("Profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  // Platform connections (from backend)
  const [connections, setConnections] = useState<Record<string, { connected: boolean; handle: string }>>({});
  const [platformLoading, setPlatformLoading] = useState<string | null>(null);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [whatsappDisplayPhone, setWhatsappDisplayPhone] = useState("");
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);

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
      const map: Record<string, { connected: boolean; handle: string }> = {};
      for (const conn of data) {
        map[conn.platform] = { connected: conn.connected, handle: conn.handle || "" };
      }
      setConnections(map);
    } catch {
      // silently fail
    }
  }, [organization, getToken]);

  useEffect(() => {
    if (tab === "Platforms" && organization) loadPlatformData();
  }, [tab, organization, loadPlatformData]);

  const handleConnectPlatform = async (name: string) => {
    if (!organization) return;
    setPlatformLoading(name);
    try {
      const token = await getToken();

      if (name === "WhatsApp") {
        if (!showWhatsappInput) {
          setShowWhatsappInput(true);
          setPlatformLoading(null);
          return;
        }
        if (!whatsappPhoneNumberId.trim() || !whatsappAccessToken.trim()) {
          showToast("error", "Phone Number ID and Access Token are required");
          setPlatformLoading(null);
          return;
        }
        const res = await fetch(`/api/platforms/${organization.id}/connect`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "WhatsApp",
            phoneNumberId: whatsappPhoneNumberId.trim(),
            accessToken: whatsappAccessToken.trim(),
            phoneNumber: whatsappDisplayPhone.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to connect WhatsApp");
        }
        showToast("success", "WhatsApp Business connected!");
        setShowWhatsappInput(false);
        setWhatsappPhoneNumberId("");
        setWhatsappAccessToken("");
        setWhatsappDisplayPhone("");
        await loadPlatformData();
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
      if (!res.ok) throw new Error("Failed to start OAuth flow");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
    } catch {
      showToast("error", `Failed to connect ${name}`);
    }
    setPlatformLoading(null);
  };

  const handleDisconnectPlatform = async (name: string) => {
    if (!organization) return;
    setPlatformLoading(name);
    try {
      const token = await getToken();
      const res = await fetch(`/api/platforms/${organization.id}/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      showToast("success", `${name} disconnected`);
      await loadPlatformData();
    } catch {
      showToast("error", `Failed to disconnect ${name}`);
    }
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
                  <button className={styles.changePhotoBtn}>Change Photo</button>
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
              <div className={styles.passwordGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Password</label>
                  <input className={styles.formInput} type="password" placeholder="••••••••" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>New Password</label>
                  <input className={styles.formInput} type="password" placeholder="••••••••" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirm New Password</label>
                  <input className={styles.formInput} type="password" placeholder="••••••••" />
                </div>
              </div>
              <button className={styles.btnOutline}>Update Password</button>
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
                    <p>Permanently delete your account and all data</p>
                  </div>
                  <button className={styles.btnDelete}>Delete Account</button>
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
                        : p.name === "WhatsApp" && showWhatsappInput
                          ? "Enter your WhatsApp Business API credentials"
                          : "Not connected"}
                    </div>
                    {/* WhatsApp Business API input */}
                    {p.name === "WhatsApp" && showWhatsappInput && !conn?.connected && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxWidth: 420 }}>
                        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
                          Get these from <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noreferrer" style={{ color: "#25D366" }}>Meta Business Suite → WhatsApp Manager</a>
                        </p>
                        <input
                          type="text"
                          placeholder="Phone Number ID (e.g. 123456789012345)"
                          value={whatsappPhoneNumberId}
                          onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                          style={{
                            padding: "8px 12px", borderRadius: 8,
                            border: "1.5px solid #e2e8f0", fontSize: "0.88rem",
                            width: "100%",
                          }}
                        />
                        <input
                          type="password"
                          placeholder="Permanent Access Token"
                          value={whatsappAccessToken}
                          onChange={(e) => setWhatsappAccessToken(e.target.value)}
                          style={{
                            padding: "8px 12px", borderRadius: 8,
                            border: "1.5px solid #e2e8f0", fontSize: "0.88rem",
                            width: "100%",
                          }}
                        />
                        <input
                          type="tel"
                          placeholder="Display phone (optional, e.g. +1 234 567 8900)"
                          value={whatsappDisplayPhone}
                          onChange={(e) => setWhatsappDisplayPhone(e.target.value)}
                          style={{
                            padding: "8px 12px", borderRadius: 8,
                            border: "1.5px solid #e2e8f0", fontSize: "0.88rem",
                            width: "100%",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className={styles.btnConnect}
                            disabled={isLoading}
                            onClick={() => handleConnectPlatform("WhatsApp")}
                          >
                            {isLoading ? "Verifying..." : "Verify & Connect"}
                          </button>
                          <button
                            className={styles.btnDisconnect}
                            onClick={() => { setShowWhatsappInput(false); setWhatsappPhoneNumberId(""); setWhatsappAccessToken(""); setWhatsappDisplayPhone(""); }}
                          >
                            Cancel
                          </button>
                        </div>
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
                          <button
                            className={styles.btnDisconnect}
                            disabled={isLoading}
                            onClick={() => handleDisconnectPlatform(p.name)}
                          >
                            {isLoading ? "..." : "Disconnect"}
                          </button>
                        )}
                      </>
                    ) : (
                      !(p.name === "WhatsApp" && showWhatsappInput) && isAdmin && (
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
                    onChange={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
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
                  onChange={() => setNotifPrefs((p) => ({ ...p, push: !p.push }))}
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
                  onChange={() => setNotifPrefs((p) => ({ ...p, weeklyReport: !p.weeklyReport }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Billing Tab ───────────────────────────────── */}
        {tab === "Billing" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Current Plan</h3>

            <div className={styles.planCard}>
              <div className={styles.planInfo}>
                <h3>{PLAN.name}</h3>
                <p>{PLAN.tagline}</p>
                <ul className={styles.planFeatures}>
                  {PLAN.features.map((f) => (
                    <li key={f}><span className={styles.permGreen}>✓</span> {f}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.planPriceBlock}>
                <div className={styles.planPrice}>${PLAN.price}</div>
                <div className={styles.planPeriod}>/month</div>
                <button className={styles.btnChangePlan}>Change Plan</button>
              </div>
            </div>

            <div className={styles.billingMeta}>
              <div className={styles.billingMetaRow}>
                <span className={styles.billingMetaLabel}>Next billing date</span>
                <span className={styles.billingMetaValue}>{PLAN.nextBilling}</span>
              </div>
              <div className={styles.billingMetaRow}>
                <span className={styles.billingMetaLabel}>Payment method</span>
                <span className={styles.billingMetaValue}>•••• •••• •••• {PLAN.card}</span>
              </div>
            </div>

            <div className={styles.historyTitle}>Billing History</div>
            <div className={styles.historyTable}>
              {PLAN.history.map((h, i) => (
                <div key={i} className={styles.historyRow}>
                  <span className={styles.historyDate}>{h.date}</span>
                  <span className={styles.historyAmount}>
                    ${h.amount.toFixed(2)}
                    <span className={styles.historyBadge}>Paid</span>
                  </span>
                  <button className={styles.btnDownload}>Download</button>
                </div>
              ))}
            </div>
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
