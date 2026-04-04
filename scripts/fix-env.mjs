#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_BLOCK = `
# Supabase Database
DB_HOST=aws-1-eu-central-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.szvcfilpjiqdmzndjjds
DB_PASSWORD=Password10$**!!##__
DB_NAME=postgres
DB_SSL=true`;

const services = [
  'post', 'analytics', 'platform-integration', 'notification',
  'scheduler', 'content-planner', 'billing', 'user', 'support'
];

for (const svc of services) {
  const envPath = `services/${svc}/.env`;
  if (!existsSync(envPath)) {
    console.log(`${svc}: no .env file, creating one`);
    writeFileSync(envPath, SUPABASE_BLOCK.trim() + '\n');
    continue;
  }

  let content = readFileSync(envPath, 'utf-8');
  
  if (content.includes('DB_HOST')) {
    // Replace existing DB config
    content = content.replace(/DB_HOST=.*/g, 'DB_HOST=aws-1-eu-central-1.pooler.supabase.com');
    content = content.replace(/DB_USERNAME=.*/g, 'DB_USERNAME=postgres.szvcfilpjiqdmzndjjds');
    content = content.replace(/DB_PASSWORD=.*/g, 'DB_PASSWORD=Password10$**!!##__');
    content = content.replace(/DB_NAME=.*/g, 'DB_NAME=postgres');
    if (!content.includes('DB_SSL')) {
      content += '\nDB_SSL=true\n';
    } else {
      content = content.replace(/DB_SSL=.*/g, 'DB_SSL=true');
    }
    writeFileSync(envPath, content);
    console.log(`${svc}: updated existing DB config to Supabase`);
  } else {
    // Append DB config
    content = content.trimEnd() + '\n' + SUPABASE_BLOCK + '\n';
    writeFileSync(envPath, content);
    console.log(`${svc}: added Supabase DB config`);
  }
}
