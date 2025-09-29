export interface KafkaEvent {
  id: string;
  topic: string;
  partition: number;
  offset: string;
  key?: string;
  value: any;
  headers?: Record<string, string>;
  timestamp: string;
  status: 'pending' | 'processed' | 'failed';
}

export interface ProducerResult {
  success: boolean;
  messageId: string;
  topic: string;
  partition?: number;
  offset?: string;
  timestamp: string;
  error?: string;
}
