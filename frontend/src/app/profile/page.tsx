"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import styles from "./profile.module.css";

type BackendUser = {
  name: string;
  email: string;
  imageUrl?: string;
  role?: string;
  organization?: string;
  bio?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EditFields = {
  name: string;
  bio: string;
  location: string;
  organization: string;
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { organization, membership } = useOrganization();
  const orgRole = membership?.role === "org:admin" ? "Admin" : membership?.role === "org:member" ? "Member" : null;
  const orgName = organization?.name || null;
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({ name: "", bio: "", location: "", organization: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchBackendUser = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) throw new Error("Could not get auth token. Please sign in again.");
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user info");
      const data = await res.json();
      setBackendUser(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !authLoaded || !isSignedIn || !clerkUser) return;
    fetchBackendUser();
  }, [isLoaded, authLoaded, isSignedIn, clerkUser, fetchBackendUser]);

  const handleEdit = () => {
    if (!backendUser) return;
    setEditFields({
      name: backendUser.name || "",
      bio: backendUser.bio || "",
      location: backendUser.location || "",
      organization: backendUser.organization || "",
    });
    setEditMode(true);
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/user/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editFields),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const updated = await res.json();
      setBackendUser(updated);
      setEditMode(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isLoaded || loading) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !clerkUser) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>You are not signed in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Profile</h1>
          <p>Manage your account details</p>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.cardTop}>
            <div className={styles.avatarWrapper}>
              {clerkUser.imageUrl ? (
                <Image
                  src={clerkUser.imageUrl}
                  alt="Profile"
                  width={96}
                  height={96}
                  unoptimized
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {(backendUser?.name || clerkUser.fullName || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.nameRow}>
              <div className={styles.nameBlock}>
                <h2>{clerkUser.fullName || backendUser?.name || "—"}</h2>
                <p>{clerkUser.emailAddresses?.[0]?.emailAddress || backendUser?.email}</p>
                {(orgRole || backendUser?.role) && (
                  <span className={styles.roleBadge}>{orgRole || backendUser?.role}</span>
                )}
              </div>
              {!editMode && (
                <button className={styles.editBtn} onClick={handleEdit}>
                  Edit Profile
                </button>
              )}
            </div>

            {editMode ? (
              <>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Name</label>
                    <input
                      className={styles.inputField}
                      value={editFields.name}
                      onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                    />
                  </div>
                  <div className={styles.infoItem}>
                    <label>Location</label>
                    <input
                      className={styles.inputField}
                      value={editFields.location}
                      onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className={styles.infoItem}>
                    <label>Organization</label>
                    <div className={styles.inputField} style={{ background: "#f5f5f5", color: "#666", cursor: "default" }}>
                      {orgName || editFields.organization || "—"}
                    </div>
                  </div>
                </div>
                <div className={styles.bioSection}>
                  <label>Bio</label>
                  <textarea
                    className={styles.textareaField}
                    value={editFields.bio}
                    onChange={(e) => setEditFields({ ...editFields, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className={styles.editActions}>
                  <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  {saveError && <span className={styles.errorText}>{saveError}</span>}
                </div>
              </>
            ) : (
              <>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Name</label>
                    <span>{backendUser?.name || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email</label>
                    <span>{clerkUser.emailAddresses?.[0]?.emailAddress || backendUser?.email}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Location</label>
                    <span>{backendUser?.location || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Organization</label>
                    <span>{orgName || backendUser?.organization || "—"}</span>
                  </div>
                </div>
                <div className={styles.bioSection}>
                  <label>Bio</label>
                  <p>{backendUser?.bio || "No bio added yet."}</p>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    Joined <strong>{formatDate(backendUser?.createdAt)}</strong>
                  </span>
                  <span className={styles.metaItem}>
                    Updated <strong>{formatDate(backendUser?.updatedAt)}</strong>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
