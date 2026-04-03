import { DataSource } from 'typeorm';
import { PlatformConnection } from './platform-connection.entity.js';
import { BroadcastLog } from './broadcast-log.entity.js';
import { BroadcastRecipient } from './broadcast-recipient.entity.js';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'faithreach_platform',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [PlatformConnection, BroadcastLog, BroadcastRecipient],
  migrationsTableName: 'typeorm_migrations_platform',
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
