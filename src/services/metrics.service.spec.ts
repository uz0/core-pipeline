import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import * as promClient from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;
  let configService: ConfigService;

  beforeEach(() => {
    // Clear the default registry before each test
    promClient.register.clear();

    configService = {
      get: jest.fn((key) => {
        const config = {
          node_env: 'test',
          'metrics.enabled': true,
        };
        return config[key];
      }),
    } as any;

    service = new MetricsService(configService);
  });

  afterEach(() => {
    // Clear the default registry after each test
    promClient.register.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have metrics methods defined', () => {
    expect(service.getMetrics).toBeDefined();
    expect(service.recordHttpRequest).toBeDefined();
    expect(service.recordHttpError).toBeDefined();
  });

  it('should return metrics string', async () => {
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('# HELP');
  });
});
