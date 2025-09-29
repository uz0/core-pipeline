import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('KafkaController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Wait for Kafka to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/kafka/produce (POST)', () => {
    it('should produce message to Kafka topic', async () => {
      const message = {
        topic: 'test-events',
        value: {
          id: '123',
          event: 'test-event',
          timestamp: new Date().toISOString(),
        },
        key: 'test-key',
        headers: {
          source: 'e2e-test',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body.topic).toBe('test-events');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should produce message without optional fields', async () => {
      const message = {
        topic: 'user-events',
        value: {
          userId: '456',
          action: 'login',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.topic).toBe('user-events');
    });

    it('should handle complex nested data', async () => {
      const message = {
        topic: 'system-events',
        value: {
          event: 'system-update',
          metadata: {
            version: '1.2.3',
            features: ['feature1', 'feature2'],
            config: {
              enabled: true,
              settings: {
                timeout: 5000,
                retries: 3,
              },
            },
          },
          timestamp: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send(message)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('/api/kafka (GET)', () => {
    it('should retrieve all consumed messages', async () => {
      // First produce a message
      await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          topic: 'test-events',
          value: { test: 'retrieve' },
        });

      // Wait for consumption
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer()).get('/api/kafka').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter messages by topic', async () => {
      // Produce messages to different topics
      await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          topic: 'user-events',
          value: { userId: '789' },
        });

      await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          topic: 'system-events',
          value: { system: 'test' },
        });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .get('/api/kafka?topic=user-events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((msg) => {
        expect(msg.topic).toBe('user-events');
      });
    });

    it('should filter messages by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kafka?status=processed')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((msg) => {
        expect(msg.status).toBe('processed');
      });
    });

    it('should limit number of messages', async () => {
      const response = await request(app.getHttpServer()).get('/api/kafka?limit=5').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('/api/kafka/stats (GET)', () => {
    it('should get Kafka statistics', async () => {
      const response = await request(app.getHttpServer()).get('/api/kafka/stats').expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byTopic');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('subscribedTopics');
      expect(Array.isArray(response.body.subscribedTopics)).toBe(true);
    });
  });

  describe('/api/kafka/topics (GET)', () => {
    it('should get subscribed topics', async () => {
      const response = await request(app.getHttpServer()).get('/api/kafka/topics').expect(200);

      expect(response.body).toHaveProperty('topics');
      expect(Array.isArray(response.body.topics)).toBe(true);
      expect(response.body.topics.length).toBeGreaterThan(0);
    });
  });

  describe('/api/kafka/:id (GET)', () => {
    it('should get message by ID', async () => {
      // First produce a message and get its ID
      const produceResponse = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          topic: 'test-events',
          value: { test: 'getById' },
        })
        .expect(201);

      const messageId = produceResponse.body.messageId;

      const response = await request(app.getHttpServer())
        .get(`/api/kafka/${messageId}`)
        .expect(200);

      expect(response.body.id).toBe(messageId);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kafka/non-existent-id')
        .expect(200);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBe('Message not found');
    });
  });

  describe('/api/kafka/produce-batch (POST)', () => {
    it('should produce multiple messages', async () => {
      const batchData = {
        topic: 'batch-events',
        messages: [
          { value: { id: 1, data: 'first' }, key: 'key-1' },
          { value: { id: 2, data: 'second' }, key: 'key-2' },
          { value: { id: 3, data: 'third' }, key: 'key-3' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce-batch')
        .send(batchData)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      response.body.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result).toHaveProperty('messageId');
      });
    });

    it('should handle batch with headers', async () => {
      const batchData = {
        topic: 'batch-events',
        messages: [
          {
            value: { id: 1 },
            headers: { source: 'test', version: '1.0' },
          },
          {
            value: { id: 2 },
            headers: { source: 'test', version: '1.1' },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce-batch')
        .send(batchData)
        .expect(201);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('/api/kafka/subscribe (POST)', () => {
    it('should subscribe to new topic', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kafka/subscribe')
        .send({ topic: 'new-test-topic' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Subscribed to topic: new-test-topic');
      expect(response.body.subscribedTopics).toContain('new-test-topic');
    });

    it('should handle duplicate subscription', async () => {
      // Subscribe first time
      await request(app.getHttpServer())
        .post('/api/kafka/subscribe')
        .send({ topic: 'duplicate-topic' })
        .expect(200);

      // Subscribe again
      const response = await request(app.getHttpServer())
        .post('/api/kafka/subscribe')
        .send({ topic: 'duplicate-topic' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('/api/kafka/calls (GET)', () => {
    it('should get all calls from database', async () => {
      const response = await request(app.getHttpServer()).get('/api/kafka/calls').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('calls');
      expect(Array.isArray(response.body.calls)).toBe(true);
    });
  });

  describe('/api/kafka/calls (POST)', () => {
    it('should create call and integrate with Redis', async () => {
      const callData = {
        callerId: 'kafka-user-1',
        recipientId: 'kafka-user-2',
        status: 'initiated',
        metadata: { source: 'kafka-e2e' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/kafka/calls')
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.call).toHaveProperty('id');
      expect(response.body.call.callerId).toBe('kafka-user-1');
    });
  });

  describe('/api/kafka/redis/test (POST)', () => {
    it('should test Redis functionality', async () => {
      const response = await request(app.getHttpServer()).post('/api/kafka/redis/test').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.redisConnected).toBeDefined();
      expect(response.body).toHaveProperty('storedValue');
      expect(response.body).toHaveProperty('retrievedValue');
      expect(response.body).toHaveProperty('queueStatus');
    });
  });

  describe('/api/kafka/queue/status (GET)', () => {
    it('should get queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kafka/queue/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.queueStatus).toBeDefined();
      expect(response.body.queueStatus).toHaveProperty('waiting');
      expect(response.body.queueStatus).toHaveProperty('active');
      expect(response.body.queueStatus).toHaveProperty('completed');
      expect(response.body.queueStatus).toHaveProperty('failed');
    });
  });

  describe('Concurrent Kafka operations', () => {
    it('should handle concurrent message production', async () => {
      const promises = [];

      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/kafka/produce')
            .send({
              topic: 'concurrent-test',
              value: { id: i, timestamp: Date.now() },
              key: `key-${i}`,
            }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [];

      // Mix of produce, get stats, and get topics
      for (let i = 0; i < 10; i++) {
        if (i % 3 === 0) {
          operations.push(
            request(app.getHttpServer())
              .post('/api/kafka/produce')
              .send({
                topic: 'mixed-test',
                value: { id: i },
              }),
          );
        } else if (i % 3 === 1) {
          operations.push(request(app.getHttpServer()).get('/api/kafka/stats'));
        } else {
          operations.push(request(app.getHttpServer()).get('/api/kafka/topics'));
        }
      }

      const responses = await Promise.all(operations);

      responses.forEach((response) => {
        expect(response.status).toBeLessThanOrEqual(201);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid topic name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          topic: '',
          value: { test: 'data' },
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send({
          value: { test: 'data' },
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should handle invalid batch data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce-batch')
        .send({
          topic: 'test',
          messages: 'not-an-array',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('Performance tests', () => {
    it('should handle large message payloads', async () => {
      const largeData = {
        topic: 'performance-test',
        value: {
          id: 'perf-test',
          data: Array(1000)
            .fill(null)
            .map((_, i) => ({
              index: i,
              value: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
            })),
        },
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api/kafka/produce')
        .send(largeData)
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle rapid successive messages', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await request(app.getHttpServer())
          .post('/api/kafka/produce')
          .send({
            topic: 'rapid-test',
            value: { id: i, timestamp: Date.now() },
          })
          .expect(201);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(10000); // Should complete 50 messages within 10 seconds
    });
  });
});
