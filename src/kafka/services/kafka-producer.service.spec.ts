import { Test, TestingModule } from '@nestjs/testing';
import { ClientKafka } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';
import { EventStorageService } from './event-storage.service';
import { of, throwError } from 'rxjs';

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let kafkaClient: ClientKafka;
  let eventStorage: EventStorageService;

  beforeEach(async () => {
    const mockKafkaClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaProducerService,
        EventStorageService,
        {
          provide: 'KAFKA_SERVICE',
          useValue: mockKafkaClient,
        },
      ],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
    kafkaClient = module.get<ClientKafka>('KAFKA_SERVICE');
    eventStorage = module.get<EventStorageService>(EventStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Kafka on module init', async () => {
      await service.onModuleInit();
      expect(kafkaClient.connect).toHaveBeenCalled();
    });
  });

  describe('produce', () => {
    it('should successfully produce a message', async () => {
      const topic = 'test-topic';
      const message = { test: 'data' };
      const key = 'test-key';
      const headers = { correlationId: '123' };

      jest.spyOn(kafkaClient, 'emit').mockReturnValue(of(undefined));
      jest.spyOn(eventStorage, 'addEvent');

      const result = await service.produce(topic, message, key, headers);

      expect(result.success).toBe(true);
      expect(result.topic).toBe(topic);
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(eventStorage.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          value: message,
          key,
          headers,
          status: 'processed',
        }),
      );
    });

    it('should handle production failure', async () => {
      const topic = 'test-topic';
      const message = { test: 'data' };
      const error = new Error('Kafka error');

      jest.spyOn(kafkaClient, 'emit').mockReturnValue(throwError(() => error));
      jest.spyOn(eventStorage, 'addEvent');

      const result = await service.produce(topic, message);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kafka error');
      expect(eventStorage.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          value: message,
          status: 'failed',
        }),
      );
    });

    it('should produce message without key and headers', async () => {
      const topic = 'test-topic';
      const message = { test: 'data' };

      jest.spyOn(kafkaClient, 'emit').mockReturnValue(of(undefined));

      const result = await service.produce(topic, message);

      expect(result.success).toBe(true);
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        topic,
        expect.objectContaining({
          value: message,
        }),
      );
    });
  });

  describe('produceMany', () => {
    it('should produce multiple messages', async () => {
      const topic = 'test-topic';
      const messages = [
        { key: 'key1', value: { data: 'message1' } },
        { key: 'key2', value: { data: 'message2' } },
        { key: 'key3', value: { data: 'message3' } },
      ];

      jest.spyOn(kafkaClient, 'emit').mockReturnValue(of(undefined));

      const results = await service.produceMany(topic, messages);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.topic === topic)).toBe(true);
    });

    it('should handle partial failure in batch production', async () => {
      const topic = 'test-topic';
      const messages = [
        { key: 'key1', value: { data: 'message1' } },
        { key: 'key2', value: { data: 'message2' } },
      ];

      let callCount = 0;
      jest.spyOn(kafkaClient, 'emit').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of(undefined);
        } else {
          return throwError(() => new Error('Kafka error'));
        }
      });

      const results = await service.produceMany(topic, messages);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Kafka error');
    });
  });
});
