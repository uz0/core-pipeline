import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RedisController (e2e)', () => {
  let app: INestApplication;
  const testKeys: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    // Clean up test keys
    for (const key of testKeys) {
      await request(app.getHttpServer()).delete(`/api/redis/cache/${encodeURIComponent(key)}`);
    }
    await app.close();
  });

  describe('/api/redis/health (GET)', () => {
    it('should check Redis health', async () => {
      const response = await request(app.getHttpServer()).get('/api/redis/health').expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.connected).toBe('boolean');
    });
  });

  describe('/api/redis/cache (POST)', () => {
    it('should store data in cache without TTL', async () => {
      const testKey = `test:e2e:${Date.now()}`;
      testKeys.push(testKey);

      const data = {
        key: testKey,
        value: { test: 'data', timestamp: new Date().toISOString() },
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send(data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data cached successfully');
      expect(response.body.key).toBe(testKey);
      expect(response.body.ttl).toBeUndefined();
    });

    it('should store data in cache with TTL', async () => {
      const testKey = `test:e2e:ttl:${Date.now()}`;
      testKeys.push(testKey);

      const data = {
        key: testKey,
        value: { test: 'data with ttl' },
        ttl: 60,
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send(data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.ttl).toBe(60);
    });

    it('should handle complex nested data', async () => {
      const testKey = `test:e2e:complex:${Date.now()}`;
      testKeys.push(testKey);

      const data = {
        key: testKey,
        value: {
          user: {
            id: '123',
            name: 'Test User',
            metadata: {
              preferences: ['a', 'b', 'c'],
              settings: {
                theme: 'dark',
                notifications: true,
              },
            },
          },
          timestamp: new Date().toISOString(),
        },
        ttl: 120,
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send(data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.key).toBe(testKey);
    });
  });

  describe('/api/redis/cache/:key (GET)', () => {
    it('should retrieve cached data', async () => {
      const testKey = `test:e2e:get:${Date.now()}`;
      testKeys.push(testKey);
      const testValue = { test: 'retrieve', id: 123 };

      // First store the data
      await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          key: testKey,
          value: testValue,
        })
        .expect(201);

      // Then retrieve it
      const response = await request(app.getHttpServer())
        .get(`/api/redis/cache/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.key).toBe(testKey);
      expect(response.body.data).toEqual(testValue);
    });

    it('should return not found for non-existent key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/redis/cache/non-existent-key')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Key not found');
    });
  });

  describe('/api/redis/cache/:key (DELETE)', () => {
    it('should delete cached data', async () => {
      const testKey = `test:e2e:delete:${Date.now()}`;

      // First store the data
      await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          key: testKey,
          value: { test: 'delete' },
        })
        .expect(201);

      // Delete it
      await request(app.getHttpServer())
        .delete(`/api/redis/cache/${encodeURIComponent(testKey)}`)
        .expect(204);

      // Verify it's gone
      const response = await request(app.getHttpServer())
        .get(`/api/redis/cache/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Key not found');
    });
  });

  describe('/api/redis/exists/:key (GET)', () => {
    it('should check if key exists', async () => {
      const testKey = `test:e2e:exists:${Date.now()}`;
      testKeys.push(testKey);

      // Store data first
      await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          key: testKey,
          value: { test: 'exists' },
        })
        .expect(201);

      // Check existence
      const response = await request(app.getHttpServer())
        .get(`/api/redis/exists/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.body.key).toBe(testKey);
      expect(response.body.exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/redis/exists/non-existent-key-123')
        .expect(200);

      expect(response.body.exists).toBe(false);
    });
  });

  describe('/api/redis/pubsub/publish (POST)', () => {
    it('should publish message to channel', async () => {
      const message = {
        channel: 'test-channel',
        message: {
          event: 'test-event',
          data: {
            id: 123,
            timestamp: new Date().toISOString(),
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/pubsub/publish')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.channel).toBe('test-channel');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should publish simple string message', async () => {
      const message = {
        channel: 'notifications',
        message: 'Simple notification message',
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/pubsub/publish')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.channel).toBe('notifications');
    });
  });

  describe('/api/redis/pubsub/subscribe/:channel (POST)', () => {
    it('should subscribe to channel', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/redis/pubsub/subscribe/test-events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.channel).toBe('test-events');
      expect(response.body.message).toContain('Subscribed');
    });
  });

  describe('/api/redis/queue/status (GET)', () => {
    it('should get queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/redis/queue/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.queueStatus).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      const status = response.body.queueStatus;
      expect(status).toHaveProperty('waiting');
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });
  });

  describe('/api/redis/queue (POST)', () => {
    it('should add job to queue', async () => {
      const jobData = {
        data: {
          callerId: 'user-123',
          recipientId: 'user-456',
          metadata: {
            source: 'e2e-test',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/queue')
        .send(jobData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Job added to queue');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should add job with options', async () => {
      const jobData = {
        data: {
          callerId: 'user-789',
          recipientId: 'user-012',
        },
        options: {
          delay: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/redis/queue')
        .send(jobData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('/api/redis/test (POST)', () => {
    it('should run comprehensive Redis test', async () => {
      const response = await request(app.getHttpServer()).post('/api/redis/test').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tests).toBeDefined();
      expect(response.body.tests.connection).toBeDefined();
      expect(response.body.tests.cache).toBeDefined();
      expect(response.body.tests.pubsub).toBeDefined();
      expect(response.body.tests.queue).toBeDefined();
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent cache operations', async () => {
      const promises = [];

      for (let i = 0; i < 20; i++) {
        const key = `test:e2e:concurrent:${Date.now()}-${i}`;
        testKeys.push(key);

        promises.push(
          request(app.getHttpServer())
            .post('/api/redis/cache')
            .send({
              key,
              value: { id: i, timestamp: Date.now() },
              ttl: 60,
            }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle concurrent pub/sub operations', async () => {
      const publishPromises = [];

      for (let i = 0; i < 10; i++) {
        publishPromises.push(
          request(app.getHttpServer())
            .post('/api/redis/pubsub/publish')
            .send({
              channel: 'test-concurrent',
              message: { id: i, timestamp: Date.now() },
            }),
        );
      }

      const responses = await Promise.all(publishPromises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid data types', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          key: 123, // Should be string
          value: 'test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          value: 'test', // Missing key
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('TTL expiration', () => {
    it('should expire key after TTL', async () => {
      const testKey = `test:e2e:ttl-expire:${Date.now()}`;

      // Store with 1 second TTL
      await request(app.getHttpServer())
        .post('/api/redis/cache')
        .send({
          key: testKey,
          value: { test: 'expire' },
          ttl: 1,
        })
        .expect(201);

      // Verify it exists immediately
      let response = await request(app.getHttpServer())
        .get(`/api/redis/cache/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ test: 'expire' });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify it's gone
      response = await request(app.getHttpServer())
        .get(`/api/redis/cache/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Key not found');
    });
  });
});
