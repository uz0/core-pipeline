import { ApiProperty } from '@nestjs/swagger';

export class KafkaMessageDto {
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: 'msg-123-456',
  })
  id: string;

  @ApiProperty({
    description: 'The topic the message was sent to or received from',
    example: 'user-events',
  })
  topic: string;

  @ApiProperty({
    description: 'The partition number',
    example: 0,
  })
  partition: number;

  @ApiProperty({
    description: 'The offset of the message',
    example: '12345',
  })
  offset: string;

  @ApiProperty({
    description: 'The message key',
    example: 'user-123',
    required: false,
  })
  key?: string;

  @ApiProperty({
    description: 'The message value/payload',
    example: { eventType: 'USER_CREATED', userId: '123' },
  })
  value: any;

  @ApiProperty({
    description: 'Message headers',
    example: { correlationId: 'abc-123' },
    required: false,
  })
  headers?: Record<string, string>;

  @ApiProperty({
    description: 'Timestamp when the message was created',
    example: '2024-01-01T00:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Processing status',
    enum: ['pending', 'processed', 'failed'],
    example: 'processed',
  })
  status: 'pending' | 'processed' | 'failed';
}
