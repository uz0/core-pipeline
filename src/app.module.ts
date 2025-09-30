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
  const bullRedisUrl = process.env.BULL_REDIS_URL;

  if (!bullRedisUrl) {
    console.log('BULL_REDIS_URL not provided. Running without Bull queues.');
    return null;
  }

  return BullModule.forRoot({
    redis: bullRedisUrl,
  });
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
