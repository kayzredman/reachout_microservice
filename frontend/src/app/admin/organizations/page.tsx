"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineSearch,
  HiOutlineChevronRight,
  HiOutlineArrowLeft,
} from "react-icons/hi";
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

  const totalMembers = orgs.reduce((s, o) => s + o.membersCount, 0);

  return (
    <div className={styles.dashboard}>
      <div className={styles.inner}>
      <Link href="/admin" className={styles.backLink}>
        <HiOutlineArrowLeft /> Back to Dashboard
      </Link>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <div className={styles.pageHeaderIcon}>
            <HiOutlineOfficeBuilding />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Organizations</h1>
            <p className={styles.pageSubtitle}>
              Manage all {orgs.length > 0 ? `${orgs.length} ` : ""}organization workspaces
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#f3f0ff", color: "#7c3aed" }}>
            <HiOutlineOfficeBuilding />
          </div>
          <div>
            <div className={styles.statValue}>{orgs.length}</div>
            <div className={styles.statLabel}>Organizations</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#dbeafe", color: "#2563eb" }}>
            <HiOutlineUsers />
          </div>
          <div>
            <div className={styles.statValue}>{totalMembers}</div>
            <div className={styles.statLabel}>Total Members</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <HiOutlineSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        {search && (
          <span className={styles.searchCount}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} style={{ width: "60%" }} />
                <div className={styles.skeletonLine} style={{ width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <HiOutlineOfficeBuilding className={styles.emptyIcon} />
          <p>No organizations found</p>
          {search && <span>Try a different search term</span>}
        </div>
      ) : (
        <div className={styles.orgGrid}>
          {filtered.map((org) => (
            <Link
              key={org.id}
              href={`/admin/organizations/${org.id}`}
              className={styles.orgCard}
            >
              <div className={styles.orgCardTop}>
                {org.imageUrl ? (
                  <Image
                    src={org.imageUrl}
                    alt={org.name}
                    width={44}
                    height={44}
                    className={styles.orgAvatar}
                  />
                ) : (
                  <div className={styles.orgAvatarPlaceholder}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <HiOutlineChevronRight className={styles.orgArrow} />
              </div>
              <div className={styles.orgCardBody}>
                <div className={styles.orgName}>{org.name}</div>
                {org.slug && (
                  <div className={styles.orgSlug}>/{org.slug}</div>
                )}
              </div>
              <div className={styles.orgCardFooter}>
                <span className={styles.orgFooterItem}>
                  <HiOutlineUsers style={{ fontSize: "0.85rem" }} />
                  {org.membersCount} member{org.membersCount !== 1 ? "s" : ""}
                </span>
                <span className={styles.orgFooterItem}>
                  {new Date(org.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
