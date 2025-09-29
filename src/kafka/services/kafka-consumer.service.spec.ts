import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumerService } from './kafka-consumer.service';
import { EventStorageService } from './event-storage.service';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    })),
  })),
}));

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        EventStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                KAFKA_CLIENT_ID: 'test-client',
                KAFKA_BROKER: 'localhost:9092',
                KAFKA_CONSUMER_GROUP: 'test-group',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribeToTopic', () => {
    it('should subscribe to a new topic', async () => {
      const topic = 'new-topic';

      await service.subscribeToTopic(topic);

      const subscribedTopics = service.getSubscribedTopics();
      expect(subscribedTopics).toContain(topic);
    });

    it('should not subscribe to the same topic twice', async () => {
      const topic = 'duplicate-topic';

      await service.subscribeToTopic(topic);
      await service.subscribeToTopic(topic);

      const subscribedTopics = service.getSubscribedTopics();
      const topicCount = subscribedTopics.filter((t) => t === topic).length;
      expect(topicCount).toBe(1);
    });
  });

  describe('getSubscribedTopics', () => {
    it('should return list of subscribed topics', async () => {
      const topics = ['topic1', 'topic2', 'topic3'];

      for (const topic of topics) {
        await service.subscribeToTopic(topic);
      }

      const subscribedTopics = service.getSubscribedTopics();
      expect(subscribedTopics).toEqual(expect.arrayContaining(topics));
    });
  });
});
