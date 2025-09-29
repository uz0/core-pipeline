import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { RedisService } from '../../kafka/services/redis.service';

jest.mock('ioredis', () => {
  const mRedis = {
    setex: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ping: jest.fn(),
    duplicate: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    on: jest.fn(),
  };
  return {
    default: jest.fn(() => mRedis),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let mockQueue: any;
  let mockRedisClient: any;
  let mockRedisPubClient: any;
  let configService: ConfigService;

  beforeEach(async () => {
    mockRedisClient = {
      setex: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ping: jest.fn(),
    };

    mockRedisPubClient = {
      publish: jest.fn(),
    };

    mockQueue = {
      add: jest.fn(),
      getJobCounts: jest.fn(),
    };


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: getQueueToken('call-queue'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Override the mock clients
    (service as any).redisClient = mockRedisClient;
    (service as any).redisPubClient = mockRedisPubClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('store', () => {
    it('should store value with TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 3600;

      await service.store(key, value, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });

    it('should store value without TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      await service.store(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should handle complex objects', async () => {
      const key = 'test:complex';
      const value = {
        id: '123',
        nested: {
          array: [1, 2, 3],
          date: new Date().toISOString(),
        },
      };

      await service.store(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });
  });

  describe('get', () => {
    it('should retrieve and parse stored value', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      await expect(service.get('test:key')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      const key = 'test:key';
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle deletion of non-existent key', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      await service.delete('non-existent');

      expect(mockRedisClient.del).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test:key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('publish', () => {
    it('should publish message to channel', async () => {
      const channel = 'test-channel';
      const message = { event: 'test', data: 'value' };

      await service.publish(channel, message);

      expect(mockRedisPubClient.publish).toHaveBeenCalledWith(channel, JSON.stringify(message));
    });

    it('should handle complex messages', async () => {
      const channel = 'events';
      const message = {
        id: '123',
        timestamp: new Date().toISOString(),
        payload: { nested: { data: [1, 2, 3] } },
      };

      await service.publish(channel, message);

      expect(mockRedisPubClient.publish).toHaveBeenCalledWith(channel, JSON.stringify(message));
    });
  });

  describe('addCallToQueue', () => {
    it('should add call to queue with retry options', async () => {
      const callData = {
        callerId: 'caller123',
        recipientId: 'recipient456',
      };

      await service.addCallToQueue(callData);

      expect(mockQueue.add).toHaveBeenCalledWith('process-call', callData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue job counts', async () => {
      const jobCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      };
      mockQueue.getJobCounts.mockResolvedValue(jobCounts);

      const result = await service.getQueueStatus();

      expect(result).toEqual(jobCounts);
    });
  });

  describe('testRedisConnection', () => {
    it('should return true if Redis is connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await service.testRedisConnection();

      expect(result).toBe(true);
    });

    it('should return false if Redis connection fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testRedisConnection();

      expect(result).toBe(false);
    });
  });
});
