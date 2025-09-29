import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { EventStorageService } from './event-storage.service';
import { CallRepository } from '../../repositories/call.repository';
import { RedisService } from './redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly subscribedTopics: Set<string> = new Set();

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly eventStorage?: EventStorageService,
    @Optional() private readonly callRepository?: CallRepository,
    @Optional() private readonly redisService?: RedisService,
  ) {
    // Only initialize Kafka if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.kafka = new Kafka({
        clientId: this.configService.get('KAFKA_CLIENT_ID', 'core-pipeline'),
        brokers: [this.configService.get('KAFKA_BROKER', 'localhost:9092')],
      });

      this.consumer = this.kafka.consumer({
        groupId: this.configService.get('KAFKA_CONSUMER_GROUP', 'core-pipeline-group'),
      });
    }
  }

  async onModuleInit() {
    // Skip Kafka initialization in test environment
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('Skipping Kafka initialization in test environment');
      return;
    }

    if (!this.consumer) {
      this.logger.warn('Kafka consumer not initialized');
      return;
    }

    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      const defaultTopics = ['user-events', 'system-events', 'showcase-events', 'call-events'];
      for (const topic of defaultTopics) {
        await this.subscribeToTopic(topic);
      }

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer', error);
    }
  }

  async subscribeToTopic(topic: string): Promise<void> {
    if (this.subscribedTopics.has(topic)) {
      this.logger.log(`Already subscribed to topic: ${topic}`);
      return;
    }

    if (!this.consumer) {
      this.logger.warn('Cannot subscribe to topic: Kafka consumer not initialized');
      this.subscribedTopics.add(topic); // Add to list for testing purposes
      return;
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.subscribedTopics.add(topic);
      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${topic}`, error);
      throw error;
    }
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const messageId = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const key = message.key?.toString();
      const value = message.value ? JSON.parse(message.value.toString()) : null;
      const headers = this.parseHeaders(message.headers as Record<string, Buffer | undefined>);

      this.logger.log(`Received message from topic: ${topic}`, {
        messageId,
        partition,
        offset: message.offset,
        key,
      });

      const kafkaEvent = {
        id: messageId,
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        headers,
        timestamp,
        status: 'processed' as const,
      };

      if (this.eventStorage) {
        this.eventStorage.addEvent(kafkaEvent);
      }

      this.processBusinessLogic(topic, value, headers);
    } catch (error) {
      this.logger.error(`Failed to process message from topic: ${topic}`, error);

      const kafkaEvent = {
        id: messageId,
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString(),
        value: message.value?.toString(),
        headers: {},
        timestamp,
        status: 'failed' as const,
      };

      if (this.eventStorage) {
        this.eventStorage.addEvent(kafkaEvent);
      }
    }
  }

  private parseHeaders(headers?: Record<string, Buffer | undefined>): Record<string, string> {
    if (!headers) return {};

    const parsed: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        parsed[key] = value.toString();
      }
    }
    return parsed;
  }

  private processBusinessLogic(topic: string, value: any, headers: Record<string, string>): void {
    switch (topic) {
      case 'user-events':
        this.handleUserEvent(value, headers);
        break;
      case 'system-events':
        this.handleSystemEvent(value, headers);
        break;
      case 'showcase-events':
        this.handleShowcaseEvent(value, headers);
        break;
      case 'call-events':
        this.handleCallEvent(value, headers);
        break;
      default:
        this.logger.log(`Received message from topic: ${topic}`, value);
    }
  }

  private handleUserEvent(event: any, headers: Record<string, string>): void {
    this.logger.log('Processing user event', { event, headers });
  }

  private handleSystemEvent(event: any, headers: Record<string, string>): void {
    this.logger.log('Processing system event', { event, headers });
  }

  private handleShowcaseEvent(event: any, headers: Record<string, string>): void {
    this.logger.log('Processing showcase event', { event, headers });
  }

  private async handleCallEvent(event: any, headers: Record<string, string>): Promise<void> {
    this.logger.log('Processing call event', { event, headers });

    // Validate event data
    if (!event || !event.callerId || !event.recipientId) {
      this.logger.warn('Invalid call event received');
      return;
    }

    try {
      // Only process if services are available
      if (this.callRepository) {
        const call = await this.callRepository.createCall({
          callerId: event.callerId,
          recipientId: event.recipientId,
          status: event.status || 'initiated',
          metadata: event.metadata || {},
        });

        // Only use Redis if available
        if (this.redisService) {
          await this.redisService.store(`call:${call.id}`, call, 3600);

          await this.redisService.publish('call-created', {
            callId: call.id,
            timestamp: new Date().toISOString(),
            ...call,
          });

          await this.redisService.addCallToQueue(call);
        }

        this.logger.log(`Call event processed and stored: ${call.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to process call event', error);
    }
  }

  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }
}
