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
    console.log('BULL_REDIS_URL/REDIS_URL not provided. Running without Bull queues.');
    return null;
  }

  // Parse Redis URL to extract connection details
  try {
    const url = new URL(bullRedisUrl);
    const redisConfig: any = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };

    // Add password if present in URL
    if (url.password) {
      redisConfig.password = url.password;
      console.log('[BullModule] Redis password configured from URL');
    }

    // Add username if present in URL (Redis 6+)
    if (url.username && url.username !== 'default') {
      redisConfig.username = url.username;
      console.log(`[BullModule] Redis username configured: ${url.username}`);
    }

    console.log(`[BullModule] Initializing with Redis: host=${redisConfig.host}, port=${redisConfig.port}, hasPassword=${!!redisConfig.password}, username=${redisConfig.username || 'default'}`);

    return BullModule.forRoot({
      redis: redisConfig,
    });
  } catch (error) {
    console.error('[BullModule] Failed to parse BULL_REDIS_URL:', error.message);
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
