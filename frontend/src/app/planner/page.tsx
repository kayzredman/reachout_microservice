"use client";

import { useState } from "react";

const seriesData = [
  {
    title: "30-Day Prayer Journey",
    theme: "Prayer & Spiritual Growth",
    total: 30,
    published: 1,
    progress: 3,
    status: "Active",
    color: "#10b981",
    date: "Mar 1 - Mar 30, 2026",
  },
  {
    title: "Walking by Faith",
    theme: "Faith & Trust",
    total: 12,
    published: 1,
    progress: 8,
    status: "Active",
    color: "#10b981",
    date: "Mar 15 - Apr 15, 2026",
  },
  {
    title: "Easter Devotionals",
    theme: "Resurrection & Hope",
    total: 7,
    published: 0,
    progress: 0,
    status: "Upcoming",
    color: "#2563eb",
    date: "Apr 5 - Apr 12, 2026",
  },
  {
    title: "Psalms Deep Dive",
    theme: "Scripture Study",
    total: 31,
    published: 0,
    progress: 0,
    status: "Completed",
    color: "#6b7280",
    date: "Jan 1 - Jan 31, 2026",
  },
];

const templates = [
  { title: "30-Day Challenge", desc: "Daily Devotionals" },
  { title: "Weekly Sermon Series", desc: "Sunday Messages" },
  { title: "Prayer Journey", desc: "Spiritual Growth" },
  { title: "Bible Study Series", desc: "Scripture Deep Dive" },
];

export default function PlannerPage() {
  const [tab, setTab] = useState("Active");
  const tabOptions = [
    { label: "Active", count: 2 },
    { label: "Upcoming", count: 1 },
    { label: "Completed", count: 1 },
  ];

  return (
    <div style={{ padding: "40px 0", background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: 8, color: "#181b20" }}>Content Planner</h1>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: "1.2rem" }}>
        Organize and manage your devotional series and content themes
      </p>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 1100, marginBottom: 32 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: "#181b20" }}>2</div>
          <div style={{ color: "#888", fontSize: 15 }}>Currently running</div>
          <div style={{ color: "#6b7280", fontSize: 15, marginTop: 8 }}>Active Series</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: "#181b20" }}>80</div>
          <div style={{ color: "#888", fontSize: 15 }}>Across all series</div>
          <div style={{ color: "#6b7280", fontSize: 15, marginTop: 8 }}>Total Posts Planned</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: "#181b20" }}>1</div>
          <div style={{ color: "#888", fontSize: 15 }}>Successfully finished</div>
          <div style={{ color: "#6b7280", fontSize: 15, marginTop: 8 }}>Completed Series</div>
        </div>
        <button style={{ height: 48, alignSelf: "flex-start", background: "linear-gradient(90deg, #7c3aed, #2de1fc)", color: "#fff", border: "none", borderRadius: 12, padding: "0 28px", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", marginLeft: 16 }}>+ New Series</button>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabOptions.map(opt => (
          <button
            key={opt.label}
            onClick={() => setTab(opt.label)}
            style={{
              padding: "10px 24px",
              borderRadius: 16,
              border: "none",
              background: tab === opt.label ? "#fff" : "#f3f4f6",
              color: tab === opt.label ? "#222" : "#888",
              fontWeight: 600,
              fontSize: "1.08rem",
              cursor: "pointer",
              boxShadow: tab === opt.label ? "0 2px 8px 0 rgba(44, 62, 80, 0.10)" : undefined,
              outline: "none",
              transition: "background 0.15s"
            }}
          >
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>
      {/* Series Cards */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 1100, marginBottom: 32, flexWrap: "wrap" }}>
        {seriesData.filter(s => s.status === tab).map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 320, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", marginBottom: 18, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{s.title}</div>
                <div style={{ color: "#888", fontSize: 15 }}>{s.theme}</div>
              </div>
              <span style={{ background: s.status === "Active" ? "#10b981" : s.status === "Upcoming" ? "#2563eb" : "#6b7280", color: "#fff", borderRadius: 8, padding: "4px 16px", fontWeight: 600, fontSize: 15 }}>{s.status}</span>
            </div>
            <div style={{ display: "flex", gap: 32, margin: "18px 0 8px 0" }}>
              <div>
                <div style={{ color: "#888", fontSize: 14 }}>Total Posts</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{s.total}</div>
              </div>
              <div>
                <div style={{ color: "#888", fontSize: 14 }}>Published</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{s.published}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#888", fontSize: 14 }}>Progress</div>
                <div style={{ width: "100%", height: 8, background: "#f3f4f6", borderRadius: 4, marginTop: 4 }}>
                  <div style={{ width: `${s.progress}%`, height: 8, background: s.color, borderRadius: 4 }} />
                </div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>{s.progress}%</div>
              </div>
            </div>
            <div style={{ color: "#888", fontSize: 15, margin: "10px 0 18px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>📅</span> {s.date}
            </div>
            <button style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 0", fontWeight: 600, fontSize: "1rem", color: "#222", cursor: "pointer", width: "100%", marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>📄</span> Manage Posts
            </button>
          </div>
        ))}
      </div>
      {/* Templates */}
      <div style={{ width: "100%", maxWidth: 1100, background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", marginBottom: 40 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: "#181b20" }}>Popular Content Templates</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {templates.map((t, i) => (
            <div key={i} style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px 0 rgba(44, 62, 80, 0.08)", display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: "#181b20" }}>{t.title}</div>
              <div style={{ color: "#888", fontSize: 14, marginBottom: 18 }}>{t.desc}</div>
              <button style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: "1rem", color: "#222", cursor: "pointer", width: "100%" }}>Use Template</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
