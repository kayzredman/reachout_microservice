"use client";

import { useState } from "react";

const optimalTimes = [
  { day: "Monday", time: "7:30 AM" },
  { day: "Wednesday", time: "8:00 AM" },
  { day: "Friday", time: "7:45 AM" },
  { day: "Sunday", time: "9:00 AM" },
];

const posts = [
  {
    date: "March 23, 2026",
    time: "9:00 AM",
    content: "Sunday Reflection: In the midst of life's storms, anchor yourself in God's unchanging promises....",
    platforms: ["instagram", "facebook", "x"],
  },
];

function Calendar() {
  // Dummy calendar for March 2026
  const today = 23;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", marginBottom: 18 }}>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Content Calendar</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <button style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>{"<"}</button>
          <span style={{ fontWeight: 600, fontSize: 16 }}>March 2026</span>
          <button style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>{">"}</button>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
          <thead>
            <tr style={{ color: "#888", fontWeight: 500, fontSize: 15 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <th key={d} style={{ padding: 4 }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ["", "", "", "", "", 1, 2],
              [3, 4, 5, 6, 7, 8, 9],
              [10, 11, 12, 13, 14, 15, 16],
              [17, 18, 19, 20, 21, 22, 23],
              [24, 25, 26, 27, 28, 29, 30],
              [31, "", "", "", "", "", ""]
            ].map((week, i) => (
              <tr key={i}>
                {week.map((d, j) => (
                  <td key={j} style={{ padding: 0, textAlign: "center" }}>
                    {d ? (
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: d === today ? "#111827" : "transparent",
                        color: d === today ? "#fff" : "#222",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: 15,
                        margin: "0 auto"
                      }}>{d}</div>
                    ) : <div style={{ width: 32, height: 32 }} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ background: "#f6f3fd", color: "#7c3aed", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 15, marginTop: 8, width: "100%", textAlign: "left" }}>
          <span style={{ color: "#a78bfa", fontWeight: 700 }}>💡 Smart Scheduling Tip:</span> <span style={{ color: "#7c3aed", fontWeight: 500 }}>Posts scheduled between 7-9 AM typically get 40% more engagement</span>
        </div>
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const [view, setView] = useState("calendar");
  return (
    <div style={{ padding: "40px 0", background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: 8, color: "#181b20" }}>Scheduler</h1>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: "1.2rem" }}>
        Manage and schedule your content across platforms
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => setView("calendar")}
          style={{
            background: view === "calendar" ? "#111827" : "#fff",
            color: view === "calendar" ? "#fff" : "#222",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 24px",
            fontWeight: 600,
            fontSize: "1.08rem",
            cursor: "pointer",
            boxShadow: view === "calendar" ? "0 2px 8px 0 rgba(44, 62, 80, 0.10)" : undefined,
            outline: "none",
            transition: "background 0.15s"
          }}
        >
          <span style={{ marginRight: 8 }}>📅</span> Calendar View
        </button>
        <button
          onClick={() => setView("list")}
          style={{
            background: view === "list" ? "#111827" : "#fff",
            color: view === "list" ? "#fff" : "#222",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 24px",
            fontWeight: 600,
            fontSize: "1.08rem",
            cursor: "pointer",
            boxShadow: view === "list" ? "0 2px 8px 0 rgba(44, 62, 80, 0.10)" : undefined,
            outline: "none",
            transition: "background 0.15s"
          }}
        >
          <span style={{ marginRight: 8 }}>⏰</span> List View
        </button>
      </div>
      <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1200, marginBottom: 32 }}>
        <div style={{ flex: 2 }}>
          {view === "calendar" ? <Calendar /> : <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>List View Coming Soon...</div>}
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>{posts[0].date}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ color: "#888" }}>🕒</span>
            <span style={{ fontWeight: 600 }}>{posts[0].time}</span>
            <span style={{ marginLeft: "auto", color: "#888", cursor: "pointer" }}>✏️</span>
            <span style={{ color: "#ef4444", cursor: "pointer" }}>🗑️</span>
          </div>
          <div style={{ color: "#222", fontSize: 15, marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{posts[0].content}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {posts[0].platforms.map((p, i) => (
              <span key={i} style={{ background: "#f3f4f6", color: "#222", borderRadius: 8, padding: "2px 10px", fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 1200, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
        <div style={{ color: "#888", fontWeight: 600, fontSize: 15, marginBottom: 18 }}>
          <span style={{ marginRight: 8 }}>🕒</span> Optimal Posting Times This Week
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {optimalTimes.map((t, i) => (
            <div key={i} style={{ flex: 1, background: "#e7faee", borderRadius: 10, padding: 24, textAlign: "center", fontWeight: 700, fontSize: 20, color: "#059669" }}>
              <div style={{ color: "#888", fontWeight: 500, fontSize: 15, marginBottom: 6 }}>{t.day}</div>
              {t.time}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
