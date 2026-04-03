/**
 * seed-demo.mjs
 *
 * Seeds the FaithReach database with realistic demo data for
 * dashboard & analytics marketing screenshots.
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

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ── Demo content ────────────────────────────────────── */

const POSTS = [
  {
    content: "Good morning, church family! ☀️ 'His mercies are new every morning; great is His faithfulness.' — Lamentations 3:23. Start your day knowing you are loved beyond measure.",
    platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"],
    daysAgo: 2,
  },
  {
    content: "🙏 This Sunday's sermon: 'Finding Peace in the Storm' — Join us at 10 AM as Pastor James walks us through how to anchor our faith when life feels uncertain. See you there!",
    platforms: ["Instagram", "Facebook", "WhatsApp", "YouTube"],
    daysAgo: 5,
  },
  {
    content: "Day 7 of our 30-Day Faith Challenge: Write down three things God has done for you this week. Gratitude shifts perspective. Share yours below! 👇 #FaithChallenge #Grateful",
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
    daysAgo: 8,
  },
  {
    content: "'For I know the plans I have for you,' declares the LORD, 'plans to prosper you and not to harm you, plans to give you hope and a future.' — Jeremiah 29:11 🕊️",
    platforms: ["Facebook", "X (Twitter)"],
    daysAgo: 10,
  },
  {
    content: "Our youth group had an AMAZING retreat this weekend! 🎉 42 young people came together for worship, fellowship, and growth. So proud of this next generation! #YouthOnFire",
    platforms: ["Instagram", "Facebook"],
    daysAgo: 12,
  },
  {
    content: "📖 Midweek Bible Study tonight at 7 PM! We're diving into the book of James — practical faith that works. Bring your Bible and a friend!",
    platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"],
    daysAgo: 14,
  },
  {
    content: "TONIGHT! 🎶 Worship Night at FaithReach Church. Doors open at 6:30 PM. Come as you are and experience God's presence in a powerful way.",
    platforms: ["Instagram", "Facebook", "WhatsApp", "YouTube"],
    daysAgo: 16,
  },
  {
    content: "Community outreach update: We packed and delivered 200 food boxes to families in need this month! Thank you to every volunteer who made this possible. 🤝❤️ #ServeOthers",
    platforms: ["Instagram", "Facebook", "X (Twitter)", "WhatsApp", "YouTube"],
    daysAgo: 18,
  },
  {
    content: "'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to Him, and He will make your paths straight.' — Proverbs 3:5-6",
    platforms: ["Facebook", "X (Twitter)"],
    daysAgo: 20,
  },
  {
    content: "Easter is 3 weeks away! 🐣 Invite someone to join you. We're planning something special — you won't want to miss it. Save the date!",
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
    daysAgo: 22,
  },
  {
    content: "Prayer Request Wednesday 🙏 Drop your prayer requests in the comments. Our prayer team reads every single one. You are not alone.",
    platforms: ["Instagram", "Facebook", "WhatsApp"],
    daysAgo: 24,
  },
  {
    content: "Just launched our new podcast! 🎙️ 'Faith Forward' — weekly conversations about living boldly for Christ in everyday life. Link in bio! #FaithForwardPodcast",
    platforms: ["Instagram", "Facebook", "X (Twitter)", "YouTube"],
    daysAgo: 26,
  },
];

const SCHEDULED_POSTS = [
  {
    content: "🌅 Monday Motivation: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.' — Joshua 1:9",
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
    hoursFromNow: 18,
  },
  {
    content: "This Wednesday's Bible study will cover Romans 8 — 'More than conquerors through Him who loved us.' Don't miss it! 📖",
    platforms: ["Instagram", "Facebook"],
    hoursFromNow: 66,
  },
  {
    content: "Volunteer spotlight ✨ Meet Sarah, who has served in our children's ministry for 5 years! Her dedication to the next generation is truly inspiring.",
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
    hoursFromNow: 114,
  },
];

