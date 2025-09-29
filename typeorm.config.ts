import { DataSource } from 'typeorm';
import { Call } from './src/entities/call.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'core_pipeline',
  entities: [Call],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});