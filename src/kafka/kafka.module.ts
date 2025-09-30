import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { KafkaProducerService } from './services/kafka-producer.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { EventStorageService } from './services/event-storage.service';
import { Call } from '../entities/call.entity';
import { CallRepository } from '../repositories/call.repository';
import { RedisService } from './services/redis.service';
import { CallProcessor } from './processors/call.processor';

// Helper function to conditionally create Bull queue registration
function createBullQueueRegistration(): DynamicModule | null {
  console.log('=== KafkaModule Bull Queue Registration ===');
  const bullRedisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL;

  console.log(`[KafkaModule] BULL_REDIS_URL: ${process.env.BULL_REDIS_URL ? 'SET' : 'NOT SET'}`);
  console.log(`[KafkaModule] REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);

  if (!bullRedisUrl) {
    console.warn('[KafkaModule] No REDIS_URL found, skipping Bull queue registration');
    return null;
  }

  console.log('[KafkaModule] ✓ Redis URL available, registering call-queue with Bull');
  console.log('[KafkaModule] Queue name: call-queue');
  console.log('[KafkaModule] This queue will use the Redis config from BullModule.forRoot()');

  return BullModule.registerQueue({
    name: 'call-queue',
  });
}

const bullQueue = createBullQueueRegistration();

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Call]),
    ...(bullQueue ? [bullQueue] : []),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('KAFKA_CLIENT_ID', 'core-pipeline'),
              brokers: [configService.get('KAFKA_BROKER', 'localhost:9092')],
            },
            consumer: {
              groupId: configService.get('KAFKA_CONSUMER_GROUP', 'core-pipeline-group'),
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [], // Controllers moved to app.module.ts for better organization
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    EventStorageService,
    CallRepository,
    RedisService,
    CallProcessor,
  ],
  exports: [
    KafkaProducerService,
    KafkaConsumerService,
    EventStorageService,
    CallRepository,
    RedisService,
  ],
})
export class KafkaModule {}
