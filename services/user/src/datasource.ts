import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'faithreach_user',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