const SERIES = [
  {
    title: "30-Day Faith Challenge",
    theme: "Daily Devotional",
    description: "A month-long journey through daily scripture readings and reflective questions to deepen your relationship with God.",
    status: "Active",
    color: "#8b5cf6",
    totalPosts: 30,
    startDaysAgo: 15,
    endDaysFromNow: 15,
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
  },
  {
    title: "Sunday Sermon Series",
    theme: "Finding Peace",
    description: "A 6-week sermon series exploring how to find God's peace in uncertain times.",
    status: "Active",
    color: "#3b82f6",
    totalPosts: 6,
    startDaysAgo: 21,
    endDaysFromNow: 21,
    platforms: ["Instagram", "Facebook"],
  },
  {
    title: "Easter Campaign",
    theme: "New Life",
    description: "Easter outreach campaign with daily posts building excitement for our Easter celebration.",
    status: "Upcoming",
    color: "#f59e0b",
    totalPosts: 14,
    startDaysFromNow: 7,
    endDaysFromNow: 21,
    platforms: ["Instagram", "Facebook", "X (Twitter)"],
  },
];

/* ── Engagement profile per platform (realistic ranges) ── */

const ENGAGEMENT = {
  Instagram: { impressions: [800, 5500], likes: [40, 320], comments: [5, 45], shares: [8, 55], reach: [600, 4200], views: [100, 900], saves: [5, 35] },
  Facebook:  { impressions: [500, 4000], likes: [25, 200], comments: [10, 60], shares: [15, 80], reach: [400, 3500], views: [50, 500], saves: [3, 20] },
  "X (Twitter)": { impressions: [300, 3000], likes: [10, 150], comments: [3, 30], shares: [5, 90], reach: [250, 2500], views: [30, 400], saves: [2, 15] },
  WhatsApp: { impressions: [200, 1800], likes: [2, 15], comments: [0, 3], shares: [5, 40], reach: [180, 1600], views: [150, 1400], saves: [0, 2], deliveryStatuses: ["delivered", "delivered", "read", "read", "read", "sent"] },
  YouTube: { impressions: [400, 6000], likes: [15, 250], comments: [3, 50], shares: [2, 35], reach: [350, 5000], views: [200, 4500], saves: [1, 20] },
};

/* ── Seed functions ──────────────────────────────────── */

