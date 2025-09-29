import { Injectable } from '@nestjs/common';
import { KafkaEvent } from '../interfaces/kafka-event.interface';

@Injectable()
export class EventStorageService {
  private events: Map<string, KafkaEvent> = new Map();
  private eventsByTopic: Map<string, Set<string>> = new Map();

  addEvent(event: KafkaEvent): void {
    this.events.set(event.id, event);

    if (!this.eventsByTopic.has(event.topic)) {
      this.eventsByTopic.set(event.topic, new Set());
    }
    this.eventsByTopic.get(event.topic)?.add(event.id);
  }

  getEvent(id: string): KafkaEvent | undefined {
    return this.events.get(id);
  }

  getAllEvents(): KafkaEvent[] {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getEventsByTopic(topic: string): KafkaEvent[] {
    const eventIds = this.eventsByTopic.get(topic);
    if (!eventIds) return [];

    return Array.from(eventIds)
      .map((id) => this.events.get(id))
      .filter((event): event is KafkaEvent => event !== undefined)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  updateEventStatus(id: string, status: 'pending' | 'processed' | 'failed'): void {
    const event = this.events.get(id);
    if (event) {
      event.status = status;
    }
  }

  clearEvents(): void {
    this.events.clear();
    this.eventsByTopic.clear();
  }

  getStats(): { total: number; byTopic: Record<string, number>; byStatus: Record<string, number> } {
    const stats = {
      total: this.events.size,
      byTopic: {} as Record<string, number>,
      byStatus: {
        pending: 0,
        processed: 0,
        failed: 0,
      },
    };

    for (const [topic, eventIds] of this.eventsByTopic.entries()) {
      stats.byTopic[topic] = eventIds.size;
    }

    for (const event of this.events.values()) {
      stats.byStatus[event.status]++;
    }

    return stats;
  }
}
