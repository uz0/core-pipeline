import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { AppController } from './controllers/app.controller';
import { MetricsController } from './controllers/metrics.controller';
import { LoggerService } from './services/logger.service';
import { MetricsService } from './services/metrics.service';
import { TracingMiddleware } from './middleware/tracing.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { MetricsMiddleware } from './middleware/metrics.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TerminusModule,
  ],
  controllers: [AppController, HealthController, MetricsController],
  providers: [LoggerService, MetricsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware, TracingMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}