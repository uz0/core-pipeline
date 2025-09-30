import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const userAgent = req.get('user-agent');

      // Skip logging Kubernetes health check probes to reduce noise
      if (userAgent?.includes('kube-probe') && originalUrl.includes('/health')) {
        return;
      }

      this.logger.log({
        message: `HTTP ${method} ${originalUrl}`,
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent,
      });
    });

    next();
  }
}
