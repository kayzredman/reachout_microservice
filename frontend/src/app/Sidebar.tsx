"use client";
import Link from "next/link";
import { useUser, useOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import Image from "next/image";
import { useState } from "react";
import {
  HiOutlineViewGrid,
  HiOutlineUser,
  HiOutlinePaperAirplane,
  HiOutlineCollection,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineChatAlt2,
  HiOutlineShieldCheck,
  HiOutlineOfficeBuilding,
  HiOutlineViewGridAdd,
} from "react-icons/hi";
import NotificationBell from "./components/NotificationBell";
import s from "./sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/", icon: <HiOutlineViewGrid /> },
  { label: "Profile", href: "/profile", icon: <HiOutlineUser /> },
  { label: "Publisher", href: "/post", icon: <HiOutlinePaperAirplane style={{ transform: "rotate(45deg)" }} /> },
  { label: "Content", href: "/content", icon: <HiOutlineCollection /> },
  { label: "Scheduler", href: "/scheduler", icon: <HiOutlineClock /> },
  { label: "Analytics", href: "/analytics", icon: <HiOutlineChartBar /> },
  { label: "Planner", href: "/planner", icon: <HiOutlineClipboardList /> },
  { label: "Support", href: "/support", icon: <HiOutlineChatAlt2 /> },
  { label: "Settings", href: "/settings", icon: <HiOutlineCog /> },
];

const adminItems = [
  { label: "Admin Dashboard", href: "/admin", icon: <HiOutlineViewGridAdd /> },
  { label: "Organizations", href: "/admin/organizations", icon: <HiOutlineOfficeBuilding /> },
  { label: "Support Admin", href: "/admin/support", icon: <HiOutlineShieldCheck /> },
];

const orgSwitcherDark = {
  elements: {
    rootBox: { width: "100%" },
    organizationSwitcherTrigger: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1.5px solid #2e2e48",
      background: "#23233a",
      color: "#d0d0e0",
      justifyContent: "space-between",
    },
  },
};

function Logo() {
  return (
    <span className={s.logo}>
      <span className={s.logoFaith}>Faith</span>
      <span className={s.logoReach}>Reach</span>
    </span>
  );
}

export default function Sidebar() {
  const { isSignedIn, user } = useUser();
  const { membership } = useOrganization();
  const [open, setOpen] = useState(false);

  const orgRole = membership?.role;
  const roleLabel = orgRole === "org:admin" ? "Admin" : orgRole === "org:member" ? "Member" : "Content Creator";
  const isSystemAdmin = (user?.publicMetadata as Record<string, unknown>)?.systemAdmin === true;

  if (typeof window !== "undefined") {
    document.body.style.overflow = open ? "hidden" : "";
  }

  let currentPath = "";
  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
  }

  const renderLinks = (items: typeof navItems, onClickExtra?: () => void) =>
    items.map((item) => (
      <Link
        key={item.label}
        href={item.href}
        className={`${s.link} ${currentPath === item.href ? s.linkActive : ""}`}
        onClick={onClickExtra}
      >
        <span className={s.icon}>{item.icon}</span>
        {item.label}
      </Link>
    ));

  return (
    <>
      {/* Mobile top bar */}
      <div className={s.mobileBar}>
        <button className={s.hamburger} aria-label="Open menu" onClick={() => setOpen(true)}>
          &#9776;
        </button>
        <span className={s.mobileLogo}>
          <span className={s.mobileLogoFaith}>Faith</span>
          <span className={s.mobileLogoReach}>Reach</span>
        </span>
      </div>

      {/* Mobile drawer */}
      <div className={`${s.drawer} ${open ? s.drawerOpen : ""}`}>
        <div className={s.drawerContent}>
          <div className={s.drawerHeader}>
            <Logo />
            <button className={s.closeBtn} aria-label="Close menu" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>
          {isSignedIn && (
            <div className={s.orgSwitcher}>
              <OrganizationSwitcher
                appearance={orgSwitcherDark}
                afterCreateOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
              />
            </div>
          )}
          <nav className={s.nav} style={{ flex: 1 }}>
            {renderLinks(navItems, () => setOpen(false))}
            {isSystemAdmin && renderLinks(adminItems, () => setOpen(false))}
          </nav>
          <div style={{ padding: "0 16px" }}>
            <NotificationBell />
          </div>
          {isSignedIn && user && (
            <div className={s.user} style={{ marginTop: "auto", borderTop: "1px solid #2e2e48", paddingTop: 18 }}>
              <Image src={user.imageUrl} alt="User avatar" className={s.avatar} width={40} height={40} style={{ borderRadius: "50%" }} />
              <div>
                <div className={s.username}>{user.fullName || user.username}</div>
                <div className={s.role}>{roleLabel}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={s.sidebar}>
        <Logo />
        {isSignedIn && (
          <div className={s.orgSwitcher}>
            <OrganizationSwitcher
              appearance={orgSwitcherDark}
              afterCreateOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
            />
          </div>
        )}
        <nav className={s.nav}>
          {renderLinks(navItems)}
          {isSystemAdmin && renderLinks(adminItems)}
        </nav>
        <div style={{ padding: "0 16px" }}>
          <NotificationBell />
        </div>
        {isSignedIn && user && (
          <div className={s.user}>
            <Image src={user.imageUrl} alt="User avatar" className={s.avatar} width={40} height={40} style={{ borderRadius: "50%" }} />
            <div>
              <div className={s.username}>{user.fullName || user.username}</div>
              <div className={s.role}>{roleLabel}</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
