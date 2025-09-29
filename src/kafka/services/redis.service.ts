import { Injectable, Optional, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis | null = null;
  private redisPubClient: Redis | null = null;
  private isConnected = false;

  constructor(
    @Optional() @InjectQueue('call-queue') private callQueue: Queue,
    private configService: ConfigService,
  ) {
    // Skip Redis initialization in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.initializeRedis();
    }
  }

  private async initializeRedis() {
    try {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 attempts. Running without Redis.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
      };

      this.redisClient = new Redis(redisConfig);
      this.redisPubClient = new Redis(redisConfig);

      // Set up error handlers to prevent crashes
      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis client error: ${err.message}`);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.redisPubClient.on('error', (err) => {
        this.logger.warn(`Redis pub client error: ${err.message}`);
      });

      // Try to connect
      await this.redisClient.connect().catch((err) => {
        this.logger.warn(`Failed to connect to Redis: ${err.message}`);
        this.redisClient = null;
      });

      if (this.redisClient) {
        await this.redisPubClient.connect().catch((err) => {
          this.logger.warn(`Failed to connect Redis pub client: ${err.message}`);
          this.redisPubClient = null;
        });
      }
    } catch (error) {
      this.logger.warn(`Redis initialization failed: ${error.message}`);
      this.redisClient = null;
      this.redisPubClient = null;
    }
  }

  async store(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redisClient) return;
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serializedValue);
    } else {
      await this.redisClient.set(key, serializedValue);
    }
  }

  async get(key: string): Promise<any> {
    if (!this.redisClient) return null;
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async delete(key: string): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.redisPubClient) return;
    const serializedMessage = JSON.stringify(message);
    await this.redisPubClient.publish(channel, serializedMessage);
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    const subClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
    });

    await subClient.subscribe(channel);
    subClient.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      }
    });
  }

  async addCallToQueue(callData: any): Promise<void> {
    if (!this.callQueue) return;
    await this.callQueue.add('process-call', callData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async getQueueStatus(): Promise<any> {
    if (!this.callQueue) return {};
    const jobCounts = await this.callQueue.getJobCounts();
    return jobCounts;
  }

  async testRedisConnection(): Promise<boolean> {
    if (!this.redisClient) return false;
    try {
      await this.redisClient.ping();
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.redisClient) return false;
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}
