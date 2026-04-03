import { DataSource } from 'typeorm';
import { Subscription } from './subscription/subscription.entity';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'faithreach_billing',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [Subscription],
  migrationsTableName: 'typeorm_migrations_billing',
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
