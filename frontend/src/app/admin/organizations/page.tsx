"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./admin-orgs.module.css";

interface Org {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  membersCount: number;
  createdAt: number;
}

export default function AdminOrganizationsPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const isSystemAdmin =
    (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isLoaded && !isSystemAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSystemAdmin, router]);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/organizations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrgs(data.organizations || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSystemAdmin) fetchOrgs();
  }, [isSystemAdmin, fetchOrgs]);

  if (!isLoaded || !isSystemAdmin)
    return <div className={styles.empty}>Checking access...</div>;

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.slug && o.slug.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Organizations</h1>
        <p>View and manage all organization workspaces.</p>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{orgs.length}</div>
          <div className={styles.statLabel}>Total Orgs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {orgs.reduce((s, o) => s + o.membersCount, 0)}
          </div>
          <div className={styles.statLabel}>Total Members</div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading organizations...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No organizations found.</div>
      ) : (
        <div className={styles.orgGrid}>
          {filtered.map((org) => (
            <Link
              key={org.id}
              href={`/admin/organizations/${org.id}`}
              className={styles.orgCard}
            >
              <div className={styles.orgCardHeader}>
                {org.imageUrl ? (
                  <Image
                    src={org.imageUrl}
                    alt={org.name}
                    width={48}
                    height={48}
                    className={styles.orgAvatar}
                  />
                ) : (
                  <div className={styles.orgAvatarPlaceholder}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className={styles.orgName}>{org.name}</div>
                  {org.slug && (
                    <div className={styles.orgSlug}>/{org.slug}</div>
                  )}
                </div>
              </div>
              <div className={styles.orgMeta}>
                <span>{org.membersCount} member{org.membersCount !== 1 ? "s" : ""}</span>
                <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
