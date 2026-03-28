"use client";
import Link from "next/link";
import { useUser, useOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import Image from "next/image";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: "\u{1F4C8}" },
  { label: "Profile", href: "/profile", icon: "\u{1F464}" },
  { label: "Publisher", href: "/post", icon: "\u{2708}" },
  { label: "Scheduler", href: "/scheduler", icon: "\u{1F4C5}" },
  { label: "Analytics", href: "/analytics", icon: "\u{1F4CA}" },
  { label: "Planner", href: "/planner", icon: "\u{1F4C4}" },
  { label: "Settings", href: "/settings", icon: "\u2699" },
];

export default function Sidebar() {
  const { isSignedIn, user } = useUser();
  const { membership } = useOrganization();
  const [open, setOpen] = useState(false);

  const orgRole = membership?.role;
  const roleLabel = orgRole === "org:admin" ? "Admin" : orgRole === "org:member" ? "Member" : "Content Creator";

  // Responsive: show sidebar on desktop, hamburger on mobile
  // Prevent background scroll when drawer is open
  if (typeof window !== "undefined") {
    document.body.style.overflow = open ? "hidden" : "";
  }

  // Get current path for active link
  let currentPath = "";
  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
  }

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="sidebar-mobile-bar">
        <button
          className="sidebar-hamburger"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <span className="sidebar-hamburger-icon">&#9776;</span>
        </button>
        <span className="sidebar-mobile-logo">FaithReach</span>
      </div>
      {/* Sidebar Drawer (mobile) */}
      <div className={`sidebar-drawer${open ? " sidebar-drawer-open" : ""}`}> 
        <div className="sidebar-drawer-content">
          <div className="sidebar-drawer-header">
            <span className="sidebar-logo">FaithReach</span>
            <button
              className="sidebar-close"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
          </div>
          {isSignedIn && (
            <div className="sidebar-org-switcher">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: { width: "100%" },
                    organizationSwitcherTrigger: {
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #e2e8f0",
                      background: "#f8f9fb",
                      justifyContent: "space-between",
                    },
                  },
                }}
                afterCreateOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
              />
            </div>
          )}
          <nav className="sidebar-nav" style={{ flex: 1 }}>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-link${currentPath === item.href ? " sidebar-link-active" : ""}`}
                onClick={() => setOpen(false)}
                style={currentPath === item.href ? { background: "#f6f0ff", color: "#7c3aed" } : {}}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          {isSignedIn && user && (
            <div className="sidebar-user" style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: 18 }}>
              <Image
                src={user.imageUrl}
                alt="User avatar"
                className="sidebar-avatar"
                width={40}
                height={40}
                style={{ borderRadius: '50%' }}
              />
              <div>
                <div className="sidebar-username">{user.fullName || user.username}</div>
                <div className="sidebar-role">{roleLabel}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="sidebar-logo">FaithReach</div>
        {isSignedIn && (
          <div className="sidebar-org-switcher">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: { width: "100%" },
                  organizationSwitcherTrigger: {
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    background: "#f8f9fb",
                    justifyContent: "space-between",
                  },
                },
              }}
              afterCreateOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
            />
          </div>
        )}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="sidebar-link">
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        {isSignedIn && user && (
          <div className="sidebar-user">
            <Image
              src={user.imageUrl}
              alt="User avatar"
              className="sidebar-avatar"
              width={40}
              height={40}
              style={{ borderRadius: '50%' }}
            />
            <div>
              <div className="sidebar-username">{user.fullName || user.username}</div>
              <div className="sidebar-role">{roleLabel}</div>
            </div>
          </div>
        )}
      </aside>
      <style jsx global>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 240px;
          background: #fff;
          border-right: 1px solid #eee;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          z-index: 100;
          padding: 32px 0 16px 0;
        }
        .sidebar-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #7c3aed;
          padding: 0 32px 16px 32px;
        }
        .sidebar-org-switcher {
          padding: 0 16px 16px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0 16px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: #222;
          text-decoration: none;
          font-weight: 500;
          font-size: 1.08rem;
          transition: background 0.15s;
        }
        .sidebar-link:hover, .sidebar-link.active {
          background: #f5f0ff;
          color: #7c3aed;
        }
        .sidebar-icon {
          font-size: 1.2em;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px 0 24px;
        }
        .sidebar-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #eee;
        }
        .sidebar-username {
          font-weight: 600;
          font-size: 1rem;
        }
        .sidebar-role {
          font-size: 0.92rem;
          color: #888;
        }
        /* Mobile styles */
        .sidebar-mobile-bar {
          display: none;
        }
        .sidebar-drawer {
          display: none;
        }
        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }
          .sidebar-mobile-bar {
            display: flex;
            align-items: center;
            height: 56px;
            background: #fff;
            border-bottom: 1px solid #eee;
            padding: 0 16px;
            position: sticky;
            top: 0;
            z-index: 200;
          }
          .sidebar-mobile-logo {
            font-size: 1.3rem;
            font-weight: 700;
            color: #7c3aed;
            margin-left: 12px;
          }
          .sidebar-hamburger {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #7c3aed;
          }
          .sidebar-drawer {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.12);
            z-index: 300;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
          }
          .sidebar-drawer-open {
            pointer-events: auto;
            opacity: 1;
          }
          .sidebar-drawer-content {
            background: #fff;
            box-shadow: 0 8px 32px 0 rgba(44, 62, 80, 0.18);
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding-bottom: 24px;
          }
          .sidebar-drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
            padding: 24px 24px 0 24px;
          }
                  .sidebar-link-active {
                    background: #f6f0ff !important;
                    color: #7c3aed !important;
                  }
          .sidebar-close {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #7c3aed;
          }
          .sidebar-drawer .sidebar-nav {
            margin-top: 24px;
            padding: 0 24px;
          }
          .sidebar-drawer .sidebar-user {
            margin-top: 32px;
            padding: 0 24px;
          }
        }
      `}</style>
    </>
  );
}
