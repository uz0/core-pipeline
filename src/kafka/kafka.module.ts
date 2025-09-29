import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaController } from './controllers/kafka.controller';
import { KafkaProducerService } from './services/kafka-producer.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { EventStorageService } from './services/event-storage.service';

@Module({
  imports: [
    ConfigModule,
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
  controllers: [KafkaController],
  providers: [KafkaProducerService, KafkaConsumerService, EventStorageService],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
