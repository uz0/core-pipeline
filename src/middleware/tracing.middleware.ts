import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private tracer = trace.getTracer('core-pipeline');

  use(req: Request, res: Response, next: NextFunction) {
    const span = this.tracer.startSpan(`${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.originalUrl,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.user_agent': req.get('user-agent'),
      },
    });

    const ctx = trace.setSpan(context.active(), span);

    context.with(ctx, () => {
      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        span.setAttribute('http.response.size', res.get('content-length') || 0);

        if (res.statusCode >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
      });

      next();
    });
  }
}
