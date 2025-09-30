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
    this.logger.log('=== RedisService Constructor Called ===');
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    this.logger.log(`REDIS_URL exists: ${!!process.env.REDIS_URL}`);
    this.logger.log(`BULL_REDIS_URL exists: ${!!process.env.BULL_REDIS_URL}`);
    this.logger.log(`callQueue injected: ${!!callQueue}`);

    // Skip Redis initialization in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log('Initializing Redis (not in test mode)');
      this.initializeRedis();
    } else {
      this.logger.log('Skipping Redis initialization (test mode)');
    }
  }

  private async initializeRedis() {
    this.logger.log('=== Starting Redis Initialization ===');
    try {
      const redisUrl = this.configService.get('REDIS_URL');
      this.logger.log(`ConfigService.get('REDIS_URL') returned: ${!!redisUrl ? 'value exists' : 'null/undefined'}`);

      // If no REDIS_URL is provided, disable Redis
      if (!redisUrl) {
        this.logger.warn('REDIS_URL not provided. Running without Redis.');
        this.logger.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('REDIS')));
        return;
      }

      const sanitizedUrl = redisUrl.replace(/:[^:@]+@/, ':***@');
      this.logger.log(`Initializing Redis connection to: ${sanitizedUrl}`);
      this.logger.log(`Full URL structure check - starts with redis://${redisUrl.startsWith('redis://')}, length: ${redisUrl.length}`);

      // Parse Redis URL to properly extract credentials
      let redisConfig: any = {
        retryStrategy: (times: number) => {
          this.logger.warn(`Redis retry attempt ${times}/3`);
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 attempts. Running without Redis.');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000);
          this.logger.log(`Retrying Redis connection in ${delay}ms`);
          return delay;
        },
        enableOfflineQueue: false,
        lazyConnect: true,
        showFriendlyErrorStack: true,
      };

      try {
        this.logger.log('Attempting to parse Redis URL...');
        const url = new URL(redisUrl);

        this.logger.log(`URL parsed - protocol: ${url.protocol}, hostname: ${url.hostname}, port: ${url.port}`);
        this.logger.log(`URL username raw: "${url.username}", length: ${url.username.length}, is empty string: ${url.username === ''}`);
        this.logger.log(`URL password length: ${url.password ? url.password.length : 0}`);

        redisConfig.host = url.hostname;
        redisConfig.port = parseInt(url.port) || 6379;

        if (url.password) {
          redisConfig.password = url.password;
          this.logger.log(`Redis password configured (length: ${url.password.length} chars)`);
        } else {
          this.logger.warn('No password found in Redis URL');
        }

        // IMPORTANT: Only set username if explicitly provided and not empty
        this.logger.log(`Checking username: value="${url.username}", isEmpty=${url.username === ''}, isDefault=${url.username === 'default'}`);
        if (url.username && url.username !== '' && url.username !== 'default') {
          redisConfig.username = url.username;
          this.logger.log(`✓ Redis username configured: ${url.username}`);
        } else {
          this.logger.log(`✓ No username in URL - omitting username field (password-only auth)`);
          // Do NOT set username at all - let Redis use password-only authentication
          // Make ABSOLUTELY sure username is not set
          delete redisConfig.username;
        }

        this.logger.log(`=== Final Redis Config ===`);
        this.logger.log(`  host: ${redisConfig.host}`);
        this.logger.log(`  port: ${redisConfig.port}`);
        this.logger.log(`  username: ${redisConfig.username || '(default)'}`);
        this.logger.log(`  hasPassword: ${!!redisConfig.password}`);
        this.logger.log(`  lazyConnect: ${redisConfig.lazyConnect}`);
        this.logger.log(`  enableOfflineQueue: ${redisConfig.enableOfflineQueue}`);
      } catch (parseError) {
        this.logger.error(`Failed to parse REDIS_URL as URL: ${parseError.message}`, parseError.stack);
        this.logger.warn('Fallback: using URL string directly');
        // Fallback to using the URL string directly
        redisConfig = redisUrl;
      }

      this.logger.log('Creating Redis client instances...');

      // Deep debug: Log the EXACT config being passed to Redis
      this.logger.log('=== DEEP DEBUG: Redis Config Object ===');
      this.logger.log(`Config type: ${typeof redisConfig}`);
      this.logger.log(`Config is string: ${typeof redisConfig === 'string'}`);
      if (typeof redisConfig === 'object') {
        this.logger.log(`Config keys: ${Object.keys(redisConfig).join(', ')}`);
        this.logger.log(`Config.host: ${redisConfig.host}`);
        this.logger.log(`Config.port: ${redisConfig.port}`);
        this.logger.log(`Config.password exists: ${!!redisConfig.password}`);
        this.logger.log(`Config.password type: ${typeof redisConfig.password}`);
        this.logger.log(`Config.password length: ${redisConfig.password ? redisConfig.password.length : 0}`);
        this.logger.log(`Config.password first char: ${redisConfig.password ? redisConfig.password.charCodeAt(0) : 'N/A'}`);
        this.logger.log(`Config.password last char: ${redisConfig.password ? redisConfig.password.charCodeAt(redisConfig.password.length - 1) : 'N/A'}`);
        this.logger.log(`Config.username: ${redisConfig.username || '(not set)'}`);
        this.logger.log(`Config has username property: ${'username' in redisConfig}`);
        this.logger.log(`Full config (stringified): ${JSON.stringify(redisConfig, (key, value) => key === 'password' ? '***' : value)}`);
      } else {
        this.logger.log(`Config value (string): ${redisConfig}`);
      }

      this.redisClient = new Redis(redisConfig);
      this.redisPubClient = new Redis(redisConfig);
      this.logger.log('Redis client instances created');

      // Set up error handlers to prevent crashes
      this.logger.log('Setting up Redis event handlers...');

      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis client ERROR event: ${err.message}`, err.stack);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('✓ Redis client CONNECT event - TCP connection established');
        this.isConnected = true;
      });

      this.redisClient.on('ready', () => {
        this.logger.log('✓ Redis client READY event - authenticated and ready for commands');
      });

      this.redisClient.on('close', () => {
        this.logger.warn('Redis client CLOSE event - connection closed');
        this.isConnected = false;
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.log('Redis client RECONNECTING event');
      });

      this.redisClient.on('end', () => {
        this.logger.warn('Redis client END event - connection ended');
      });

      this.redisPubClient.on('error', (err) => {
        this.logger.error(`Redis pub client ERROR event: ${err.message}`, err.stack);
      });

      this.redisPubClient.on('connect', () => {
        this.logger.log('✓ Redis pub client CONNECT event');
      });

      this.redisPubClient.on('ready', () => {
        this.logger.log('✓ Redis pub client READY event');
      });

      // Try to connect
      this.logger.log('=== Attempting to connect Redis main client ===');
      try {
        await this.redisClient.connect();
        this.logger.log('✓ Redis main client connect() completed successfully');

        // Test the connection with a PING
        this.logger.log('Testing connection with PING...');
        const pingResult = await this.redisClient.ping();
        this.logger.log(`✓ PING response: ${pingResult}`);
      } catch (err) {
        this.logger.error(`✗ Failed to connect Redis main client: ${err.message}`, err.stack);
        this.logger.error(`Error name: ${err.name}, code: ${err.code || 'N/A'}`);
        this.redisClient = null;
      }

      if (this.redisClient) {
        this.logger.log('=== Attempting to connect Redis pub client ===');
        try {
          await this.redisPubClient.connect();
          this.logger.log('✓ Redis pub client connect() completed successfully');
        } catch (err) {
          this.logger.error(`✗ Failed to connect Redis pub client: ${err.message}`, err.stack);
          this.logger.error(`Error name: ${err.name}, code: ${err.code || 'N/A'}`);
          this.redisPubClient = null;
        }
      } else {
        this.logger.warn('Redis main client is null, skipping pub client connection');
      }

      this.logger.log('=== Redis Initialization Complete ===');
      this.logger.log(`Main client: ${this.redisClient ? 'CONNECTED' : 'FAILED'}`);
      this.logger.log(`Pub client: ${this.redisPubClient ? 'CONNECTED' : 'FAILED'}`);
    } catch (error) {
      this.logger.error(`Redis initialization exception: ${error.message}`, error.stack);
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
