import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTestDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'sqlite',
    database: ':memory:',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: false,
    dropSchema: true,
  };
}
