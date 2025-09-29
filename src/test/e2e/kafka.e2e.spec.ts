import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from '../../../test/test-app.module';
import { CallRepository } from '../../repositories/call.repository';

describe('Kafka Controller E2E Tests', () => {
  let app: INestApplication;
  let callRepository: CallRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    callRepository = app.get<CallRepository>(CallRepository);
  }, 15000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database - find and delete all calls
    const calls = await callRepository.find();
    if (calls.length > 0) {
      await callRepository.remove(calls);
    }
  });

  describe('POST /api/showcase/kafka/produce', () => {
    it('should produce a message to Kafka', async () => {
      const message = {
        topic: 'test-topic',
        key: 'test-key',
        value: { message: 'test message', timestamp: new Date().toISOString() },
        headers: { 'x-test-header': 'test-value' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/showcase/kafka/produce')
        .send(message)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('topic', 'test-topic');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle invalid message format', async () => {
      const invalidMessage = {
        // Missing required topic field
        value: { message: 'test' },
      };

      await request(app.getHttpServer())
        .post('/api/showcase/kafka/produce')
        .send(invalidMessage)
        .expect(400);
    });
  });

  describe('GET /api/showcase/kafka/messages', () => {
    it('should retrieve all messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/messages')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter messages by topic', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/messages?topic=user-events')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((msg: any) => {
        expect(msg.topic).toBe('user-events');
      });
    });

    it('should filter messages by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/messages?status=processed')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((msg: any) => {
        expect(msg.status).toBe('processed');
      });
    });

    it('should limit number of messages', async () => {
      const limit = 5;
      const response = await request(app.getHttpServer())
        .get(`/api/showcase/kafka/messages?limit=${limit}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('GET /api/showcase/kafka/stats', () => {
    it('should return Kafka statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/stats')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byTopic');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('subscribedTopics');
      expect(response.body.subscribedTopics).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/showcase/calls', () => {
    it('should create a new call', async () => {
      const callData = {
        callerId: 'e2e-caller-001',
        recipientId: 'e2e-recipient-001',
        status: 'initiated',
        metadata: { test: true, source: 'e2e' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/showcase/calls')
        .send(callData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('call');
      expect(response.body.call).toHaveProperty('id');
      expect(response.body.call.callerId).toBe(callData.callerId);
      expect(response.body.call.recipientId).toBe(callData.recipientId);
      expect(response.body.call.metadata).toEqual(callData.metadata);
    });

    it('should handle missing required fields', async () => {
      const invalidCallData = {
        status: 'initiated',
        // Missing callerId and recipientId
      };

      const response = await request(app.getHttpServer())
        .post('/api/showcase/calls')
        .send(invalidCallData)
        .expect(201); // Still creates with null values

      expect(response.body.call.callerId).toBeNull();
      expect(response.body.call.recipientId).toBeNull();
    });
  });

  describe('GET /api/showcase/calls', () => {
    beforeEach(async () => {
      // Create test calls
      const calls = [
        { callerId: 'test1', recipientId: 'rec1', status: 'initiated' },
        { callerId: 'test2', recipientId: 'rec2', status: 'processing' },
        { callerId: 'test3', recipientId: 'rec3', status: 'completed' },
      ];

      for (const call of calls) {
        await callRepository.createCall(call);
      }
    });

    it('should retrieve all calls', async () => {
      const response = await request(app.getHttpServer()).get('/api/showcase/calls').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('calls');
      expect(response.body.calls).toHaveLength(3);
    });

    it('should return calls sorted by createdAt DESC', async () => {
      const response = await request(app.getHttpServer()).get('/api/showcase/calls').expect(200);

      const calls = response.body.calls;
      for (let i = 1; i < calls.length; i++) {
        const prevDate = new Date(calls[i - 1].createdAt);
        const currDate = new Date(calls[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('POST /api/showcase/redis/test', () => {
    it('should test Redis functionality', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/showcase/redis/test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('redisConnected');
      expect(response.body).toHaveProperty('storedValue');
      expect(response.body).toHaveProperty('retrievedValue');
      expect(response.body).toHaveProperty('queueStatus');
      expect(response.body.storedValue).toEqual(response.body.retrievedValue);
    });
  });

  describe('GET /api/showcase/queue/status', () => {
    it('should return queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/queue/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('queueStatus');
      expect(response.body.queueStatus).toHaveProperty('waiting');
      expect(response.body.queueStatus).toHaveProperty('active');
      expect(response.body.queueStatus).toHaveProperty('completed');
      expect(response.body.queueStatus).toHaveProperty('failed');
    });
  });

  describe('POST /api/showcase/kafka/produce-batch', () => {
    it('should produce multiple messages', async () => {
      const batchData = {
        topic: 'batch-test',
        messages: [
          { key: 'msg1', value: { data: 'test1' } },
          { key: 'msg2', value: { data: 'test2' } },
          { key: 'msg3', value: { data: 'test3' } },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/showcase/kafka/produce-batch')
        .send(batchData)
        .expect(201);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
      response.body.forEach((result: any) => {
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('messageId');
        expect(result).toHaveProperty('topic', 'batch-test');
      });
    });
  });

  describe('POST /api/showcase/kafka/subscribe', () => {
    it('should subscribe to a new topic', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/showcase/kafka/subscribe')
        .send({ topic: 'new-test-topic' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('subscribedTopics');
      expect(response.body.subscribedTopics).toContain('new-test-topic');
    });

    it('should handle duplicate subscription gracefully', async () => {
      // Subscribe first time
      await request(app.getHttpServer())
        .post('/api/showcase/kafka/subscribe')
        .send({ topic: 'duplicate-topic' })
        .expect(200);

      // Subscribe again to same topic
      const response = await request(app.getHttpServer())
        .post('/api/showcase/kafka/subscribe')
        .send({ topic: 'duplicate-topic' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/showcase/kafka/topics', () => {
    it('should return subscribed topics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/topics')
        .expect(200);

      expect(response.body).toHaveProperty('topics');
      expect(response.body.topics).toBeInstanceOf(Array);
      expect(response.body.topics.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/showcase/kafka/messages/:id', () => {
    it('should return 404 for non-existent message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/showcase/kafka/messages/non-existent-id')
        .expect(404);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent call creations', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/api/showcase/calls')
            .send({
              callerId: `concurrent-caller-${i}`,
              recipientId: `concurrent-recipient-${i}`,
              status: 'initiated',
            }),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      const allCalls = await callRepository.findAllCalls();
      expect(allCalls.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent message production', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/api/showcase/kafka/produce')
            .send({
              topic: 'concurrent-test',
              key: `key-${i}`,
              value: { index: i, timestamp: new Date().toISOString() },
            }),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
