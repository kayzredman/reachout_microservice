/**
 * seed-demo.mjs
 *
 * Seeds the FaithReach database with rich demo data across ALL tables
 * for a polished dashboard, analytics, billing, notifications, support,
 * and payment history experience.
 *
 * Reads connection details from .env (DB_HOST, DB_USERNAME, DB_PASSWORD,
 * DB_NAME, DB_SSL) or falls back to local Docker defaults.
 *
 * Usage: node scripts/seed-demo.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const { Client } = pg;

/* ── Load .env from project root ─────────────────────── */
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — rely on existing env vars or defaults
}

const ORG_ID = "org_3BTod2QLFmvD0KovlP3cDouVNLg";
const USER_ID = "user_demo_seed";

const useSSL = process.env.DB_SSL === "true";
const DB_OPTS = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
};

/* ── Helpers ─────────────────────────────────────────── */

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString();
}

function futureHours(n) {
  return new Date(Date.now() + n * 3600000).toISOString();
}

function futureDays(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

/* ── Demo team members ───────────────────────────────── */

const TEAM = [
  { id: "user_demo_pastor_james",  name: "Pastor James Mensah",  email: "james@faithreach.io",  role: "org:admin",   imageUrl: "https://img.clerk.com/demo/james.jpg",  bio: "Lead pastor and founder of FaithReach Church. 15 years in ministry.", location: "Accra, Ghana" },
  { id: "user_demo_sarah_k",      name: "Sarah Kwarteng",       email: "sarah@faithreach.io",  role: "org:admin",   imageUrl: "https://img.clerk.com/demo/sarah.jpg",  bio: "Communications Director. Oversees all social media and outreach.", location: "Accra, Ghana" },
  { id: "user_demo_david_a",      name: "David Asante",         email: "david@faithreach.io",  role: "org:member",  imageUrl: "https://img.clerk.com/demo/david.jpg",  bio: "Youth Ministry lead. Passionate about mentoring the next generation.", location: "Kumasi, Ghana" },
  { id: "user_demo_grace_o",      name: "Grace Osei",           email: "grace@faithreach.io",  role: "org:member",  imageUrl: "https://img.clerk.com/demo/grace.jpg",  bio: "Worship leader and content creator. Manages music ministry social media.", location: "Tema, Ghana" },
  { id: "user_demo_kwame_b",      name: "Kwame Boateng",        email: "kwame@faithreach.io",  role: "org:member",  imageUrl: "https://img.clerk.com/demo/kwame.jpg",  bio: "Volunteer coordinator and community outreach manager.", location: "Accra, Ghana" },
  { id: USER_ID,                   name: "Demo User",            email: "demo@faithreach.io",   role: "org:admin",   imageUrl: "https://img.clerk.com/demo/user.jpg",   bio: "Seed account for demo purposes.", location: "Accra, Ghana" },
];

/* ── Demo content — 25 published posts ───────────────── */

const POSTS = [
  { content: "Good morning, church family! ☀️ 'His mercies are new every morning; great is His faithfulness.' — Lamentations 3:23. Start your day knowing you are loved beyond measure.", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"], daysAgo: 1, author: "user_demo_sarah_k" },
  { content: "🙏 This Sunday's sermon: 'Finding Peace in the Storm' — Join us at 10 AM as Pastor James walks us through how to anchor our faith when life feels uncertain. See you there!", platforms: ["Instagram", "Facebook", "WhatsApp", "YouTube"], daysAgo: 3, author: "user_demo_pastor_james" },
  { content: "Day 7 of our 30-Day Faith Challenge: Write down three things God has done for you this week. Gratitude shifts perspective. Share yours below! 👇 #FaithChallenge #Grateful", platforms: ["Instagram", "Facebook", "X (Twitter)"], daysAgo: 5, author: "user_demo_sarah_k" },
  { content: "'For I know the plans I have for you,' declares the LORD, 'plans to prosper you and not to harm you, plans to give you hope and a future.' — Jeremiah 29:11 🕊️", platforms: ["Facebook", "X (Twitter)"], daysAgo: 7, author: "user_demo_grace_o" },
  { content: "Our youth group had an AMAZING retreat this weekend! 🎉 42 young people came together for worship, fellowship, and growth. So proud of this next generation! #YouthOnFire", platforms: ["Instagram", "Facebook", "X (Twitter)"], daysAgo: 8, author: "user_demo_david_a" },
  { content: "📖 Midweek Bible Study tonight at 7 PM! We're diving into the book of James — practical faith that works. Bring your Bible and a friend!", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"], daysAgo: 10, author: "user_demo_sarah_k" },
  { content: "TONIGHT! 🎶 Worship Night at FaithReach Church. Doors open at 6:30 PM. Come as you are and experience God's presence in a powerful way.", platforms: ["Instagram", "Facebook", "WhatsApp", "YouTube"], daysAgo: 12, author: "user_demo_grace_o" },
  { content: "Community outreach update: We packed and delivered 200 food boxes to families in need this month! Thank you to every volunteer who made this possible. 🤝❤️ #ServeOthers", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"], daysAgo: 14, author: "user_demo_kwame_b" },
  { content: "'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to Him, and He will make your paths straight.' — Proverbs 3:5-6", platforms: ["Facebook", "X (Twitter)"], daysAgo: 16, author: "user_demo_pastor_james" },
  { content: "Easter is 3 weeks away! 🐣 Invite someone to join you. We're planning something special — you won't want to miss it. Save the date!", platforms: ["Instagram", "Facebook", "X (Twitter)"], daysAgo: 18, author: "user_demo_sarah_k" },
  { content: "Prayer Request Wednesday 🙏 Drop your prayer requests in the comments. Our prayer team reads every single one. You are not alone.", platforms: ["Instagram", "Facebook", "WhatsApp"], daysAgo: 20, author: "user_demo_pastor_james" },
  { content: "Just launched our new podcast! 🎙️ 'Faith Forward' — weekly conversations about living boldly for Christ in everyday life. Link in bio! #FaithForwardPodcast", platforms: ["Instagram", "Facebook", "X (Twitter)", "YouTube"], daysAgo: 22, author: "user_demo_sarah_k" },
  { content: "🎯 Ministry Goals 2026: 1) Reach 10,000 people online 2) Plant 2 new church campuses 3) Train 50 youth leaders 4) Feed 5,000 families. Will you partner with us?", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp"], daysAgo: 24, author: "user_demo_pastor_james" },
  { content: "Baptism Sunday was incredible! 🌊 14 people declared their faith publicly. Heaven is rejoicing! Welcome to the family! #NewCreation #Baptized", platforms: ["Instagram", "Facebook", "YouTube"], daysAgo: 26, author: "user_demo_david_a" },
  { content: "Marriage seminar this Saturday: 'Building a God-Centered Home.' Open to all couples — whether dating, engaged, or married for decades. Register via link in bio.", platforms: ["Instagram", "Facebook", "WhatsApp"], daysAgo: 28, author: "user_demo_sarah_k" },
  { content: "'The LORD is my shepherd; I shall not want.' — Psalm 23:1. Sometimes the simplest verses carry the deepest comfort. Meditate on this today. 🕊️", platforms: ["Facebook", "X (Twitter)", "WhatsApp"], daysAgo: 30, author: "user_demo_grace_o" },
  { content: "Volunteer appreciation dinner last night was AMAZING! 🎉 Thank you to our 120+ volunteers who serve faithfully every week. You are the backbone of this church!", platforms: ["Instagram", "Facebook", "X (Twitter)"], daysAgo: 32, author: "user_demo_kwame_b" },
  { content: "📢 Announcement: Starting next month, we'll have TWO Sunday services — 8 AM & 10:30 AM. Same powerful worship, more room for everyone!", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"], daysAgo: 34, author: "user_demo_pastor_james" },
  { content: "Day 21 of #FaithChallenge: Fast from social media for 24 hours. Spend that time in prayer and journaling. Report back tomorrow! You got this. 💪", platforms: ["Instagram", "Facebook", "X (Twitter)"], daysAgo: 36, author: "user_demo_sarah_k" },
  { content: "Our children's ministry team just completed training! 🧒 25 amazing teachers ready to pour into the next generation. Safe, fun, and Spirit-filled!", platforms: ["Instagram", "Facebook"], daysAgo: 38, author: "user_demo_david_a" },
  { content: "🙌 Testimony Tuesday: 'I was battling anxiety for years. Through prayer and this community, God has given me a peace I never thought possible.' — Church member K.", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp"], daysAgo: 40, author: "user_demo_pastor_james" },
  { content: "New worship album dropping next Friday! 🎵 'Drawn to You' — 10 original tracks recorded live at FaithReach. Pre-save link in bio! #DrawnToYou", platforms: ["Instagram", "Facebook", "X (Twitter)", "YouTube"], daysAgo: 42, author: "user_demo_grace_o" },
  { content: "Community clean-up day this Saturday! 🧹 Meet at the church car park at 8 AM. Let's be the hands and feet of Jesus in our neighborhood. Bring gloves!", platforms: ["Instagram", "Facebook", "WhatsApp"], daysAgo: 44, author: "user_demo_kwame_b" },
  { content: "'Be still, and know that I am God.' — Psalm 46:10. In a world that never stops moving, take a moment today to simply be in His presence. ❤️", platforms: ["Facebook", "X (Twitter)"], daysAgo: 46, author: "user_demo_grace_o" },
  { content: "Mission trip update from Northern Ghana 🇬🇭: 3 wells drilled, 200+ children served at VBS, and 2 new church partnerships formed. God is moving! #MissionsMonth", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"], daysAgo: 48, author: "user_demo_pastor_james" },
];

const DRAFT_POSTS = [
  { content: "DRAFT: Upcoming church picnic announcement — need to confirm date with facilities team", platforms: ["Instagram", "Facebook"], author: "user_demo_sarah_k" },
  { content: "DRAFT: Interview with visiting missionary from Kenya — editing video clips for social", platforms: ["Instagram", "YouTube"], author: "user_demo_grace_o" },
];

const SCHEDULED_POSTS = [
  { content: "🌅 Monday Motivation: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' — Joshua 1:9", platforms: ["Instagram", "Facebook", "X (Twitter)"], hoursFromNow: 18, author: "user_demo_sarah_k" },
  { content: "This Wednesday's Bible study will cover Romans 8 — 'More than conquerors through Him who loved us.' Don't miss it! 📖", platforms: ["Instagram", "Facebook"], hoursFromNow: 66, author: "user_demo_pastor_james" },
  { content: "Volunteer spotlight ✨ Meet Sarah, who has served in our children's ministry for 5 years! Her dedication to the next generation is truly inspiring.", platforms: ["Instagram", "Facebook", "X (Twitter)"], hoursFromNow: 114, author: "user_demo_kwame_b" },
  { content: "🎶 New song alert! Our worship team just released 'Anchor of My Soul' — listen now on all platforms. Link in bio! #AnchorOfMySoul", platforms: ["Instagram", "Facebook", "X (Twitter)", "YouTube"], hoursFromNow: 162, author: "user_demo_grace_o" },
  { content: "Save the date! 📅 Annual Church Conference — August 15-17. Theme: 'Unshakeable Faith.' Early bird registration opens next week!", platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp"], hoursFromNow: 210, author: "user_demo_pastor_james" },
];

const SERIES = [
  { title: "30-Day Faith Challenge", theme: "Daily Devotional", description: "A month-long journey through daily scripture readings and reflective questions to deepen your relationship with God.", status: "Active", color: "#8b5cf6", totalPosts: 30, startDaysAgo: 15, endDaysFromNow: 15, platforms: ["Instagram", "Facebook", "X (Twitter)"] },
  { title: "Sunday Sermon Series", theme: "Finding Peace", description: "A 6-week sermon series exploring how to find God's peace in uncertain times.", status: "Active", color: "#3b82f6", totalPosts: 6, startDaysAgo: 21, endDaysFromNow: 21, platforms: ["Instagram", "Facebook"] },
  { title: "Easter Campaign", theme: "New Life", description: "Easter outreach campaign with daily posts building excitement for our Easter celebration.", status: "Upcoming", color: "#f59e0b", totalPosts: 14, startDaysFromNow: 7, endDaysFromNow: 21, platforms: ["Instagram", "Facebook", "X (Twitter)"] },
  { title: "Worship Wednesdays", theme: "Live Worship", description: "Weekly live worship session snippets and behind-the-scenes content from our worship team.", status: "Active", color: "#ec4899", totalPosts: 12, startDaysAgo: 30, endDaysFromNow: 54, platforms: ["Instagram", "YouTube"] },
  { title: "Missions Month", theme: "Global Outreach", description: "Highlighting our mission partners around the world — stories, prayer points, and giving opportunities.", status: "Completed", color: "#10b981", totalPosts: 8, startDaysAgo: 60, endDaysAgo: 30, platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp"] },
];

/* ── Engagement profile per platform (realistic ranges) ── */

const ENGAGEMENT = {
  Instagram: { impressions: [800, 5500], likes: [40, 320], comments: [5, 45], shares: [8, 55], reach: [600, 4200], views: [100, 900], saves: [5, 35] },
  Facebook:  { impressions: [500, 4000], likes: [25, 200], comments: [10, 60], shares: [15, 80], reach: [400, 3500], views: [50, 500], saves: [3, 20] },
  "X (Twitter)": { impressions: [300, 3000], likes: [10, 150], comments: [3, 30], shares: [5, 90], reach: [250, 2500], views: [30, 400], saves: [2, 15] },
  WhatsApp: { impressions: [200, 1800], likes: [2, 15], comments: [0, 3], shares: [5, 40], reach: [180, 1600], views: [150, 1400], saves: [0, 2], deliveryStatuses: ["delivered", "delivered", "read", "read", "read", "sent"] },
  YouTube: { impressions: [400, 6000], likes: [15, 250], comments: [3, 50], shares: [2, 35], reach: [350, 5000], views: [200, 4500], saves: [1, 20] },
};

/* ── Support tickets ─────────────────────────────────── */

const TICKETS = [
  {
    subject: "Can't connect Instagram account",
    description: "I keep getting an error when trying to connect our church Instagram. The OAuth popup closes immediately without completing.",
    status: "resolved", priority: "high", category: "platform",
    userId: "user_demo_sarah_k", daysAgo: 3,
    aiSummary: "Instagram OAuth connection failure — popup closes prematurely. Likely browser popup blocker or expired Meta app token.",
    messages: [
      { role: "user", content: "Hi, I've been trying to connect our Instagram account but the popup just closes immediately. Tried Chrome and Safari.", daysAgo: 3 },
      { role: "admin", content: "Hi Sarah! This is usually caused by a browser popup blocker. Can you check if popups are allowed for faithreach.io?", daysAgo: 3 },
      { role: "user", content: "Oh! That was it — I had a popup blocker extension. Disabled it and it's working now. Thank you!", daysAgo: 2 },
      { role: "admin", content: "Glad that fixed it! Let us know if you need anything else. 🙂", daysAgo: 2 },
    ],
  },
  {
    subject: "How do I upgrade to Ministry Pro?",
    description: "We want to upgrade our plan to Ministry Pro for the AI features and unlimited posts. Where do I find this?",
    status: "resolved", priority: "medium", category: "billing",
    userId: "user_demo_pastor_james", daysAgo: 8,
    aiSummary: "Customer wants to upgrade subscription tier from Creator to Ministry Pro. Directed to Settings > Billing.",
    messages: [
      { role: "user", content: "Where can I upgrade our church plan? We need the AI content assistant and the higher post limits.", daysAgo: 8 },
      { role: "admin", content: "Great to hear you're growing! Go to Settings → Billing, and you'll see the upgrade options. Ministry Pro includes AI captions, unlimited posts, and priority support.", daysAgo: 8 },
      { role: "user", content: "Found it! Just upgraded. The AI features are exactly what we needed for our content calendar. Thank you!", daysAgo: 7 },
    ],
  },
  {
    subject: "Scheduled post didn't publish",
    description: "I had a post scheduled for Sunday at 9 AM but it never went out. It still shows as 'scheduled' in the dashboard.",
    status: "in_progress", priority: "high", category: "publishing",
    userId: "user_demo_sarah_k", daysAgo: 1,
    aiSummary: "Scheduled post stuck in 'scheduled' status. Possible scheduler service issue or timezone mismatch.",
    messages: [
      { role: "user", content: "My Sunday announcement post was scheduled for 9 AM but it's still showing as scheduled. Our congregation missed it!", daysAgo: 1 },
      { role: "admin", content: "I'm looking into this now. Can you share the post ID from the URL? I'll check the scheduler logs.", daysAgo: 1 },
      { role: "user", content: "The URL shows /posts and the card says 'Sunday Morning Announcement'. I can see it in my content library.", daysAgo: 1 },
      { role: "system", content: "Ticket escalated to engineering team. Investigating scheduler service logs for failed cron execution.", daysAgo: 1 },
    ],
  },
  {
    subject: "WhatsApp broadcast CSV format",
    description: "What format should the CSV be in for WhatsApp broadcasts? I keep getting an error when uploading.",
    status: "resolved", priority: "low", category: "general",
    userId: "user_demo_kwame_b", daysAgo: 12,
    aiSummary: "User needs help with WhatsApp broadcast CSV format. CSV requires 'phone' column header with E.164 formatted numbers.",
    messages: [
      { role: "user", content: "I'm trying to upload a CSV for our WhatsApp broadcast but it keeps saying invalid format.", daysAgo: 12 },
      { role: "admin", content: "The CSV needs a 'phone' column header with numbers in E.164 format (e.g., +233551234567). Make sure there are no spaces in the numbers.", daysAgo: 12 },
      { role: "user", content: "That worked perfectly! Sent our weekly update to 450 members. This feature is amazing!", daysAgo: 11 },
    ],
  },
  {
    subject: "Request: TikTok integration",
    description: "Any plans to add TikTok as a publishing platform? Our youth team would love to cross-post there.",
    status: "open", priority: "low", category: "feature_request",
    userId: "user_demo_david_a", daysAgo: 5,
    aiSummary: "Feature request for TikTok platform integration. Youth ministry use case for cross-posting short-form video content.",
    messages: [
      { role: "user", content: "Hey! Our youth group is really active on TikTok. Would be awesome if we could publish there from FaithReach. Any plans for that?", daysAgo: 5 },
      { role: "admin", content: "Thanks for the suggestion, David! TikTok integration is on our roadmap. We'll update you when it's available.", daysAgo: 4 },
    ],
  },
  {
    subject: "Analytics showing zero for YouTube",
    description: "My YouTube metrics are all showing zero even though our videos have thousands of views. Is this a bug?",
    status: "escalated", priority: "medium", category: "bug",
    userId: "user_demo_grace_o", daysAgo: 2,
    aiSummary: "YouTube metrics not syncing — all values show 0. Possible YouTube Data API quota exceeded or token refresh failure.",
    messages: [
      { role: "user", content: "All my YouTube analytics are stuck at zero. Our 'Drawn to You' live stream had 3,000 views but FaithReach shows 0.", daysAgo: 2 },
      { role: "system", content: "AI Triage: Checking YouTube API integration logs. Possible causes: 1) API quota exceeded 2) Expired OAuth token 3) Metric fetch job failure.", daysAgo: 2 },
      { role: "admin", content: "We've identified the issue — it looks like the YouTube API token needs to be refreshed. Can you try disconnecting and reconnecting YouTube in Settings?", daysAgo: 1 },
    ],
  },
];

/* ── Notifications ───────────────────────────────────── */

const NOTIFICATIONS = [
  { userId: "user_demo_sarah_k", title: "Post Published", body: "Your post 'Good morning, church family!' was successfully published to 5 platforms.", daysAgo: 1 },
  { userId: "user_demo_sarah_k", title: "Engagement Milestone", body: "🎉 Your Easter announcement post reached 5,000 impressions across all platforms!", daysAgo: 3 },
  { userId: "user_demo_pastor_james", title: "New Team Member", body: "Kwame Boateng has joined your organization.", daysAgo: 10 },
  { userId: "user_demo_pastor_james", title: "Subscription Upgraded", body: "Your plan has been upgraded to Ministry Pro. Enjoy AI-powered content creation!", daysAgo: 7 },
  { userId: "user_demo_grace_o", title: "Scheduled Post Ready", body: "Your scheduled post 'New song alert!' will be published in 24 hours.", daysAgo: 0 },
  { userId: "user_demo_david_a", title: "Post Published", body: "Your youth retreat recap was published to Instagram and Facebook.", daysAgo: 8 },
  { userId: "user_demo_kwame_b", title: "Broadcast Completed", body: "WhatsApp broadcast to 450 recipients completed. 438 delivered, 12 failed.", daysAgo: 11 },
  { userId: "user_demo_sarah_k", title: "Series Milestone", body: "30-Day Faith Challenge is halfway done! 15 posts published, engagement up 23%.", daysAgo: 5 },
  { userId: "user_demo_pastor_james", title: "Payment Successful", body: "Payment of GHS 199.00 for Ministry Pro plan was processed successfully.", daysAgo: 7 },
  { userId: "user_demo_sarah_k", title: "Content Tip", body: "💡 Posts with questions get 2x more comments. Try adding a question to your next post!", daysAgo: 15 },
  { userId: "user_demo_grace_o", title: "Post Published", body: "Your worship night announcement was published to 4 platforms.", daysAgo: 12 },
  { userId: "user_demo_pastor_james", title: "Weekly Report", body: "This week: 8 posts published, 12,450 total impressions, 4.2% avg engagement rate.", daysAgo: 2 },
  { userId: "user_demo_david_a", title: "Ticket Update", body: "Your feature request for TikTok integration has been acknowledged.", daysAgo: 4 },
  { userId: "user_demo_kwame_b", title: "Post Published", body: "Community outreach update was published to 5 platforms.", daysAgo: 14 },
  { userId: "user_demo_sarah_k", title: "Engagement Alert", body: "📈 Your podcast launch post is trending! 280 likes and 45 comments so far.", daysAgo: 22 },
];

/* ── Payments ────────────────────────────────────────── */

const PAYMENTS = [
  { tier: "creator",      amount: 49.00,  currency: "GHS", status: "successful", method: "mobile_money_ghana", daysAgo: 90, email: "james@faithreach.io" },
  { tier: "creator",      amount: 49.00,  currency: "GHS", status: "successful", method: "mobile_money_ghana", daysAgo: 60, email: "james@faithreach.io" },
  { tier: "ministry_pro", amount: 199.00, currency: "GHS", status: "successful", method: "card",              daysAgo: 30, email: "james@faithreach.io" },
  { tier: "ministry_pro", amount: 199.00, currency: "GHS", status: "successful", method: "card",              daysAgo: 7,  email: "james@faithreach.io" },
  { tier: "ministry_pro", amount: 199.00, currency: "GHS", status: "failed",     method: "mobile_money_ghana", daysAgo: 35, email: "james@faithreach.io" },
];

/* ── Broadcast logs ──────────────────────────────────── */

const BROADCASTS = [
  { message: "📢 Reminder: Sunday service at 10 AM. Special guest speaker this week! Don't miss it.", total: 450, sent: 450, delivered: 438, read: 312, failed: 12, status: "completed", daysAgo: 7 },
  { message: "🙏 Weekly Prayer Points: 1) Health of our elders 2) Youth retreat preparations 3) Church building fund 4) Mission team in Northern Ghana", total: 450, sent: 450, delivered: 445, read: 389, failed: 5, status: "completed", daysAgo: 14 },
  { message: "Easter service times: 7 AM Sunrise Service, 9 AM Main Service, 11 AM Family Service. Invite a friend!", total: 520, sent: 520, delivered: 508, read: 421, failed: 12, status: "completed", daysAgo: 21 },
  { message: "🎶 Worship Night this Friday at 6:30 PM. Special acoustic set by our youth worship band. Bring the whole family!", total: 380, sent: 380, delivered: 372, read: 285, failed: 8, status: "completed", daysAgo: 28 },
];

/* ── Seed functions ──────────────────────────────────── */

async function seedUsers(client) {
  console.log("  → Seeding team members…");
  for (const u of TEAM) {
    const existing = await client.query(`SELECT id FROM "user" WHERE id = $1`, [u.id]);
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE "user" SET name = $1, email = $2, "imageUrl" = $3, role = $4, organization = $5, bio = $6, location = $7, "updatedAt" = NOW() WHERE id = $8`,
        [u.name, u.email, u.imageUrl, u.role, ORG_ID, u.bio, u.location, u.id],
      );
    } else {
      await client.query(
        `INSERT INTO "user" (id, name, email, "imageUrl", role, organization, bio, location, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [u.id, u.name, u.email, u.imageUrl, u.role, ORG_ID, u.bio, u.location],
      );
    }
  }
  console.log(`  ✓ ${TEAM.length} team members`);
}

async function seedPosts(client) {
  console.log("  → Seeding posts…");
  const postIds = [];

  for (const p of POSTS) {
    const id = uuid();
    postIds.push({ id, platforms: p.platforms });
    const publishedAt = daysAgo(p.daysAgo);
    const publishResults = p.platforms.map((plat) => ({
      platform: plat, status: "published", platformPostId: `plat_${uuid().slice(0, 8)}`,
    }));
    await client.query(
      `INSERT INTO post_entity (id, "organizationId", "createdBy", content, platforms, status, "publishResults", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [id, ORG_ID, p.author, p.content, JSON.stringify(p.platforms), "published", JSON.stringify(publishResults), publishedAt, publishedAt],
    );
  }

  // Draft posts
  for (const p of DRAFT_POSTS) {
    await client.query(
      `INSERT INTO post_entity (id, "organizationId", "createdBy", content, platforms, status, "publishResults", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [uuid(), ORG_ID, p.author, p.content, JSON.stringify(p.platforms), "draft", JSON.stringify([])],
    );
  }

  // Scheduled posts
  for (const p of SCHEDULED_POSTS) {
    const scheduledAt = futureHours(p.hoursFromNow);
    const publishResults = p.platforms.map((plat) => ({ platform: plat, status: "pending" }));
    await client.query(
      `INSERT INTO post_entity (id, "organizationId", "createdBy", content, platforms, status, "publishResults", "scheduledAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [uuid(), ORG_ID, p.author, p.content, JSON.stringify(p.platforms), "scheduled", JSON.stringify(publishResults), scheduledAt],
    );
  }

  console.log(`  ✓ ${POSTS.length} published + ${DRAFT_POSTS.length} drafts + ${SCHEDULED_POSTS.length} scheduled`);
  return postIds;
}

async function seedMetrics(client, postIds) {
  console.log("  → Seeding post metrics…");
  let count = 0;
  const values = [];

  for (const { id, platforms } of postIds) {
    const res = await client.query(`SELECT "publishResults" FROM post_entity WHERE id = $1`, [id]);
    const publishResults = res.rows[0]?.publishResults || [];

    for (const pr of publishResults) {
      if (pr.status !== "published" || !pr.platformPostId) continue;
      const eng = ENGAGEMENT[pr.platform];
      if (!eng) continue;

      for (let snap = 0; snap < 5; snap++) {
        const impressions = rand(...eng.impressions) + snap * rand(80, 300);
        const likes = rand(...eng.likes) + snap * rand(8, 30);
        const comments = rand(...eng.comments) + snap * rand(2, 8);
        const shares = rand(...eng.shares) + snap * rand(2, 12);
        const reach = rand(...eng.reach) + snap * rand(50, 200);
        const views = rand(...eng.views) + snap * rand(15, 80);
        const saves = rand(...eng.saves) + snap * rand(1, 5);
        const engRate = impressions > 0 ? ((likes + comments + shares) / impressions) : 0;
        const deliveryStatus = eng.deliveryStatuses ? pick(eng.deliveryStatuses) : null;

        values.push([uuid(), id, pr.platform, pr.platformPostId, impressions, likes, comments, shares, reach, views, saves, parseFloat(engRate.toFixed(4)), deliveryStatus, hoursAgo((4 - snap) * 12)]);
        count++;
      }
    }
  }

  // Batch insert in chunks of 25
  for (let i = 0; i < values.length; i += 25) {
    const chunk = values.slice(i, i + 25);
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 14;
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8}, $${base+9}, $${base+10}, $${base+11}, $${base+12}, $${base+13}, $${base+14})`;
    }).join(", ");
    await client.query(
      `INSERT INTO post_metrics (id, "postId", platform, "platformPostId", impressions, likes, comments, shares, reach, views, saves, "engagementRate", "deliveryStatus", "fetchedAt")
       VALUES ${placeholders}`,
      chunk.flat(),
    );
  }

  console.log(`  ✓ ${count} metric snapshots`);
}

async function seedSeries(client) {
  console.log("  → Seeding series…");
  for (const s of SERIES) {
    const startDate = s.startDaysAgo
      ? new Date(Date.now() - s.startDaysAgo * 86400000).toISOString().split("T")[0]
      : new Date(Date.now() + s.startDaysFromNow * 86400000).toISOString().split("T")[0];
    const endDate = s.endDaysAgo
      ? new Date(Date.now() - s.endDaysAgo * 86400000).toISOString().split("T")[0]
      : new Date(Date.now() + s.endDaysFromNow * 86400000).toISOString().split("T")[0];
    await client.query(
      `INSERT INTO series_entity (id, "organizationId", "createdBy", title, theme, description, status, color, "totalPosts", "startDate", "endDate", platforms, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [uuid(), ORG_ID, USER_ID, s.title, s.theme, s.description, s.status, s.color, s.totalPosts, startDate, endDate, JSON.stringify(s.platforms)],
    );
  }
  console.log(`  ✓ ${SERIES.length} series`);
}

async function seedPlatforms(client) {
  console.log("  → Seeding platform connections…");
  const platforms = [
    { platform: "Instagram", handle: "@faithreachchurch", connected: true, platformAccountId: "ig_17841234567890" },
    { platform: "Facebook", handle: "FaithReach Church Community", connected: true, platformAccountId: "fb_108234567890" },
    { platform: "X (Twitter)", handle: "@faithreachorg", connected: true, platformAccountId: "tw_1234567890" },
    { platform: "WhatsApp", handle: "+233 55 148 1853", connected: true, phoneNumber: "+233551481853", channelId: "120363234567890@newsletter" },
    { platform: "YouTube", handle: "FaithReach Church", connected: true, platformAccountId: "UC_yt_faithreach123" },
  ];
  for (const p of platforms) {
    const existing = await client.query(
      `SELECT id FROM platform_connection WHERE "organizationId" = $1 AND platform = $2`,
      [ORG_ID, p.platform],
    );
    if (existing.rows.length > 0) {
      await client.query(`UPDATE platform_connection SET connected = $1, handle = $2 WHERE id = $3`, [p.connected, p.handle, existing.rows[0].id]);
    } else {
      await client.query(
        `INSERT INTO platform_connection (id, "organizationId", platform, connected, handle, "accessToken", "platformAccountId", "phoneNumber", "channelId", "connectedBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [uuid(), ORG_ID, p.platform, p.connected, p.handle, "demo_token_" + p.platform.toLowerCase(), p.platformAccountId || null, p.phoneNumber || null, p.channelId || null, USER_ID],
      );
    }
  }
  console.log(`  ✓ ${platforms.length} platform connections`);
}

async function seedSubscription(client) {
  console.log("  → Seeding billing subscription…");
  const existing = await client.query(`SELECT id FROM subscriptions WHERE "orgId" = $1`, [ORG_ID]);
  const periodEnd = futureDays(23);
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE subscriptions SET tier = 'ministry_pro', status = 'active', "currentPeriodEnd" = $1, "paymentProvider" = 'flutterwave', "updatedAt" = NOW() WHERE "orgId" = $2`,
      [periodEnd, ORG_ID],
    );
  } else {
    await client.query(
      `INSERT INTO subscriptions (id, "orgId", tier, status, "currentPeriodEnd", "paymentProvider", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [uuid(), ORG_ID, "ministry_pro", "active", periodEnd, "flutterwave"],
    );
  }
  console.log("  ✓ 1 subscription (Ministry Pro — active)");
}

async function seedPayments(client) {
  console.log("  → Seeding payment history…");
  for (const p of PAYMENTS) {
    await client.query(
      `INSERT INTO payments (id, "orgId", "txRef", provider, "providerRef", amount, currency, status, tier, "customerEmail", "paymentMethod", meta, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [uuid(), ORG_ID, `FR-${Date.now()}-${rand(1000,9999)}`, "flutterwave", `FLW-MOCK-${uuid().slice(0,8)}`, p.amount, p.currency, p.status, p.tier, p.email, p.method, JSON.stringify({}), daysAgo(p.daysAgo)],
    );
  }
  console.log(`  ✓ ${PAYMENTS.length} payment records`);
}

async function seedNotifications(client) {
  console.log("  → Seeding notifications…");
  for (const n of NOTIFICATIONS) {
    await client.query(
      `INSERT INTO notifications (id, "userId", "organizationId", title, body, read, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuid(), n.userId, ORG_ID, n.title, n.body, rand(0, 1) === 1, daysAgo(n.daysAgo)],
    );
  }
  console.log(`  ✓ ${NOTIFICATIONS.length} notifications`);
}

async function seedNotificationPrefs(client) {
  console.log("  → Seeding notification preferences…");
  for (const u of TEAM) {
    const existing = await client.query(
      `SELECT id FROM notification_prefs WHERE "organizationId" = $1 AND "userId" = $2`,
      [ORG_ID, u.id],
    );
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO notification_prefs (id, "organizationId", "userId", scheduled, engagement, followers, tips, push, "weeklyReport", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [uuid(), ORG_ID, u.id, true, true, true, rand(0,1) === 1, rand(0,1) === 1, true],
      );
    }
  }
  console.log(`  ✓ ${TEAM.length} notification preference records`);
}

async function seedTickets(client) {
  console.log("  → Seeding support tickets…");
  for (const t of TICKETS) {
    const ticketId = uuid();
    await client.query(
      `INSERT INTO tickets (id, "orgId", "userId", subject, description, status, priority, category, "aiSummary", "createdAt", "updatedAt"${t.status === "resolved" ? ', "resolvedAt"' : ""})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10${t.status === "resolved" ? ", $11" : ""})`,
      [ticketId, ORG_ID, t.userId, t.subject, t.description, t.status, t.priority, t.category, t.aiSummary, daysAgo(t.daysAgo), ...(t.status === "resolved" ? [daysAgo(t.daysAgo - 1)] : [])],
    );
    for (const m of t.messages) {
      const senderRole = m.role === "user" ? "user" : m.role === "admin" ? "admin" : "system";
      const senderName = m.role === "user"
        ? TEAM.find((u) => u.id === t.userId)?.name || "User"
        : m.role === "admin" ? "Support Team" : "System";
      await client.query(
        `INSERT INTO ticket_messages (id, "ticketId", "senderId", "senderRole", "senderName", content, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuid(), ticketId, m.role === "user" ? t.userId : "system", senderRole, senderName, m.content, daysAgo(m.daysAgo)],
      );
    }
  }
  console.log(`  ✓ ${TICKETS.length} tickets with ${TICKETS.reduce((s, t) => s + t.messages.length, 0)} messages`);
}

async function seedBroadcasts(client) {
  console.log("  → Seeding broadcast logs…");
  for (const b of BROADCASTS) {
    const broadcastId = uuid();
    await client.query(
      `INSERT INTO broadcast_log (id, "organizationId", message, "totalRecipients", sent, delivered, read, failed, status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [broadcastId, ORG_ID, b.message, b.total, b.sent, b.delivered, b.read, b.failed, b.status, daysAgo(b.daysAgo)],
    );
    // Seed a handful of recipient records per broadcast
    const recipientCount = Math.min(b.total, 15);
    for (let i = 0; i < recipientCount; i++) {
      const phone = `+23355${rand(1000000, 9999999)}`;
      const statuses = ["sent", "delivered", "delivered", "read", "read", "read"];
      const rStatus = i < 2 ? "failed" : pick(statuses);
      await client.query(
        `INSERT INTO broadcast_recipient (id, "broadcastId", phone, "messageId", status, "failureReason", "sentAt", "deliveredAt", "readAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [uuid(), broadcastId, phone, `BAE5${uuid().slice(0,12).toUpperCase()}`, rStatus, rStatus === "failed" ? "Number not on WhatsApp" : null, daysAgo(b.daysAgo), rStatus !== "failed" ? daysAgo(b.daysAgo) : null, rStatus === "read" ? daysAgo(b.daysAgo) : null, daysAgo(b.daysAgo)],
      );
    }
  }
  console.log(`  ✓ ${BROADCASTS.length} broadcasts with recipient samples`);
}

/* ── Main ────────────────────────────────────────────── */

async function main() {
  console.log("\n🌱 FaithReach Demo Data Seeder\n");
  console.log(`   Org:  ${ORG_ID}`);
  console.log(`   Host: ${DB_OPTS.host}`);
  console.log(`   DB:   ${DB_OPTS.database}`);
  console.log(`   SSL:  ${useSSL}\n`);

  const client = new Client(DB_OPTS);
  await client.connect();

  try {
    // Ensure all required tables exist (some migrations may not have run yet)
    console.log("  → Ensuring tables exist…");
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "organizationId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_org_read"
      ON "notifications" ("userId", "organizationId", "read")
    `);
    console.log("  ✓ Tables verified\n");

    // Clean previous demo data
    console.log("  → Cleaning previous demo data…");
    const demoUserIds = TEAM.map((u) => u.id);
    const oldPostIds = await client.query(`SELECT id FROM post_entity WHERE "createdBy" = ANY($1::text[])`, [demoUserIds]);
    const ids = oldPostIds.rows.map((r) => r.id);
    if (ids.length) {
      await client.query(`DELETE FROM post_metrics WHERE "postId" = ANY($1::text[])`, [ids]);
    }
    await client.query(`DELETE FROM post_entity WHERE "createdBy" = ANY($1::text[])`, [demoUserIds]);
    await client.query(`DELETE FROM series_entity WHERE "createdBy" = $1`, [USER_ID]);
    await client.query(`DELETE FROM notifications WHERE "organizationId" = $1`, [ORG_ID]);
    await client.query(`DELETE FROM notification_prefs WHERE "organizationId" = $1`, [ORG_ID]);
    await client.query(`DELETE FROM payments WHERE "orgId" = $1`, [ORG_ID]);

    // Clean tickets + messages
    const oldTickets = await client.query(`SELECT id FROM tickets WHERE "orgId" = $1`, [ORG_ID]);
    const ticketIds = oldTickets.rows.map((r) => r.id);
    if (ticketIds.length) {
      await client.query(`DELETE FROM ticket_messages WHERE "ticketId" = ANY($1::uuid[])`, [ticketIds]);
      await client.query(`DELETE FROM tickets WHERE "orgId" = $1`, [ORG_ID]);
    }

    // Clean broadcasts + recipients
    const oldBroadcasts = await client.query(`SELECT id FROM broadcast_log WHERE "organizationId" = $1`, [ORG_ID]);
    const broadcastIds = oldBroadcasts.rows.map((r) => r.id);
    if (broadcastIds.length) {
      await client.query(`DELETE FROM broadcast_recipient WHERE "broadcastId" = ANY($1::uuid[])`, [broadcastIds]);
      await client.query(`DELETE FROM broadcast_log WHERE "organizationId" = $1`, [ORG_ID]);
    }
    console.log("  ✓ Cleaned\n");

    // Seed all tables
    await seedUsers(client);
    const postIds = await seedPosts(client);
    await seedMetrics(client, postIds);
    await seedSeries(client);
    await seedPlatforms(client);
    await seedSubscription(client);
    await seedPayments(client);
    await seedNotifications(client);
    await seedNotificationPrefs(client);
    await seedTickets(client);
    await seedBroadcasts(client);
  } finally {
    await client.end();
  }

  console.log("\n✅ Done! All pages now have rich demo data.\n");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
