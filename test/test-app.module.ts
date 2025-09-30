import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '../src/controllers/health.controller';
import { AppController } from '../src/controllers/app.controller';
import { MetricsController } from '../src/controllers/metrics.controller';
import { ShowcaseController } from '../src/controllers/showcase.controller';
import { LoggerService } from '../src/services/logger.service';
import { MetricsService } from '../src/services/metrics.service';
import { Call } from '../src/entities/call.entity';
import { CallRepository } from '../src/repositories/call.repository';
import { KafkaProducerService } from '../src/kafka/services/kafka-producer.service';
import { KafkaConsumerService } from '../src/kafka/services/kafka-consumer.service';
import { EventStorageService } from '../src/kafka/services/event-storage.service';
import { RedisService } from '../src/kafka/services/redis.service';

// Mock implementations for testing
export class MockKafkaProducerService {
  async produce(topic: string) {
    return {
      success: true,
      messageId: 'test-message-id',
      topic,
      partition: 0,
      offset: '0',
      timestamp: new Date().toISOString(),
    };
  }

  async produceMany(topic: string, messages: any[]) {
    return messages.map((msg, index) => ({
      success: true,
      messageId: `test-message-${index}`,
      topic,
      timestamp: new Date().toISOString(),
    }));
  }
}

export class MockKafkaConsumerService {
  getSubscribedTopics() {
    return ['test-topic'];
  }

  async subscribeToTopic() {
    return true;
  }
}

export class MockEventStorageService {
  private events: any[] = [];

  getEvent(id: string) {
    return this.events.find((e) => e.id === id);
  }

  getAllEvents() {
    return this.events;
  }

  getEventsByTopic(topic: string) {
    return this.events.filter((e) => e.topic === topic);
  }

  getStats() {
    return {
      total: this.events.length,
      byTopic: {},
      byStatus: {},
    };
  }

  addEvent(event: any) {
    this.events.push(event);
  }
}

export class MockRedisService {
  private cache = new Map<string, any>();
  private queue: any[] = [];

  async testRedisConnection(): Promise<boolean> {
    return true;
  }

  async store(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }

  async get(key: string): Promise<any> {
    return this.cache.get(key) || null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async publish(): Promise<void> {
    // Mock publish
  }

  async subscribe(): Promise<void> {
    // Mock subscribe
  }

  async addCallToQueue(call: any): Promise<void> {
    this.queue.push(call);
  }

  async getQueueStatus(): Promise<any> {
    return {
      waiting: this.queue.length,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
      ignoreEnvFile: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [Call],
      synchronize: true,
      dropSchema: true,
      logging: false,
      retryAttempts: 1,
      retryDelay: 0,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([Call]),
    BullModule.registerQueue({
      name: 'test-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    TerminusModule,
  ],
  controllers: [AppController, HealthController, MetricsController, ShowcaseController],
  providers: [
    LoggerService,
    MetricsService,
    CallRepository,
    {
      provide: KafkaProducerService,
      useClass: MockKafkaProducerService,
    },
    {
      provide: KafkaConsumerService,
      useClass: MockKafkaConsumerService,
    },
    {
      provide: EventStorageService,
      useClass: MockEventStorageService,
    },
    {
      provide: RedisService,
      useClass: MockRedisService,
    },
  ],
})
export class TestAppModule {}
