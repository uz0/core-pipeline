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
      const redisUrl = this.configService.get('REDIS_URL');

      if (!redisUrl) {
        this.logger.warn('REDIS_URL not provided. Running without Redis.');
        return;
      }

      // Parse Redis URL to properly extract credentials
      let redisConfig: any = {
        retryStrategy: (times: number) => {
          if (times <= 3) {
            this.logger.warn(`Redis retry attempt ${times}/3`);
          }
          if (times >= 3) {
            if (times === 3) {
              this.logger.error('Redis connection failed after 3 attempts. Running without Redis.');
            }
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
        showFriendlyErrorStack: true,
      };

      try {
        const url = new URL(redisUrl);

        redisConfig.host = url.hostname;
        redisConfig.port = parseInt(url.port) || 6379;

        if (url.password) {
          redisConfig.password = url.password;
          // Log password details to help debug auth issues
          this.logger.log(`Redis password: ${url.password.length} chars, starts with '${url.password[0]}', ends with '${url.password[url.password.length - 1]}'`);
        } else {
          this.logger.warn('No password in REDIS_URL!');
        }

        // Only set username if explicitly provided (Redis 6+ ACL)
        if (url.username && url.username !== '' && url.username !== 'default') {
          redisConfig.username = url.username;
          this.logger.log(`Redis username: ${url.username}`);
        } else {
          this.logger.log('Redis username: (none - password-only auth)');
        }

        const sanitizedUrl = redisUrl.replace(/:[^:@]+@/, ':***@');
        this.logger.log(`Initializing Redis: ${sanitizedUrl}`);
      } catch (parseError) {
        this.logger.error(`Failed to parse REDIS_URL: ${parseError.message}`);
        // Fallback to using the URL string directly
        redisConfig = redisUrl;
      }

      this.redisClient = new Redis(redisConfig);
      this.redisPubClient = new Redis(redisConfig);

      // Set up error handlers to prevent crashes
      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.redisClient.on('ready', () => {
        this.logger.log('✓ Redis connected and ready');
        this.isConnected = true;
      });

      this.redisClient.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.redisPubClient.on('error', (err) => {
        this.logger.error(`Redis pub client error: ${err.message}`);
      });

      // Try to connect
      try {
        await this.redisClient.connect();
        await this.redisClient.ping();
        await this.redisPubClient.connect();
      } catch (err) {
        this.logger.error(`Failed to connect to Redis: ${err.message}`);
        this.redisClient = null;
        this.redisPubClient = null;
      }
    } catch (error) {
      this.logger.error(`Redis initialization error: ${error.message}`);
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

    const redisUrl = this.configService.get('REDIS_URL');
    if (!redisUrl) return;

    // Parse Redis URL to use same config as main clients
    let redisConfig: any;
    try {
      const url = new URL(redisUrl);
      redisConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
      };

      if (url.password) {
        redisConfig.password = url.password;
      }

      // IMPORTANT: Only set username if explicitly provided and not empty
      if (url.username && url.username !== '' && url.username !== 'default') {
        redisConfig.username = url.username;
      }

      this.logger.log(`Creating subscribe client for channel: ${channel}`);
    } catch (parseError) {
      this.logger.warn(`Failed to parse REDIS_URL for subscribe: ${parseError.message}`);
      redisConfig = redisUrl;
    }

    const subClient = new Redis(redisConfig);

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
