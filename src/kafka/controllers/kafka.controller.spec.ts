import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { KafkaController } from './kafka.controller';
import { KafkaProducerService } from '../services/kafka-producer.service';
import { KafkaConsumerService } from '../services/kafka-consumer.service';
import { EventStorageService } from '../services/event-storage.service';
import { ProduceMessageDto } from '../dto/produce-message.dto';
import { KafkaEvent } from '../interfaces/kafka-event.interface';

describe('KafkaController', () => {
  let controller: KafkaController;
  let producerService: KafkaProducerService;
  let consumerService: KafkaConsumerService;
  let eventStorage: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KafkaController],
      providers: [
        {
          provide: KafkaProducerService,
          useValue: {
            produce: jest.fn(),
            produceMany: jest.fn(),
          },
        },
        {
          provide: KafkaConsumerService,
          useValue: {
            getSubscribedTopics: jest.fn(),
            subscribeToTopic: jest.fn(),
          },
        },
        {
          provide: EventStorageService,
          useValue: {
            getAllEvents: jest.fn(),
            getEventsByTopic: jest.fn(),
            getEvent: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<KafkaController>(KafkaController);
    producerService = module.get<KafkaProducerService>(KafkaProducerService);
    consumerService = module.get<KafkaConsumerService>(KafkaConsumerService);
    eventStorage = module.get<EventStorageService>(EventStorageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/kafka/produce', () => {
    it('should produce a message successfully', async () => {
      const dto: ProduceMessageDto = {
        topic: 'test-topic',
        key: 'test-key',
        value: { test: 'data' },
        headers: { correlationId: '123' },
      };

      const expectedResult = {
        success: true,
        messageId: 'msg-123',
        topic: 'test-topic',
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(producerService, 'produce').mockResolvedValue(expectedResult);

      const result = await controller.produce(dto);

      expect(result).toEqual(expectedResult);
      expect(producerService.produce).toHaveBeenCalledWith(
        dto.topic,
        dto.value,
        dto.key,
        dto.headers,
      );
    });
  });

  describe('GET /api/kafka', () => {
    it('should return all messages', () => {
      const mockEvents: KafkaEvent[] = [
        {
          id: 'msg-1',
          topic: 'test-topic',
          partition: 0,
          offset: '100',
          value: { test: 'data1' },
          timestamp: new Date().toISOString(),
          status: 'processed',
        },
        {
          id: 'msg-2',
          topic: 'test-topic',
          partition: 0,
          offset: '101',
          value: { test: 'data2' },
          timestamp: new Date().toISOString(),
          status: 'processed',
        },
      ];

      jest.spyOn(eventStorage, 'getAllEvents').mockReturnValue(mockEvents);

      const result = controller.getMessages();

      expect(result).toEqual(mockEvents);
      expect(eventStorage.getAllEvents).toHaveBeenCalled();
    });

    it('should filter messages by topic', () => {
      const mockEvents: KafkaEvent[] = [
        {
          id: 'msg-1',
          topic: 'specific-topic',
          partition: 0,
          offset: '100',
          value: { test: 'data' },
          timestamp: new Date().toISOString(),
          status: 'processed',
        },
      ];

      jest.spyOn(eventStorage, 'getEventsByTopic').mockReturnValue(mockEvents);

      const result = controller.getMessages('specific-topic');

      expect(result).toEqual(mockEvents);
      expect(eventStorage.getEventsByTopic).toHaveBeenCalledWith('specific-topic');
    });

    it('should filter messages by status', () => {
      const allEvents: KafkaEvent[] = [
        {
          id: 'msg-1',
          topic: 'test-topic',
          partition: 0,
          offset: '100',
          value: { test: 'data1' },
          timestamp: new Date().toISOString(),
          status: 'processed',
        },
        {
          id: 'msg-2',
          topic: 'test-topic',
          partition: 0,
          offset: '101',
          value: { test: 'data2' },
          timestamp: new Date().toISOString(),
          status: 'failed',
        },
      ];

      jest.spyOn(eventStorage, 'getAllEvents').mockReturnValue(allEvents);

      const result = controller.getMessages(undefined, 'processed');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('processed');
    });

    it('should limit the number of messages', () => {
      const mockEvents: KafkaEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        topic: 'test-topic',
        partition: 0,
        offset: String(i),
        value: { test: `data${i}` },
        timestamp: new Date().toISOString(),
        status: 'processed' as const,
      }));

      jest.spyOn(eventStorage, 'getAllEvents').mockReturnValue(mockEvents);

      const result = controller.getMessages(undefined, undefined, '5');

      expect(result).toHaveLength(5);
    });
  });

  describe('GET /api/kafka/stats', () => {
    it('should return statistics', () => {
      const mockStats = {
        total: 100,
        byTopic: { 'topic-a': 50, 'topic-b': 50 },
        byStatus: { pending: 10, processed: 80, failed: 10 },
      };

      const mockTopics = ['topic-a', 'topic-b', 'topic-c'];

      jest.spyOn(eventStorage, 'getStats').mockReturnValue(mockStats);
      jest.spyOn(consumerService, 'getSubscribedTopics').mockReturnValue(mockTopics);

      const result = controller.getStats();

      expect(result).toEqual({
        ...mockStats,
        subscribedTopics: mockTopics,
      });
    });
  });

  describe('GET /api/kafka/topics', () => {
    it('should return subscribed topics', () => {
      const mockTopics = ['topic-1', 'topic-2', 'topic-3'];
      jest.spyOn(consumerService, 'getSubscribedTopics').mockReturnValue(mockTopics);

      const result = controller.getTopics();

      expect(result).toEqual({ topics: mockTopics });
    });
  });

  describe('GET /api/kafka/:id', () => {
    it('should return a message by ID', () => {
      const mockEvent: KafkaEvent = {
        id: 'msg-123',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      jest.spyOn(eventStorage, 'getEvent').mockReturnValue(mockEvent);

      const result = controller.getMessage('msg-123');

      expect(result).toEqual(mockEvent);
    });

    it('should return 404 for non-existent message', () => {
      jest.spyOn(eventStorage, 'getEvent').mockReturnValue(undefined);

      const result = controller.getMessage('non-existent');

      expect(result).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Message not found',
      });
    });
  });

  describe('POST /api/kafka/produce-batch', () => {
    it('should produce multiple messages', async () => {
      const dto = {
        topic: 'test-topic',
        messages: [
          { key: 'key1', value: { data: 'message1' } },
          { key: 'key2', value: { data: 'message2' } },
        ],
      };

      const expectedResults = [
        {
          success: true,
          messageId: 'msg-1',
          topic: 'test-topic',
          timestamp: new Date().toISOString(),
        },
        {
          success: true,
          messageId: 'msg-2',
          topic: 'test-topic',
          timestamp: new Date().toISOString(),
        },
      ];

      jest.spyOn(producerService, 'produceMany').mockResolvedValue(expectedResults);

      const result = await controller.produceBatch(dto);

      expect(result).toEqual(expectedResults);
      expect(producerService.produceMany).toHaveBeenCalledWith(dto.topic, dto.messages);
    });
  });

  describe('POST /api/kafka/subscribe', () => {
    it('should subscribe to a new topic', async () => {
      const dto = { topic: 'new-topic' };
      const mockTopics = ['topic-1', 'topic-2', 'new-topic'];

      jest.spyOn(consumerService, 'subscribeToTopic').mockResolvedValue(undefined);
      jest.spyOn(consumerService, 'getSubscribedTopics').mockReturnValue(mockTopics);

      const result = await controller.subscribe(dto);

      expect(result).toEqual({
        success: true,
        message: 'Subscribed to topic: new-topic',
        subscribedTopics: mockTopics,
      });
      expect(consumerService.subscribeToTopic).toHaveBeenCalledWith('new-topic');
    });
  });
});
