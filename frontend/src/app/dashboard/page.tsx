"use client";


import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import Image from "next/image";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { isSignedIn } = useUser();
  // Redirect to sign-in if not signed in
  useEffect(() => {
    if (!isSignedIn && typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  }, [isSignedIn]);
  if (!isSignedIn) {
    return null;
  }
  return (
    <div style={{ padding: 32, background: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: 8, color: "#181b20" }}>Dashboard</h1>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: "1.2rem" }}>
        Welcome back! Here&apos;s your content overview.
      </p>
      <div className={styles.dashboardRow} style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <MetricCard title="Total Followers" value="26,710" change="+8.3% from last week" />
        <MetricCard title="Engagement" value="12,450" sub="5.7% engagement rate" />
        <MetricCard title="Total Reach" value="48,920" change="+12.4% from last week" />
        <MetricCard title="Posts This Week" value="7" sub="Across all platforms" />
      </div>
      <div className={styles.dashboardCard} style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 16, color: "#181b20" }}>Growth Trends</h2>
        <GrowthTrendsChart />
      </div>
      <div className={styles.dashboardRow} style={{ display: "flex", gap: 24 }}>
        <div className={styles.dashboardCard} style={{ flex: 1 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, color: "#181b20" }}>Upcoming Posts</h3>
          <div style={{ marginBottom: 16 }}>
            <b>Sunday Reflection:</b> In the midst of life&apos;s storms, anchor yourself in God&apos;s unchanging promises. He is your rock and refuge. <span role="img" aria-label="rock">🪨</span><span role="img" aria-label="church">⛪️</span> #SundayThoughts...
            <div style={{ color: "#6b7280", fontSize: 12 }}>Mar 23, 9:00 AM · <span style={{ background: "#e0f7fa", color: "#007b8a", borderRadius: 8, padding: "2px 8px", marginRight: 4 }}>instagram</span> <span style={{ background: "#e0f7fa", color: "#007b8a", borderRadius: 8, padding: "2px 8px" }}>facebook</span></div>
          </div>
          <div>
            <b>Mid-week encouragement:</b> You are stronger than you think because God is stronger than anything you face. Keep pushing forward! <span role="img" aria-label="muscle">💪</span><span role="img" aria-label="pray">🙏</span>...
            <div style={{ color: "#6b7280", fontSize: 12 }}>Mar 26, 12:00 PM · <span style={{ background: "#e0f7fa", color: "#007b8a", borderRadius: 8, padding: "2px 8px", marginRight: 4 }}>instagram</span> <span style={{ background: "#e0f7fa", color: "#007b8a", borderRadius: 8, padding: "2px 8px" }}>facebook</span></div>
          </div>
        </div>
        <div className={styles.dashboardCard} style={{ flex: 1 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, color: "#181b20" }}>Active Content Series</h3>
          <div style={{ marginBottom: 16 }}>
            <b>30-Day Prayer Journey</b>
            <div style={{ color: "#6b7280", fontSize: 12 }}>Prayer &amp; Spiritual Growth · 30 posts · Mar 1 - Mar 30</div>
          </div>
          <div>
            <b>Walking by Faith</b>
            <div style={{ color: "#6b7280", fontSize: 12 }}>Faith &amp; Trust · 12 posts · Mar 15 - Apr 15</div>
          </div>
        </div>
      </div>
      <div className={styles.dashboardActions} style={{ marginTop: 32, display: "flex", gap: 20, width: "100%" }}>
        <button style={{
          background: "linear-gradient(90deg, #a259f7, #2de1fc)",
          color: "#fff",
          border: "none",
          borderRadius: 28,
          padding: "12px 0",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
          boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          justifyContent: "center",
          transition: "box-shadow 0.2s, transform 0.2s",
          outline: "none"
        }}>
          <span style={{ fontSize: 18, marginRight: 8, display: "flex", alignItems: "center" }}>✈️</span>
          Create New Post
        </button>
        <a href="/analytics" style={{
          background: "#fff",
          color: "#7c3aed",
          border: "2px solid #e5e7eb",
          borderRadius: 28,
          padding: "12px 0",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
          boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          justifyContent: "center",
          transition: "box-shadow 0.2s, transform 0.2s",
          outline: "none",
          textDecoration: "none"
        }}>
          <span style={{ fontSize: 18, marginRight: 8, display: "flex", alignItems: "center" }}>📈</span>
          View Full Analytics
        </a>
      </div>
    </div>
  );
}

// Simple SVG line chart for prestaged data
function GrowthTrendsChart() {
  // Example prestaged data
  const data = [27000, 27500, 28000, 29000];
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const maxY = 60000;
  const minY = 0;
  const chartHeight = 220;
  const chartWidth = 700;
  const padding = 48;
  // Calculate points
  const points = data.map((v, i) => {
    const x = padding + (i * (chartWidth - 2 * padding)) / (data.length - 1);
    const y = chartHeight - padding - ((v - minY) / (maxY - minY)) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={{ width: chartWidth, height: chartHeight, overflow: "auto" }}>
      <svg width={chartWidth} height={chartHeight}>
        {/* Y axis grid lines and labels */}
        {[0, 15000, 30000, 45000, 60000].map((y, i) => {
          const yPos = chartHeight - padding - ((y - minY) / (maxY - minY)) * (chartHeight - 2 * padding);
          return (
            <g key={y}>
              <line x1={padding} x2={chartWidth - padding} y1={yPos} y2={yPos} stroke="#e5e7eb" strokeDasharray="4 2" />
              <text x={padding - 10} y={yPos + 4} fontSize="13" fill="#888" textAnchor="end">{y.toLocaleString()}</text>
            </g>
          );
        })}
        {/* X axis labels */}
        {labels.map((label, i) => {
          const x = padding + (i * (chartWidth - 2 * padding)) / (labels.length - 1);
          return (
            <text key={label} x={x} y={chartHeight - padding + 28} fontSize="15" fill="#888" textAnchor="middle">{label}</text>
          );
        })}
        {/* Data line */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          points={points}
        />
        {/* Data points */}
        {data.map((v, i) => {
          const x = padding + (i * (chartWidth - 2 * padding)) / (data.length - 1);
          const y = chartHeight - padding - ((v - minY) / (maxY - minY)) * (chartHeight - 2 * padding);
          return (
            <circle key={i} cx={x} cy={y} r={6} fill="#fff" stroke="#10b981" strokeWidth={3} />
          );
        })}
      </svg>
    </div>
  );
}

function MetricCard({ title, value, change, sub }: { title: string; value: string; change?: string; sub?: string }) {
  return (
    <div className={styles.dashboardCard}>
      <div style={{ color: "#181b20", fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 4, color: "#181b20" }}>{value}</div>
      {change && <div style={{ color: "#16a34a", fontSize: 14 }}>{change}</div>}
      {sub && <div style={{ color: "#6b7280", fontSize: 14 }}>{sub}</div>}
    </div>
  );
}
