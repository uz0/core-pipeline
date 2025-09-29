import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ProducerResult } from '../interfaces/kafka-event.interface';
import { EventStorageService } from './event-storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly eventStorage: EventStorageService,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('Kafka producer connected');
  }

  async produce(
    topic: string,
    message: any,
    key?: string,
    headers?: Record<string, string>,
  ): Promise<ProducerResult> {
    const messageId = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      this.logger.log(`Producing message to topic: ${topic}`, {
        messageId,
        key,
        headers,
      });

      await this.kafkaClient
        .emit(topic, {
          key,
          value: message,
          headers: {
            ...headers,
            messageId,
            timestamp,
          },
        })
        .toPromise();

      const kafkaEvent = {
        id: messageId,
        topic,
        partition: 0,
        offset: '0',
        key,
        value: message,
        headers,
        timestamp,
        status: 'processed' as const,
      };

      this.eventStorage.addEvent(kafkaEvent);

      this.logger.log(`Message produced successfully`, {
        messageId,
        topic,
      });

      return {
        success: true,
        messageId,
        topic,
        timestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to produce message to topic: ${topic}`, error);

      const kafkaEvent = {
        id: messageId,
        topic,
        partition: 0,
        offset: '0',
        key,
        value: message,
        headers,
        timestamp,
        status: 'failed' as const,
      };

      this.eventStorage.addEvent(kafkaEvent);

      return {
        success: false,
        messageId,
        topic,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async produceMany(
    topic: string,
    messages: Array<{ key?: string; value: any; headers?: Record<string, string> }>,
  ): Promise<ProducerResult[]> {
    const results: ProducerResult[] = [];

    for (const message of messages) {
      const result = await this.produce(topic, message.value, message.key, message.headers);
      results.push(result);
    }

    return results;
  }
}
