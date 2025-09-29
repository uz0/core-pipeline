import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';

describe('ShowcaseController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Wait for services to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/showcase (GET)', () => {
    it('should get showcase scenarios list', async () => {
      const response = await request(app.getHttpServer()).get('/api/showcase').expect(200);

      expect(response.body.message).toBe('Available showcase scenarios');
      expect(response.body.scenarios).toBeDefined();
      expect(Array.isArray(response.body.scenarios)).toBe(true);
      expect(response.body.scenarios).toContain('basic-flow');
      expect(response.body.scenarios).toContain('kafka-integration');
      expect(response.body.scenarios).toContain('redis-operations');
      expect(response.body.scenarios).toContain('full-integration');
    });
  });

  describe('/api/showcase/test/basic-flow (POST)', () => {
    it('should run basic flow showcase', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/showcase/test/basic-flow')
        .expect(200);

      expect(response.body.scenario).toBe('basic-flow');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.createCall).toBeDefined();
      expect(results.createCall.success).toBe(true);
      expect(results.updateStatus).toBeDefined();
      expect(results.getAllCalls).toBeDefined();
      expect(results.stats).toBeDefined();
    });
  });

  describe('/api/showcase/kafka-integration (GET)', () => {
    it('should run Kafka integration showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka-integration')
        .expect(200);

      expect(response.body.scenario).toBe('kafka-integration');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.singleMessage).toBeDefined();
      expect(results.singleMessage.success).toBe(true);
      expect(results.batchMessages).toBeDefined();
      expect(Array.isArray(results.batchMessages)).toBe(true);
      expect(results.kafkaStats).toBeDefined();
      expect(results.consumedMessages).toBeDefined();
    });
  });

  describe('/api/showcase/redis-operations (GET)', () => {
    it('should run Redis operations showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/redis-operations')
        .expect(200);

      expect(response.body.scenario).toBe('redis-operations');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.healthCheck).toBeDefined();
      expect(results.healthCheck.connected).toBeDefined();
      expect(results.storeData).toBeDefined();
      expect(results.retrieveData).toBeDefined();
      expect(results.publishMessage).toBeDefined();
      expect(results.queueJob).toBeDefined();
      expect(results.queueStatus).toBeDefined();
    });
  });

  describe('/api/showcase/batch-processing (GET)', () => {
    it('should run batch processing showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/batch-processing')
        .expect(200);

      expect(response.body.scenario).toBe('batch-processing');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.callsCreated).toBeDefined();
      expect(Array.isArray(results.callsCreated)).toBe(true);
      expect(results.messagesProduced).toBeDefined();
      expect(Array.isArray(results.messagesProduced)).toBe(true);
      expect(results.cacheOperations).toBeDefined();
      expect(results.finalStats).toBeDefined();
    }, 10000); // Increase timeout for batch operations
  });

  describe('/api/showcase/error-recovery (GET)', () => {
    it('should run error recovery showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/error-recovery')
        .expect(200);

      expect(response.body.scenario).toBe('error-recovery');
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.invalidCallAttempt).toBeDefined();
      expect(results.nonExistentCall).toBeDefined();
      expect(results.nonExistentCall.success).toBe(false);
      expect(results.nonExistentCache).toBeDefined();
      expect(results.nonExistentCache.success).toBe(false);
      expect(results.recoveryActions).toBeDefined();
    });
  });

  describe('/api/showcase/performance-test (GET)', () => {
    it('should run performance test showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/performance-test')
        .expect(200);

      expect(response.body.scenario).toBe('performance-test');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.totalOperations).toBeDefined();
      expect(results.totalOperations).toBeGreaterThan(0);
      expect(results.elapsedTime).toBeDefined();
      expect(results.operationsPerSecond).toBeDefined();
      expect(results.breakdown).toBeDefined();
      expect(results.breakdown.calls).toBeDefined();
      expect(results.breakdown.kafka).toBeDefined();
      expect(results.breakdown.redis).toBeDefined();
    }, 15000); // Increase timeout for performance test
  });

  describe('/api/showcase/full-integration (GET)', () => {
    it('should run full integration showcase', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/full-integration')
        .expect(200);

      expect(response.body.scenario).toBe('full-integration');
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();

      const results = response.body.results;
      expect(results.step1_createCall).toBeDefined();
      expect(results.step2_produceEvent).toBeDefined();
      expect(results.step3_cacheCall).toBeDefined();
      expect(results.step4_publishNotification).toBeDefined();
      expect(results.step5_queueProcessing).toBeDefined();
      expect(results.step6_updateStatus).toBeDefined();
      expect(results.step7_finalVerification).toBeDefined();
    }, 10000);
  });

  describe('/api/showcase/run-all (GET)', () => {
    it('should run all showcases', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/run-all')
        .timeout(30000)
        .expect(200);

      expect(response.body.message).toBe('All showcase scenarios completed');
      expect(response.body.totalScenarios).toBeGreaterThan(0);
      expect(response.body.successful).toBeGreaterThanOrEqual(0);
      expect(response.body.failed).toBeDefined();
      expect(response.body.results).toBeDefined();
      expect(Object.keys(response.body.results).length).toBeGreaterThan(0);
    }, 30000); // Increase timeout for running all scenarios
  });

  describe('Showcase error handling', () => {
    it('should handle invalid scenario name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/invalid-scenario')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Not Found');
    });
  });

  describe('Showcase concurrency', () => {
    it('should handle concurrent showcase executions', async () => {
      const promises = [
        request(app.getHttpServer()).get('/api/showcase/basic-flow'),
        request(app.getHttpServer()).get('/api/showcase/redis-operations'),
        request(app.getHttpServer()).get('/api/showcase/kafka-integration'),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Showcase data validation', () => {
    it('should ensure data consistency across showcases', async () => {
      // Run basic flow first
      const basicFlow = await request(app.getHttpServer())
        .get('/api/showcase/basic-flow')
        .expect(200);

      const callId = basicFlow.body.results.createCall.call.id;

      // Verify call exists in database through stats
      const stats = await request(app.getHttpServer()).get('/api/calls/stats').expect(200);

      expect(stats.body.total).toBeGreaterThan(0);

      // Run Redis operations and verify caching
      const redisOps = await request(app.getHttpServer())
        .get('/api/showcase/redis-operations')
        .expect(200);

      expect(redisOps.body.success).toBe(true);

      // Verify Kafka integration
      const kafkaIntegration = await request(app.getHttpServer())
        .get('/api/showcase/kafka-integration')
        .expect(200);

      expect(kafkaIntegration.body.success).toBe(true);
    });
  });

  describe('Showcase monitoring', () => {
    it('should track showcase execution metrics', async () => {
      // Run a showcase
      await request(app.getHttpServer()).get('/api/showcase/performance-test').expect(200);

      // Check metrics endpoint
      const metrics = await request(app.getHttpServer()).get('/metrics').expect(200);

      expect(metrics.text).toContain('http_requests_total');
      expect(metrics.text).toContain('http_request_duration_seconds');
    });
  });

  describe('Showcase cleanup', () => {
    it('should properly clean up resources after showcase', async () => {
      // Run a showcase that creates resources
      const response = await request(app.getHttpServer())
        .get('/api/showcase/batch-processing')
        .expect(200);

      const cacheKeys = response.body.results.cacheOperations;

      // Verify resources are accessible
      if (cacheKeys && cacheKeys.length > 0) {
        const firstKey = cacheKeys[0].key;

        // Check if key exists
        const exists = await request(app.getHttpServer())
          .get(`/api/redis/exists/${encodeURIComponent(firstKey)}`)
          .expect(200);

        // Key may or may not exist depending on TTL
        expect(exists.body).toHaveProperty('exists');
      }
    });
  });

  describe('Showcase health integration', () => {
    it('should maintain system health during showcases', async () => {
      // Run intensive showcase
      const showcasePromise = request(app.getHttpServer()).get('/api/showcase/performance-test');

      // Check health during showcase
      await new Promise((resolve) => setTimeout(resolve, 500));

      const health = await request(app.getHttpServer()).get('/health').expect(200);

      expect(health.body.status).toBe('ok');

      // Wait for showcase to complete
      const showcaseResponse = await showcasePromise;
      expect(showcaseResponse.status).toBe(200);
    });
  });
});
