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
const r = await client.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`);
for (const row of r.rows) console.log(row.tablename);
await client.end();
