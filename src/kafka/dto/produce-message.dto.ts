import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ProduceMessageDto {
  @ApiProperty({
    description: 'The topic to send the message to',
    example: 'user-events',
  })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({
    description: 'The message key for partitioning',
    example: 'user-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({
    description: 'The message payload',
    example: { eventType: 'USER_CREATED', userId: '123', timestamp: '2024-01-01T00:00:00Z' },
  })
  @IsObject()
  @IsNotEmpty()
  value: Record<string, any>;

  @ApiProperty({
    description: 'Optional headers for the message',
    example: { correlationId: 'abc-123', source: 'api' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}
