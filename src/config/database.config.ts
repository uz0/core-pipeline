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

  // Use SQLite for minimal development mode (no Docker required)
  if (process.env.MINIMAL_DEV === 'true') {
    return {
      type: 'sqlite',
      database: './dev.sqlite',
      entities: [Call],
      synchronize: true,
      logging: process.env.DB_LOGGING === 'true',
      migrations: [__dirname + '/../../migrations/*.{ts,js}'],
      migrationsTableName: 'migrations',
    };
  }

  // Determine database name based on environment
  const dbName =
    process.env.DB_DATABASE ||
    (process.env.NODE_ENV === 'production' ? 'core_pipeline' : 'core_pipeline_dev');

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: dbName,
    entities: [Call],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.DB_LOGGING === 'true',
    migrations: [__dirname + '/../../migrations/*.{ts,js}'],
    migrationsTableName: 'migrations',
    migrationsRun: process.env.NODE_ENV !== 'production', // Auto-run in dev, manual in prod
    retryAttempts: 3,
    retryDelay: 3000,
  };
};
