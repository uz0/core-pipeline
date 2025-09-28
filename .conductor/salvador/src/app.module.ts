import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  levelFirst: true,
                  translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
                },
              }
            : undefined,
        autoLogging: true,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
            remotePort: req.remotePort,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
    HealthModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}