import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;
  private readonly httpRequestDuration: client.Histogram<string>;
  private readonly httpRequestTotal: client.Counter<string>;
  private readonly activeConnections: client.Gauge<string>;

  constructor() {
    this.register = new client.Registry();
    
    client.collectDefaultMetrics({ register: this.register });
    
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.activeConnections = new client.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      registers: [this.register],
    });
  }

  onModuleInit() {
    this.register.setDefaultLabels({
      app: 'core-pipeline',
      environment: process.env.NODE_ENV || 'development',
    });
  }

  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestTotal.inc(labels);
  }

  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }
}