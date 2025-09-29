import { Controller, Post, Get, Body, Param, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { KafkaProducerService } from '../services/kafka-producer.service';
import { KafkaConsumerService } from '../services/kafka-consumer.service';
import { EventStorageService } from '../services/event-storage.service';
import { ProduceMessageDto } from '../dto/produce-message.dto';
import { KafkaMessageDto } from '../dto/kafka-message.dto';

@ApiTags('kafka')
@Controller('api/kafka')
export class KafkaController {
  constructor(
    private readonly producerService: KafkaProducerService,
    private readonly consumerService: KafkaConsumerService,
    private readonly eventStorage: EventStorageService,
  ) {}

  @Post('produce')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Produce a message to Kafka',
    description: 'Send a message to a specified Kafka topic',
  })
  @ApiResponse({
    status: 201,
    description: 'Message produced successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        messageId: { type: 'string', example: 'msg-123-456' },
        topic: { type: 'string', example: 'user-events' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to produce message',
  })
  async produce(@Body() dto: ProduceMessageDto) {
    return this.producerService.produce(dto.topic, dto.value, dto.key, dto.headers);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all consumed messages',
    description: 'Retrieve all messages that have been consumed from Kafka',
  })
  @ApiQuery({
    name: 'topic',
    required: false,
    description: 'Filter messages by topic',
    example: 'user-events',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'processed', 'failed'],
    description: 'Filter messages by status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Limit the number of messages returned',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [KafkaMessageDto],
  })
  getMessages(
    @Query('topic') topic?: string,
    @Query('status') status?: 'pending' | 'processed' | 'failed',
    @Query('limit') limit?: string,
  ): KafkaMessageDto[] {
    let messages = topic
      ? this.eventStorage.getEventsByTopic(topic)
      : this.eventStorage.getAllEvents();

    if (status) {
      messages = messages.filter((m) => m.status === status);
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        messages = messages.slice(0, limitNum);
      }
    }

    return messages;
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get Kafka statistics',
    description: 'Retrieve statistics about produced and consumed messages',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 100 },
        byTopic: {
          type: 'object',
          example: { 'user-events': 50, 'system-events': 30 },
        },
        byStatus: {
          type: 'object',
          example: { pending: 10, processed: 80, failed: 10 },
        },
        subscribedTopics: {
          type: 'array',
          items: { type: 'string' },
          example: ['user-events', 'system-events'],
        },
      },
    },
  })
  getStats() {
    const stats = this.eventStorage.getStats();
    const subscribedTopics = this.consumerService.getSubscribedTopics();

    return {
      ...stats,
      subscribedTopics,
    };
  }

  @Get('topics')
  @ApiOperation({
    summary: 'Get subscribed topics',
    description: 'Retrieve the list of topics the consumer is subscribed to',
  })
  @ApiResponse({
    status: 200,
    description: 'Topics retrieved successfully',
    type: [String],
  })
  getTopics() {
    return {
      topics: this.consumerService.getSubscribedTopics(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get message by ID',
    description: 'Retrieve a specific message by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID',
    example: 'msg-123-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Message retrieved successfully',
    type: KafkaMessageDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  getMessage(@Param('id') id: string) {
    const message = this.eventStorage.getEvent(id);
    if (!message) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Message not found',
      };
    }
    return message;
  }

  @Post('produce-batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Produce multiple messages to Kafka',
    description: 'Send multiple messages to a specified Kafka topic',
  })
  @ApiResponse({
    status: 201,
    description: 'Messages produced successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          messageId: { type: 'string' },
          topic: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
    },
  })
  async produceBatch(
    @Body()
    dto: {
      topic: string;
      messages: Array<{ key?: string; value: any; headers?: Record<string, string> }>;
    },
  ) {
    return this.producerService.produceMany(dto.topic, dto.messages);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscribe to a new topic',
    description: 'Subscribe the consumer to a new Kafka topic',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to topic',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to subscribe to topic',
  })
  async subscribe(@Body() dto: { topic: string }) {
    await this.consumerService.subscribeToTopic(dto.topic);
    return {
      success: true,
      message: `Subscribed to topic: ${dto.topic}`,
      subscribedTopics: this.consumerService.getSubscribedTopics(),
    };
  }
}
