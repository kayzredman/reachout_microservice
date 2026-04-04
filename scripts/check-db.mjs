import pg from 'pg';
const { Client } = pg;

const c = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.szvcfilpjiqdmzndjjds',
  password: 'Password10$**!!##__',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

await c.connect();

const tables = ['post_entity','post_metrics','series_entity','platform_connection','user','notifications','tickets','ticket_messages','payments','subscriptions','broadcast_log','broadcast_recipient'];

for (const t of tables) {
  try {
    const cnt = await c.query(`SELECT count(*) FROM "${t}"`);
    console.log(`${t}: ${cnt.rows[0].count} rows`);
  } catch(e) { console.log(`${t}: ERROR - ${e.message.split('\n')[0]}`); }
}

// Check column names of post_entity
const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='post_entity' ORDER BY ordinal_position`);
console.log('\npost_entity columns:', cols.rows.map(r=>r.column_name));

// Find org column  
const orgCol = cols.rows.find(r => r.column_name.toLowerCase().includes('org'));
if (orgCol) {
  const orgs = await c.query(`SELECT DISTINCT "${orgCol.column_name}" FROM post_entity LIMIT 5`);
  console.log('OrgIds in posts:', orgs.rows);
}

const platCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='platform_connection' ORDER BY ordinal_position`);
console.log('\nplatform_connection columns:', platCols.rows.map(r=>r.column_name));

await c.end();
