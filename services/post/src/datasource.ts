import { DataSource } from 'typeorm';
import { PostEntity } from './post.entity';
import { SeriesEntity } from './series.entity';
import { PostMetrics } from './post-metrics.entity';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'faithreach_post',
  entities: [PostEntity, SeriesEntity, PostMetrics],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
