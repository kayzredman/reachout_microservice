import pg from "pg";
import { readFileSync } from "fs";
const envContent = readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}
const client = new pg.Client({
  host: env.DB_HOST, port: 5432,
  user: env.DB_USERNAME, password: env.DB_PASSWORD,
  database: env.DB_NAME, ssl: { rejectUnauthorized: false }
});
await client.connect();
const tables = ["post_entity", "post_metrics", "series_entity", "platform_connection"];
for (const t of tables) {
  const r = await client.query("SELECT COUNT(*) FROM " + t);
  console.log(t + ": " + r.rows[0].count + " rows");
}
await client.end();