async function seedPosts(client) {
  console.log("  → Seeding posts…");

  const postIds = [];

  for (const p of POSTS) {
    const id = uuid();
    postIds.push({ id, platforms: p.platforms });

    const publishedAt = daysAgo(p.daysAgo);
    const publishResults = p.platforms.map((plat) => ({
      platform: plat,
      status: "published",
      platformPostId: `plat_${uuid().slice(0, 8)}`,
    }));

    await client.query(
      `INSERT INTO post_entity (id, "organizationId", "createdBy", content, platforms, status, "publishResults", "publishedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [id, ORG_ID, USER_ID, p.content, JSON.stringify(p.platforms), "published", JSON.stringify(publishResults), publishedAt, publishedAt],
    );
  }

  // Scheduled posts
  for (const p of SCHEDULED_POSTS) {
    const id = uuid();
    const scheduledAt = futureHours(p.hoursFromNow);
    const publishResults = p.platforms.map((plat) => ({
      platform: plat,
      status: "pending",
    }));

    await client.query(
      `INSERT INTO post_entity (id, "organizationId", "createdBy", content, platforms, status, "publishResults", "scheduledAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [id, ORG_ID, USER_ID, p.content, JSON.stringify(p.platforms), "scheduled", JSON.stringify(publishResults), scheduledAt],
    );
  }

  console.log(`  ✓ ${POSTS.length} published + ${SCHEDULED_POSTS.length} scheduled posts`);
  return postIds;
}

async function seedMetrics(client, postIds) {
  console.log("  → Seeding post metrics…");
  let count = 0;

  for (const { id, platforms } of postIds) {
    // Get publishResults to grab platformPostId
    const res = await client.query(
      `SELECT "publishResults" FROM post_entity WHERE id = $1`,
      [id],
    );
    const publishResults = res.rows[0]?.publishResults || [];

    for (const pr of publishResults) {
      if (pr.status !== "published" || !pr.platformPostId) continue;

      const eng = ENGAGEMENT[pr.platform];
      if (!eng) continue;

      // Insert 3 metric snapshots (simulating hourly polling over time)
      for (let snap = 0; snap < 3; snap++) {
        const impressions = rand(...eng.impressions) + snap * rand(50, 200);
        const likes = rand(...eng.likes) + snap * rand(5, 20);
        const comments = rand(...eng.comments) + snap * rand(1, 5);
        const shares = rand(...eng.shares) + snap * rand(1, 8);
        const reach = rand(...eng.reach) + snap * rand(30, 150);
        const views = rand(...eng.views) + snap * rand(10, 50);
        const saves = rand(...eng.saves) + snap * rand(0, 3);
        const engRate = impressions > 0 ? ((likes + comments + shares) / impressions) : 0;
        const deliveryStatus = eng.deliveryStatuses
          ? eng.deliveryStatuses[rand(0, eng.deliveryStatuses.length - 1)]
          : null;

        await client.query(
          `INSERT INTO post_metrics (id, "postId", platform, "platformPostId", impressions, likes, comments, shares, reach, views, saves, "engagementRate", "deliveryStatus", "fetchedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [uuid(), id, pr.platform, pr.platformPostId, impressions, likes, comments, shares, reach, views, saves, parseFloat(engRate.toFixed(4)), deliveryStatus, hoursAgo((2 - snap) * 24)],
        );
        count++;
      }
    }
  }

  console.log(`  ✓ ${count} metric snapshots`);
}

async function seedSeries(client) {
  console.log("  → Seeding series…");

  for (const s of SERIES) {
    const startDate = s.startDaysAgo
      ? new Date(Date.now() - s.startDaysAgo * 86400000).toISOString().split("T")[0]
      : new Date(Date.now() + s.startDaysFromNow * 86400000).toISOString().split("T")[0];
    const endDate = new Date(Date.now() + s.endDaysFromNow * 86400000).toISOString().split("T")[0];

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
    { platform: "WhatsApp", handle: "+1 (555) 012-3456", connected: true, phoneNumber: "+15550123456", channelId: "120363234567890@newsletter" },
    { platform: "YouTube", handle: "FaithReach Church", connected: true, platformAccountId: "UC_yt_faithreach123" },
  ];

  for (const p of platforms) {
    // Upsert: skip if already exists
    const existing = await client.query(
      `SELECT id FROM platform_connection WHERE "organizationId" = $1 AND platform = $2`,
      [ORG_ID, p.platform],
    );

    if (existing.rows.length > 0) {
      // Update connected status and handle
      await client.query(
        `UPDATE platform_connection SET connected = $1, handle = $2 WHERE id = $3`,
        [p.connected, p.handle, existing.rows[0].id],
      );
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
    // Clean existing demo data (only our seeded data, preserve real data)
    const existingDemoCount = await client.query(
      `SELECT COUNT(*) FROM post_entity WHERE "createdBy" = $1`,
      [USER_ID],
    );
    if (parseInt(existingDemoCount.rows[0].count) > 0) {
      console.log("  → Cleaning previous demo data…");
      const oldPostIds = await client.query(
        `SELECT id FROM post_entity WHERE "createdBy" = $1`,
        [USER_ID],
      );
      const ids = oldPostIds.rows.map((r) => r.id);
      if (ids.length) {
        await client.query(`DELETE FROM post_metrics WHERE "postId" = ANY($1::text[])`, [ids]);
        await client.query(`DELETE FROM post_entity WHERE "createdBy" = $1`, [USER_ID]);
        await client.query(`DELETE FROM series_entity WHERE "createdBy" = $1`, [USER_ID]);
      }
      console.log("  ✓ Cleaned");
    }

    const postIds = await seedPosts(client);
    await seedMetrics(client, postIds);
    await seedSeries(client);
    await seedPlatforms(client);
  } finally {
    await client.end();
  }

  console.log("\n✅ Done! Dashboard & Analytics pages now have demo data.\n");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
