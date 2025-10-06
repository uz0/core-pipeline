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
  const bullRedisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL;

  if (!bullRedisUrl) {
    console.warn('[BullModule] BULL_REDIS_URL/REDIS_URL not provided. Running without Bull queues.');
    return null;
  }

  // Parse Redis URL to extract connection details
  try {
    const url = new URL(bullRedisUrl);

    const redisConfig: any = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };

    // Add password if present in URL or environment variable
    if (url.password) {
      redisConfig.password = url.password;
    } else if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    // Add username only if explicitly provided (Redis 6+ ACL)
    if (url.username && url.username !== '' && url.username !== 'default') {
      redisConfig.username = url.username;
    }

    // Add error handling to prevent Bull from blocking startup or crashing the app
    redisConfig.lazyConnect = true; // Don't block app startup waiting for Redis
    redisConfig.maxRetriesPerRequest = 0; // Don't retry individual commands
    redisConfig.enableReadyCheck = false;
    redisConfig.enableOfflineQueue = false; // Don't queue commands while disconnected
    redisConfig.retryStrategy = (times: number) => {
      // Only log first 3 attempts to avoid spam
      if (times <= 3) {
        console.warn(`[BullModule] Redis connection attempt ${times} failed`);
      }
      // Stop retrying after 3 attempts
      if (times >= 3) {
        if (times === 3) {
          console.error('[BullModule] Redis unavailable after 3 attempts, stopping retries');
        }
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    };

    return BullModule.forRoot({
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
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
