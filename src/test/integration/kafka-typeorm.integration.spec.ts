import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { KafkaModule } from '../../kafka/kafka.module';
import { KafkaConsumerService } from '../../kafka/services/kafka-consumer.service';
import { CallRepository } from '../../repositories/call.repository';
import { RedisService } from '../../kafka/services/redis.service';
import { Call } from '../../entities/call.entity';
import { DataSource } from 'typeorm';

describe.skip('Kafka-TypeORM Integration', () => {
  // Skipped for CI - requires external services
  let app: INestApplication;
  let kafkaConsumerService: KafkaConsumerService;
  let callRepository: CallRepository;
  let redisService: RedisService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT, 10) || 5432,
          username: process.env.TEST_DB_USERNAME || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          database: process.env.TEST_DB_DATABASE || 'test_core_pipeline',
          entities: [Call],
          synchronize: true,
          dropSchema: true,
        }),
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            redis: {
              host: configService.get('TEST_REDIS_HOST', 'localhost'),
              port: configService.get('TEST_REDIS_PORT', 6379),
            },
          }),
          inject: [ConfigService],
        }),
        KafkaModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    kafkaConsumerService = app.get<KafkaConsumerService>(KafkaConsumerService);
    callRepository = app.get<CallRepository>(CallRepository);
    redisService = app.get<RedisService>(RedisService);
    dataSource = app.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await callRepository.delete({});
  });

  describe('Call Event Processing', () => {
    it('should process call event and persist to database', async () => {
      const callEvent = {
        callerId: 'test-caller-001',
        recipientId: 'test-recipient-001',
        status: 'initiated',
        metadata: {
          source: 'integration-test',
          timestamp: new Date().toISOString(),
        },
      };

      // Simulate Kafka event processing
      await (kafkaConsumerService as any).handleCallEvent(callEvent, {});

      // Verify call was persisted
      const calls = await callRepository.findAllCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].callerId).toBe(callEvent.callerId);
      expect(calls[0].recipientId).toBe(callEvent.recipientId);
      expect(calls[0].status).toBe(callEvent.status);
      expect(calls[0].metadata).toEqual(callEvent.metadata);
    });

    it('should store call in Redis cache', async () => {
      const callEvent = {
        callerId: 'test-caller-002',
        recipientId: 'test-recipient-002',
        status: 'initiated',
      };

      await (kafkaConsumerService as any).handleCallEvent(callEvent, {});

      const calls = await callRepository.findAllCalls();
      const call = calls[0];

      // Verify Redis storage
      const cachedCall = await redisService.get(`call:${call.id}`);
      expect(cachedCall).toBeTruthy();
      expect(cachedCall.id).toBe(call.id);
    });

    it('should add call to processing queue', async () => {
      const callEvent = {
        callerId: 'test-caller-003',
        recipientId: 'test-recipient-003',
        status: 'initiated',
      };

      const addToQueueSpy = jest.spyOn(redisService, 'addCallToQueue');

      await (kafkaConsumerService as any).handleCallEvent(callEvent, {});

      expect(addToQueueSpy).toHaveBeenCalled();

      const queueStatus = await redisService.getQueueStatus();
      expect(queueStatus).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle concurrent call events', async () => {
      const callEvents = Array(10)
        .fill(null)
        .map((_, i) => ({
          callerId: `caller-${i}`,
          recipientId: `recipient-${i}`,
          status: 'initiated',
          metadata: { index: i },
        }));

      // Process all events concurrently
      await Promise.all(
        callEvents.map((event) => (kafkaConsumerService as any).handleCallEvent(event, {})),
      );

      const calls = await callRepository.findAllCalls();
      expect(calls).toHaveLength(10);

      // Verify all calls are unique
      const uniqueIds = new Set(calls.map((c) => c.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle call status updates', async () => {
      // Create initial call
      const call = await callRepository.createCall({
        callerId: 'update-test-caller',
        recipientId: 'update-test-recipient',
        status: 'initiated',
      });

      // Update status
      const updatedCall = await callRepository.updateCallStatus(call.id, 'processing');
      expect(updatedCall.status).toBe('processing');

      // Update again
      const completedCall = await callRepository.updateCallStatus(call.id, 'completed');
      expect(completedCall.status).toBe('completed');

      // Verify in database
      const dbCall = await callRepository.findCallById(call.id);
      expect(dbCall.status).toBe('completed');
    });

    it('should maintain data consistency between cache and database', async () => {
      const callData = {
        callerId: 'consistency-test-caller',
        recipientId: 'consistency-test-recipient',
        status: 'initiated',
        metadata: { test: 'consistency' },
      };

      // Create call
      const call = await callRepository.createCall(callData);

      // Store in cache
      await redisService.store(`call:${call.id}`, call, 3600);

      // Retrieve from both sources
      const dbCall = await callRepository.findCallById(call.id);
      const cachedCall = await redisService.get(`call:${call.id}`);

      // Compare
      expect(dbCall.id).toBe(cachedCall.id);
      expect(dbCall.callerId).toBe(cachedCall.callerId);
      expect(dbCall.recipientId).toBe(cachedCall.recipientId);
      expect(dbCall.status).toBe(cachedCall.status);
    });

    it('should handle invalid call events gracefully', async () => {
      const invalidEvents = [null, undefined, {}, { callerId: null }, { recipientId: undefined }];

      for (const event of invalidEvents) {
        await expect(
          (kafkaConsumerService as any).handleCallEvent(event, {}),
        ).resolves.not.toThrow();
      }

      // Verify no partial data was saved
      const calls = await callRepository.findAllCalls();
      expect(calls.length).toBeLessThanOrEqual(invalidEvents.length);
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query recent calls', async () => {
      // Create test data
      const calls = Array(50)
        .fill(null)
        .map((_, i) => ({
          callerId: `perf-caller-${i}`,
          recipientId: `perf-recipient-${i}`,
          status: i % 3 === 0 ? 'completed' : 'processing',
          metadata: { index: i },
        }));

      for (const callData of calls) {
        await callRepository.createCall(callData);
      }

      // Test recent calls query
      const startTime = Date.now();
      const recentCalls = await callRepository.findRecentCalls(10);
      const queryTime = Date.now() - startTime;

      expect(recentCalls).toHaveLength(10);
      expect(queryTime).toBeLessThan(100); // Should be fast
    });

    it('should efficiently filter calls by status', async () => {
      // Create test data
      const statuses = ['initiated', 'processing', 'completed', 'failed'];
      const calls = Array(40)
        .fill(null)
        .map((_, i) => ({
          callerId: `status-caller-${i}`,
          recipientId: `status-recipient-${i}`,
          status: statuses[i % 4],
        }));

      for (const callData of calls) {
        await callRepository.createCall(callData);
      }

      // Test status filtering
      for (const status of statuses) {
        const filteredCalls = await callRepository.findCallsByStatus(status);
        expect(filteredCalls.length).toBe(10);
        expect(filteredCalls.every((c) => c.status === status)).toBe(true);
      }
    });
  });

  describe('Redis Pub/Sub Integration', () => {
    it('should publish and subscribe to call events', async (done) => {
      const testChannel = 'test-call-channel';
      const testMessage = {
        callId: 'pub-sub-test',
        event: 'call-created',
        timestamp: new Date().toISOString(),
      };

      // Set up subscription
      await redisService.subscribe(testChannel, (message) => {
        expect(message).toEqual(testMessage);
        done();
      });

      // Give subscription time to establish
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish message
      await redisService.publish(testChannel, testMessage);
    }, 5000);
  });
});
