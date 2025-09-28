import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const route = req.route?.path || req.path || 'unknown';

      this.metricsService.recordHttpRequest(req.method, route, res.statusCode, duration);

      if (res.statusCode >= 400) {
        this.metricsService.recordHttpError(
          req.method,
          route,
          res.statusCode >= 500 ? 'server_error' : 'client_error',
        );
      }
    });

    next();
  }
}
