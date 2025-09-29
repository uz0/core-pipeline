import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private register: promClient.Registry;
  public httpRequestDuration: promClient.Histogram<string>;
  public httpRequestTotal: promClient.Counter<string>;
  public httpRequestErrors: promClient.Counter<string>;
  private static isInitialized = false;

  constructor(private configService: ConfigService) {
    // Create a new registry for this instance
    this.register = new promClient.Registry();
    this.register.setDefaultLabels({
      app: 'core-pipeline',
      env: this.configService.get('node_env', 'development'),
    });

    // Clear default metrics if running in test environment
    if (process.env.NODE_ENV === 'test') {
      promClient.register.clear();
    }

    // Only register default metrics if not already done
    if (!MetricsService.isInitialized) {
      promClient.collectDefaultMetrics({ register: this.register });
      MetricsService.isInitialized = true;
    }

    // Check if metrics already exist in registry
    const existingDuration = this.register.getSingleMetric('http_request_duration_seconds');
    if (existingDuration) {
      this.httpRequestDuration = existingDuration as promClient.Histogram<string>;
    } else {
      this.httpRequestDuration = new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10],
        registers: [this.register],
      });
    }

    const existingTotal = this.register.getSingleMetric('http_requests_total');
    if (existingTotal) {
      this.httpRequestTotal = existingTotal as promClient.Counter<string>;
    } else {
      this.httpRequestTotal = new promClient.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [this.register],
      });
    }

    const existingErrors = this.register.getSingleMetric('http_request_errors_total');
    if (existingErrors) {
      this.httpRequestErrors = existingErrors as promClient.Counter<string>;
    } else {
      this.httpRequestErrors = new promClient.Counter({
        name: 'http_request_errors_total',
        help: 'Total number of HTTP request errors',
        labelNames: ['method', 'route', 'error_type'],
        registers: [this.register],
      });
    }
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

  // Cleanup method for tests
  static resetForTesting() {
    MetricsService.isInitialized = false;
    promClient.register.clear();
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
