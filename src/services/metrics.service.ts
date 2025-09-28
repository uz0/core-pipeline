import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private register: promClient.Registry;
  public httpRequestDuration: promClient.Histogram<string>;
  public httpRequestTotal: promClient.Counter<string>;
  public httpRequestErrors: promClient.Counter<string>;

  constructor(private configService: ConfigService) {
    this.register = new promClient.Registry();
    this.register.setDefaultLabels({
      app: 'core-pipeline',
      env: this.configService.get('node_env'),
    });

    promClient.collectDefaultMetrics({ register: this.register });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10],
    });
    this.register.registerMetric(this.httpRequestDuration);

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });
    this.register.registerMetric(this.httpRequestTotal);

    this.httpRequestErrors = new promClient.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });
    this.register.registerMetric(this.httpRequestErrors);
  }

  onModuleInit() {
    const metricsEnabled = this.configService.get('metrics.enabled');
    if (!metricsEnabled) {
      console.log('Metrics collection disabled');
    }
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration / 1000,
    );
    this.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  recordHttpError(method: string, route: string, errorType: string) {
    this.httpRequestErrors.inc({
      method,
      route,
      error_type: errorType,
    });
  }
}