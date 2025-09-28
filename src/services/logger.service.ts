import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pino from 'pino';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: pino.Logger;
  private context?: string;

  constructor(private configService?: ConfigService) {
    const level = this.configService?.get('logging.level') || 'info';
    const prettyPrint = this.configService?.get('logging.prettyPrint') || false;

    this.logger = pino({
      level,
      transport: prettyPrint
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      base: {
        service: 'core-pipeline',
        env: this.configService?.get('node_env') || 'development',
      },
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info({ context: context || this.context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context: context || this.context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context: context || this.context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context: context || this.context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context: context || this.context }, message);
  }

  fatal(message: any, context?: string) {
    this.logger.fatal({ context: context || this.context }, message);
  }
}
