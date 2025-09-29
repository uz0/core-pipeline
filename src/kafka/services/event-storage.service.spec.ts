import { Test, TestingModule } from '@nestjs/testing';
import { EventStorageService } from './event-storage.service';
import { KafkaEvent } from '../interfaces/kafka-event.interface';

describe('EventStorageService', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStorageService],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
  });

  afterEach(() => {
    service.clearEvents();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addEvent', () => {
    it('should add an event to storage', () => {
      const event: KafkaEvent = {
        id: 'test-1',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      service.addEvent(event);
      expect(service.getEvent('test-1')).toEqual(event);
    });

    it('should track events by topic', () => {
      const event1: KafkaEvent = {
        id: 'test-1',
        topic: 'topic-a',
        partition: 0,
        offset: '100',
        value: { test: 'data1' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      const event2: KafkaEvent = {
        id: 'test-2',
        topic: 'topic-a',
        partition: 0,
        offset: '101',
        value: { test: 'data2' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      const event3: KafkaEvent = {
        id: 'test-3',
        topic: 'topic-b',
        partition: 0,
        offset: '102',
        value: { test: 'data3' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      service.addEvent(event1);
      service.addEvent(event2);
      service.addEvent(event3);

      const topicAEvents = service.getEventsByTopic('topic-a');
      expect(topicAEvents).toHaveLength(2);
      expect(topicAEvents.map((e) => e.id)).toContain('test-1');
      expect(topicAEvents.map((e) => e.id)).toContain('test-2');

      const topicBEvents = service.getEventsByTopic('topic-b');
      expect(topicBEvents).toHaveLength(1);
      expect(topicBEvents[0].id).toBe('test-3');
    });
  });

  describe('getEvent', () => {
    it('should return undefined for non-existent event', () => {
      expect(service.getEvent('non-existent')).toBeUndefined();
    });

    it('should return the correct event', () => {
      const event: KafkaEvent = {
        id: 'test-1',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      service.addEvent(event);
      expect(service.getEvent('test-1')).toEqual(event);
    });
  });

  describe('getAllEvents', () => {
    it('should return all events sorted by timestamp', () => {
      const now = Date.now();
      const event1: KafkaEvent = {
        id: 'test-1',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data1' },
        timestamp: new Date(now - 2000).toISOString(),
        status: 'processed',
      };

      const event2: KafkaEvent = {
        id: 'test-2',
        topic: 'test-topic',
        partition: 0,
        offset: '101',
        value: { test: 'data2' },
        timestamp: new Date(now).toISOString(),
        status: 'processed',
      };

      const event3: KafkaEvent = {
        id: 'test-3',
        topic: 'test-topic',
        partition: 0,
        offset: '102',
        value: { test: 'data3' },
        timestamp: new Date(now - 1000).toISOString(),
        status: 'processed',
      };

      service.addEvent(event1);
      service.addEvent(event2);
      service.addEvent(event3);

      const allEvents = service.getAllEvents();
      expect(allEvents).toHaveLength(3);
      expect(allEvents[0].id).toBe('test-2');
      expect(allEvents[1].id).toBe('test-3');
      expect(allEvents[2].id).toBe('test-1');
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status', () => {
      const event: KafkaEvent = {
        id: 'test-1',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data' },
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      service.addEvent(event);
      service.updateEventStatus('test-1', 'processed');

      const updatedEvent = service.getEvent('test-1');
      expect(updatedEvent?.status).toBe('processed');
    });

    it('should not throw error for non-existent event', () => {
      expect(() => {
        service.updateEventStatus('non-existent', 'processed');
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const events: KafkaEvent[] = [
        {
          id: 'test-1',
          topic: 'topic-a',
          partition: 0,
          offset: '100',
          value: { test: 'data1' },
          timestamp: new Date().toISOString(),
          status: 'processed',
        },
        {
          id: 'test-2',
          topic: 'topic-a',
          partition: 0,
          offset: '101',
          value: { test: 'data2' },
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
        {
          id: 'test-3',
          topic: 'topic-b',
          partition: 0,
          offset: '102',
          value: { test: 'data3' },
          timestamp: new Date().toISOString(),
          status: 'failed',
        },
      ];

      events.forEach((event) => service.addEvent(event));

      const stats = service.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byTopic['topic-a']).toBe(2);
      expect(stats.byTopic['topic-b']).toBe(1);
      expect(stats.byStatus.processed).toBe(1);
      expect(stats.byStatus.pending).toBe(1);
      expect(stats.byStatus.failed).toBe(1);
    });

    it('should return empty stats when no events', () => {
      const stats = service.getStats();
      expect(stats.total).toBe(0);
      expect(stats.byTopic).toEqual({});
      expect(stats.byStatus).toEqual({
        pending: 0,
        processed: 0,
        failed: 0,
      });
    });
  });

  describe('clearEvents', () => {
    it('should clear all events', () => {
      const event: KafkaEvent = {
        id: 'test-1',
        topic: 'test-topic',
        partition: 0,
        offset: '100',
        value: { test: 'data' },
        timestamp: new Date().toISOString(),
        status: 'processed',
      };

      service.addEvent(event);
      expect(service.getAllEvents()).toHaveLength(1);

      service.clearEvents();
      expect(service.getAllEvents()).toHaveLength(0);
      expect(service.getStats().total).toBe(0);
    });
  });
});
