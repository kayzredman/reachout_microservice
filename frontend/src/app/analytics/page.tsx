"use client";

import { useState } from "react";

// Dummy data for charts
const growthData = {
  labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
  followers: [15000, 17000, 18500, 20000],
  engagement: [30000, 32000, 34000, 36000],
  reach: [45000, 47000, 49000, 52000],
};

const platformPie = [
  { label: "Instagram", value: 12450, color: "#ec4899" },
  { label: "Facebook", value: 8920, color: "#3b82f6" },
  { label: "X", value: 5340, color: "#222" },
];

const engagementBar = [
  { label: "Instagram", value: 5420 },
  { label: "Facebook", value: 4230 },
  { label: "X", value: 2900 },
];

const platformPerf = [
  { name: "Instagram", followers: 12450, engagement: 5420, handle: "@faithchurch" },
  { name: "Facebook", followers: 8920, engagement: 4230, handle: "@Faith Church Community" },
  { name: "X (Twitter)", followers: 5340, engagement: null, handle: "@faithchurchorg" },
];

const topPosts = [
  {
    title: "Good morning! Remember that God's grace is new every morning...",
    engagement: 553,
    reach: 5220,
  },
  {
    title: "Today's devotional: 'Faith is taking the first step...'",
    engagement: 436,
    reach: 4580,
  },
  {
    title: "Week 3 of our 30-day devotional series...",
    engagement: 381,
    reach: 3890,
  },
];

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "40px 0", background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: 8, color: "#181b20" }}>Analytics</h1>
      <p style={{ color: "#6b7280", marginBottom: 32, fontSize: "1.2rem" }}>
        Track your growth and engagement across all platforms
      </p>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 1300, marginBottom: 32 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#888", fontSize: 15, marginBottom: 8 }}>Total Followers</div>
          <div style={{ fontWeight: 700, fontSize: 32, color: "#16a34a" }}>26,710</div>
          <div style={{ color: "#16a34a", fontSize: 15, marginTop: 8 }}>↗ +8.3% this week</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#888", fontSize: 15, marginBottom: 8 }}>Total Engagement</div>
          <div style={{ fontWeight: 700, fontSize: 32, color: "#181b20" }}>12,450</div>
          <div style={{ color: "#888", fontSize: 15, marginTop: 8 }}>5.7% engagement rate</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#888", fontSize: 15, marginBottom: 8 }}>Total Reach</div>
          <div style={{ fontWeight: 700, fontSize: 32, color: "#16a34a" }}>48,920</div>
          <div style={{ color: "#16a34a", fontSize: 15, marginTop: 8 }}>↗ +12.4% this week</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#888", fontSize: 15, marginBottom: 8 }}>Posts This Week</div>
          <div style={{ fontWeight: 700, fontSize: 32, color: "#181b20" }}>7</div>
          <div style={{ color: "#888", fontSize: 15, marginTop: 8 }}>Across all platforms</div>
        </div>
      </div>
      {/* Growth Trends & Platform Distribution */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 1300, marginBottom: 32 }}>
        <div style={{ flex: 2, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", minWidth: 400 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: "#181b20" }}>Weekly Growth Trends</div>
          {/* Simple SVG Line Chart */}
          <svg width="100%" height="220" viewBox="0 0 500 220">
            {/* Axes */}
            <line x1="40" y1="20" x2="40" y2="200" stroke="#e5e7eb" strokeWidth="2" />
            <line x1="40" y1="200" x2="480" y2="200" stroke="#e5e7eb" strokeWidth="2" />
            {/* Y ticks */}
            {[0, 15000, 30000, 45000, 60000].map((y, i) => (
              <g key={i}>
                <text x="10" y={200 - (y / 60000) * 180 + 5} fontSize="12" fill="#888">{y}</text>
                <line x1="35" y1={200 - (y / 60000) * 180} x2="480" y2={200 - (y / 60000) * 180} stroke="#f3f4f6" strokeWidth="1" />
              </g>
            ))}
            {/* X labels */}
            {growthData.labels.map((label, i) => (
              <text key={i} x={70 + i * 110} y={215} fontSize="13" fill="#888">{label}</text>
            ))}
            {/* Followers line */}
            <polyline
              fill="none"
              stroke="#818cf8"
              strokeWidth="3"
              points={growthData.followers.map((v, i) => `${70 + i * 110},${200 - (v / 60000) * 180}`).join(" ")}
            />
            {/* Engagement line */}
            <polyline
              fill="none"
              stroke="#a78bfa"
              strokeWidth="3"
              points={growthData.engagement.map((v, i) => `${70 + i * 110},${200 - (v / 60000) * 180}`).join(" ")}
            />
            {/* Reach line */}
            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              points={growthData.reach.map((v, i) => `${70 + i * 110},${200 - (v / 60000) * 180}`).join(" ")}
            />
            {/* Dots */}
            {growthData.followers.map((v, i) => (
              <circle key={i} cx={70 + i * 110} cy={200 - (v / 60000) * 180} r="4" fill="#818cf8" />
            ))}
            {growthData.engagement.map((v, i) => (
              <circle key={i} cx={70 + i * 110} cy={200 - (v / 60000) * 180} r="4" fill="#a78bfa" />
            ))}
            {growthData.reach.map((v, i) => (
              <circle key={i} cx={70 + i * 110} cy={200 - (v / 60000) * 180} r="4" fill="#22d3ee" />
            ))}
            {/* Legend */}
            <g>
              <circle cx="120" cy="30" r="6" fill="#818cf8" />
              <text x="135" y="35" fontSize="13" fill="#818cf8">Followers</text>
              <circle cx="220" cy="30" r="6" fill="#a78bfa" />
              <text x="235" y="35" fontSize="13" fill="#a78bfa">Engagement</text>
              <circle cx="340" cy="30" r="6" fill="#22d3ee" />
              <text x="355" y="35" fontSize="13" fill="#22d3ee">Reach</text>
            </g>
          </svg>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", minWidth: 320 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: "#181b20" }}>Platform Distribution</div>
          {/* Simple SVG Pie Chart */}
          <svg width="100%" height="200" viewBox="0 0 220 200">
            {/* Pie slices */}
            {(() => {
              const total = platformPie.reduce((sum, p) => sum + p.value, 0);
              let startAngle = 0;
              return platformPie.map((p, i) => {
                const angle = (p.value / total) * 2 * Math.PI;
                const x1 = 110 + 90 * Math.cos(startAngle);
                const y1 = 100 + 90 * Math.sin(startAngle);
                const x2 = 110 + 90 * Math.cos(startAngle + angle);
                const y2 = 100 + 90 * Math.sin(startAngle + angle);
                const largeArc = angle > Math.PI ? 1 : 0;
                // For label placement
                const midAngle = startAngle + angle / 2;
                const labelX = 110 + 70 * Math.cos(midAngle);
                const labelY = 100 + 70 * Math.sin(midAngle);
                const path = `M110,100 L${x1},${y1} A90,90 0 ${largeArc} 1 ${x2},${y2} Z`;
                const label = `${p.label}: ${p.value.toLocaleString()}`;
                const labelColor = p.color;
                const textAnchor = labelX > 110 ? "start" : "end";
                const labelFontSize = 15;
                const labelYOffset = 6;
                const result = [
                  <path key={"slice-"+i} d={path} fill={p.color} stroke="#fff" strokeWidth="2" />,
                  <text
                    key={"label-"+i}
                    x={labelX}
                    y={labelY + labelYOffset}
                    fontSize={labelFontSize}
                    fill={labelColor}
                    textAnchor={textAnchor}
                    style={{ fontWeight: 500, pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                ];
                startAngle += angle;
                return result;
              });
            })()}
          </svg>
        </div>
      </div>
      {/* Engagement by Platform & Platform Performance */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 1300, marginBottom: 32 }}>
        <div style={{ flex: 2, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", minWidth: 400 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: "#181b20" }}>Engagement by Platform</div>
          {/* Simple SVG Bar Chart */}
          <svg width="100%" height="200" viewBox="0 0 400 200">
            {/* Axes */}
            <line x1="40" y1="20" x2="40" y2="180" stroke="#e5e7eb" strokeWidth="2" />
            <line x1="40" y1="180" x2="380" y2="180" stroke="#e5e7eb" strokeWidth="2" />
            {/* Bars and value labels */}
            {engagementBar.map((p, i) => {
              const barX = 70 + i * 110;
              const barY = 180 - (p.value / 6000) * 160;
              const barHeight = (p.value / 6000) * 160;
              return [
                <rect
                  key={"bar-"+i}
                  x={barX}
                  y={barY}
                  width={60}
                  height={barHeight}
                  fill="#a78bfa"
                  rx={8}
                />,
                <text
                  key={"bar-label-"+i}
                  x={barX + 30}
                  y={barY - 8}
                  fontSize="14"
                  fill="#a78bfa"
                  textAnchor="middle"
                  style={{ fontWeight: 600 }}
                >
                  {p.value}
                </text>
              ];
            })}
            {/* X labels */}
            {engagementBar.map((p, i) => (
              <text key={i} x={100 + i * 110} y={195} fontSize="13" fill="#888" textAnchor="middle">{p.label}</text>
            ))}
            {/* Legend */}
            <rect x="120" y="30" width="18" height="18" fill="#a78bfa" rx={4} />
            <text x="145" y="44" fontSize="13" fill="#a78bfa">Engagement</text>
          </svg>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", minWidth: 320, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#181b20" }}>Platform Performance</div>
          {platformPerf.map((p, i) => (
            <div key={i} style={{ border: "1.5px solid #f3f4f6", borderRadius: 10, padding: 14, marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#181b20" }}>{p.name}</div>
              <div style={{ color: "#888", fontSize: 13 }}>{p.handle}</div>
              <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
                <div>
                  <div style={{ color: "#888", fontSize: 13 }}>Followers</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.followers}</div>
                </div>
                <div>
                  <div style={{ color: "#888", fontSize: 13 }}>Engagement</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.engagement ?? "-"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Top Performing Posts */}
      <div style={{ width: "100%", maxWidth: 900, background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)", marginBottom: 32 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, color: "#181b20" }}>Top Performing Posts</div>
        {topPosts.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, border: "1.5px solid #f3f4f6", borderRadius: 10, padding: 18, marginBottom: 12 }}>
            <div style={{ background: "#818cf8", color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#181b20" }}>{p.title}</div>
              <div style={{ color: "#888", fontSize: 14, display: "flex", gap: 18 }}>
                <span>♡ {p.engagement} engagements</span>
                <span>👁 {p.reach} reach</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Bottom Cards */}
      <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 900, marginBottom: 40 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#16a34a", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>↗ Best Performing Day</div>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>Sunday</div>
          <div style={{ color: "#888", fontSize: 14 }}>28% higher engagement than average</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>💬 Most Engaging Content</div>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>Morning Posts</div>
          <div style={{ color: "#888", fontSize: 14 }}>7-9 AM posts get 40% more engagement</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px 0 rgba(44, 62, 80, 0.10)" }}>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>🔗 Top Hashtag</div>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>#FaithJourney</div>
          <div style={{ color: "#888", fontSize: 14 }}>Used in 67% of top posts</div>
        </div>
      </div>
    </div>
  );
}
