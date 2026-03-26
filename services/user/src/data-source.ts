import { DataSource } from 'typeorm';
import { User } from './user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'faithreach_user',
  entities: [User],
  synchronize: true,
});
