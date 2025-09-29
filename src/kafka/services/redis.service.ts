import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private readonly redisClient: Redis;
  private readonly redisPubClient: Redis;

  constructor(
    @InjectQueue('call-queue') private callQueue: Queue,
    private configService: ConfigService,
  ) {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
    };

    this.redisClient = new Redis(redisConfig);
    this.redisPubClient = new Redis(redisConfig);
  }

  async store(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serializedValue);
    } else {
      await this.redisClient.set(key, serializedValue);
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async publish(channel: string, message: any): Promise<void> {
    const serializedMessage = JSON.stringify(message);
    await this.redisPubClient.publish(channel, serializedMessage);
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
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
    await this.callQueue.add('process-call', callData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async getQueueStatus(): Promise<any> {
    const jobCounts = await this.callQueue.getJobCounts();
    return jobCounts;
  }

  async testRedisConnection(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }
}
