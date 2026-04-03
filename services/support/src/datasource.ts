import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Ticket } from './tickets/ticket.entity.js';
import { Conversation } from './chat/conversation.entity.js';
import { Message } from './chat/message.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'faithreach_support',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [Ticket, Conversation, Message],
  migrationsTableName: 'typeorm_migrations_support',
  migrations: ['src/migrations/*{.ts,.js}'],
});
