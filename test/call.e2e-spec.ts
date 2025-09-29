import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CallRepository } from '../src/repositories/call.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Call } from '../src/entities/call.entity';

describe('CallController (e2e)', () => {
  let app: INestApplication;
  let callRepository: CallRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    callRepository = moduleFixture.get<CallRepository>(getRepositoryToken(Call));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await callRepository.delete({});
  });

  describe('/api/calls (GET)', () => {
    it('should return empty array when no calls exist', async () => {
      const response = await request(app.getHttpServer()).get('/api/calls').expect(200);

      expect(response.body).toEqual({
        success: true,
        count: 0,
        calls: [],
      });
    });

    it('should return all calls', async () => {
      // Create test calls
      const call1 = await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      const call2 = await callRepository.createCall({
        callerId: 'user-3',
        recipientId: 'user-4',
        status: 'completed',
      });

      const response = await request(app.getHttpServer()).get('/api/calls').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.calls).toHaveLength(2);
    });

    it('should filter calls by status', async () => {
      await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      await callRepository.createCall({
        callerId: 'user-3',
        recipientId: 'user-4',
        status: 'completed',
      });

      const response = await request(app.getHttpServer())
        .get('/api/calls?status=completed')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.calls[0].status).toBe('completed');
    });

    it('should limit results', async () => {
      // Create 5 calls
      for (let i = 0; i < 5; i++) {
        await callRepository.createCall({
          callerId: `user-${i}`,
          recipientId: `recipient-${i}`,
          status: 'initiated',
        });
      }

      const response = await request(app.getHttpServer()).get('/api/calls?limit=3').expect(200);

      expect(response.body.calls).toHaveLength(3);
    });

    it('should handle pagination with offset', async () => {
      // Create 10 calls
      for (let i = 0; i < 10; i++) {
        await callRepository.createCall({
          callerId: `user-${i}`,
          recipientId: `recipient-${i}`,
          status: 'initiated',
        });
      }

      const response = await request(app.getHttpServer()).get('/api/calls?offset=5').expect(200);

      expect(response.body.calls).toHaveLength(5);
    });
  });

  describe('/api/calls/stats (GET)', () => {
    it('should return call statistics', async () => {
      // Create test calls with different statuses
      await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      const completedCall = await callRepository.createCall({
        callerId: 'user-3',
        recipientId: 'user-4',
        status: 'completed',
      });
      await callRepository.save({ ...completedCall, duration: 120 });

      await callRepository.createCall({
        callerId: 'user-5',
        recipientId: 'user-6',
        status: 'failed',
      });

      const response = await request(app.getHttpServer()).get('/api/calls/stats').expect(200);

      expect(response.body).toHaveProperty('total', 3);
      expect(response.body.byStatus).toEqual({
        initiated: 1,
        completed: 1,
        failed: 1,
      });
      expect(response.body).toHaveProperty('recentCalls');
      expect(response.body).toHaveProperty('averageDuration');
    });

    it('should handle empty database', async () => {
      const response = await request(app.getHttpServer()).get('/api/calls/stats').expect(200);

      expect(response.body).toEqual({
        total: 0,
        byStatus: {},
        recentCalls: 0,
        averageDuration: 0,
      });
    });
  });

  describe('/api/calls/:id (GET)', () => {
    it('should return call by id', async () => {
      const call = await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      const response = await request(app.getHttpServer()).get(`/api/calls/${call.id}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.call.id).toBe(call.id);
      expect(response.body.call.callerId).toBe('user-1');
    });

    it('should return 404 for non-existent call', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/calls/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Call not found');
    });
  });

  describe('/api/calls (POST)', () => {
    it('should create a new call', async () => {
      const callData = {
        callerId: 'user-123',
        recipientId: 'user-456',
        status: 'initiated',
        metadata: { source: 'test' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/calls')
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Call created successfully');
      expect(response.body.call).toHaveProperty('id');
      expect(response.body.call.callerId).toBe('user-123');
      expect(response.body.call.metadata).toEqual({ source: 'test' });
    });

    it('should create call with minimal data', async () => {
      const callData = {
        callerId: 'user-123',
        recipientId: 'user-456',
      };

      const response = await request(app.getHttpServer())
        .post('/api/calls')
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.call.status).toBe('pending');
    });
  });

  describe('/api/calls/:id (PATCH)', () => {
    it('should update existing call', async () => {
      const call = await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      const updateData = {
        status: 'completed',
        duration: 300,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/calls/${call.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.call.status).toBe('completed');
      expect(response.body.call.duration).toBe(300);
    });

    it('should return 404 when updating non-existent call', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/calls/123e4567-e89b-12d3-a456-426614174000')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Call not found');
    });
  });

  describe('/api/calls/:id/status/:status (PATCH)', () => {
    it('should update call status', async () => {
      const call = await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/calls/${call.id}/status/completed`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Call status updated successfully');
      expect(response.body.call.status).toBe('completed');
    });
  });

  describe('/api/calls/:id (DELETE)', () => {
    it('should delete existing call', async () => {
      const call = await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      await request(app.getHttpServer()).delete(`/api/calls/${call.id}`).expect(204);

      const deletedCall = await callRepository.findCallById(call.id);
      expect(deletedCall).toBeNull();
    });

    it('should return 404 when deleting non-existent call', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/calls/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Call not found');
    });
  });

  describe('/api/calls/status/:status (GET)', () => {
    it('should get calls by status', async () => {
      await callRepository.createCall({
        callerId: 'user-1',
        recipientId: 'user-2',
        status: 'initiated',
      });

      await callRepository.createCall({
        callerId: 'user-3',
        recipientId: 'user-4',
        status: 'completed',
      });

      await callRepository.createCall({
        callerId: 'user-5',
        recipientId: 'user-6',
        status: 'completed',
      });

      const response = await request(app.getHttpServer())
        .get('/api/calls/status/completed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.status).toBe('completed');
      expect(response.body.calls).toHaveLength(2);
    });
  });

  describe('/api/calls/recent/:limit (GET)', () => {
    it('should get recent calls with limit', async () => {
      // Create 10 calls with delays
      for (let i = 0; i < 10; i++) {
        await callRepository.createCall({
          callerId: `user-${i}`,
          recipientId: `recipient-${i}`,
          status: 'initiated',
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const response = await request(app.getHttpServer()).get('/api/calls/recent/5').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(5);
      expect(response.body.calls).toHaveLength(5);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent call creation', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/calls')
            .send({
              callerId: `user-${i}`,
              recipientId: `recipient-${i}`,
              status: 'initiated',
            }),
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      const allCalls = await callRepository.findAllCalls();
      expect(allCalls).toHaveLength(10);
    });
  });

  describe('Performance tests', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Create 100 calls
      const calls = [];
      for (let i = 0; i < 100; i++) {
        calls.push({
          callerId: `user-${i}`,
          recipientId: `recipient-${i}`,
          status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'failed' : 'initiated',
          duration: i % 3 === 0 ? Math.floor(Math.random() * 300) : null,
        });
      }

      await callRepository.save(calls);

      const startTime = Date.now();

      const response = await request(app.getHttpServer()).get('/api/calls/stats').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body.total).toBe(100);
    });
  });
});
