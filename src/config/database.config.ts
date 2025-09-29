import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Call } from '../entities/call.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  // Use SQLite for tests to avoid connection issues
  if (process.env.NODE_ENV === 'test') {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [Call],
      synchronize: true,
      dropSchema: true,
      logging: false,
      retryAttempts: 1,
      retryDelay: 0,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'core_pipeline',
    entities: [Call],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true',
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    retryAttempts: 3,
    retryDelay: 3000,
  };
};
