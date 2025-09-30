import { Module, MiddlewareConsumer, NestModule, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { AppController } from './controllers/app.controller';
import { MetricsController } from './controllers/metrics.controller';
import { ShowcaseController } from './controllers/showcase.controller';
import { LoggerService } from './services/logger.service';
import { MetricsService } from './services/metrics.service';
import { TracingMiddleware } from './middleware/tracing.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { MetricsMiddleware } from './middleware/metrics.middleware';
import { KafkaModule } from './kafka/kafka.module';
import { getDatabaseConfig } from './config/database.config';
import configuration from './config/configuration';

// Helper function to conditionally create BullModule import
function createBullModuleImport(): DynamicModule | null {
  console.log('=== BullModule Configuration ===');
  const bullRedisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL;

  console.log(`BULL_REDIS_URL: ${process.env.BULL_REDIS_URL ? 'SET' : 'NOT SET'}`);
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);
  console.log(`Using: ${bullRedisUrl ? 'value available' : 'NO VALUE'}`);

  if (!bullRedisUrl) {
    console.warn('[BullModule] BULL_REDIS_URL/REDIS_URL not provided. Running without Bull queues.');
    return null;
  }

  // Parse Redis URL to extract connection details
  try {
    console.log('[BullModule] Parsing Redis URL...');
    const sanitized = bullRedisUrl.replace(/:[^:@]+@/, ':***@');
    console.log(`[BullModule] URL to parse: ${sanitized}`);

    const url = new URL(bullRedisUrl);
    console.log(`[BullModule] URL parsed - protocol: ${url.protocol}, hostname: ${url.hostname}, port: ${url.port}`);
    console.log(`[BullModule] URL credentials - username: ${url.username || '(empty)'}, password: ${url.password ? url.password.length + ' chars' : '(empty)'}`);

    const redisConfig: any = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };

    // Add password if present in URL
    if (url.password) {
      redisConfig.password = url.password;
      console.log('[BullModule] ✓ Redis password configured from URL');
    } else {
      console.warn('[BullModule] ✗ No password in URL');
    }

    // Add username if present in URL (Redis 6+)
    if (url.username && url.username !== 'default') {
      redisConfig.username = url.username;
      console.log(`[BullModule] ✓ Redis username configured: ${url.username}`);
    } else {
      console.log(`[BullModule] Username: ${url.username || '(none)'} - using default`);
    }

    console.log(`[BullModule] === Final Config ===`);
    console.log(`[BullModule]   host: ${redisConfig.host}`);
    console.log(`[BullModule]   port: ${redisConfig.port}`);
    console.log(`[BullModule]   username: ${redisConfig.username || '(default)'}`);
    console.log(`[BullModule]   hasPassword: ${!!redisConfig.password}`);

    console.log('[BullModule] Creating BullModule.forRoot()...');
    return BullModule.forRoot({
      redis: redisConfig,
    });
  } catch (error) {
    console.error('[BullModule] ✗ Failed to parse BULL_REDIS_URL:', error.message);
    console.error('[BullModule] Stack:', error.stack);
    return null;
  }
}

const bullModule = createBullModuleImport();

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ...(bullModule ? [bullModule] : []),
    TerminusModule,
    KafkaModule,
  ],
  controllers: [AppController, HealthController, MetricsController, ShowcaseController],
  providers: [LoggerService, MetricsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware, TracingMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
