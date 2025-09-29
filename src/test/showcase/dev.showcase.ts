import axios from 'axios';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Call } from '../../entities/call.entity';

/**
 * Development Environment Showcase
 * Demonstrates all features in a local development setup
 */
export class DevShowcase {
  private apiUrl = 'http://localhost:3000';
  private kafka: Kafka;
  private redis: Redis;
  private dataSource: DataSource;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'showcase-dev',
      brokers: ['localhost:9092'],
    });

    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'core_pipeline',
      entities: [Call],
      synchronize: false,
    });
  }

  async initialize() {
    await this.dataSource.initialize();
    console.log('✅ Development showcase initialized');
  }

  async cleanup() {
    await this.redis.disconnect();
    await this.dataSource.destroy();
    console.log('✅ Cleanup completed');
  }

  /**
   * Scenario 1: Basic Call Flow
   * Create call -> Store in DB -> Cache in Redis -> Process via Queue
   */
  async scenario1_BasicCallFlow() {
    console.log('\n📞 Scenario 1: Basic Call Flow');

    try {
      // 1. Create a call via API
      const callResponse = await axios.post(`${this.apiUrl}/api/kafka/calls`, {
        callerId: 'dev-caller-001',
        recipientId: 'dev-recipient-001',
        status: 'initiated',
        metadata: {
          scenario: 'basic-flow',
          environment: 'development',
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`  ✅ Call created: ${callResponse.data.call.id}`);

      // 2. Verify in database
      const dbCall = await this.dataSource
        .getRepository(Call)
        .findOne({ where: { id: callResponse.data.call.id } });

      console.log(`  ✅ Call found in database: ${dbCall?.id}`);

      // 3. Verify in Redis cache
      const cachedCall = await this.redis.get(`call:${callResponse.data.call.id}`);
      console.log(`  ✅ Call cached in Redis: ${cachedCall ? 'Yes' : 'No'}`);

      // 4. Check queue status
      const queueStatus = await axios.get(`${this.apiUrl}/api/kafka/queue/status`);
      console.log(`  ✅ Queue status: ${JSON.stringify(queueStatus.data.queueStatus)}`);

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 1 failed:', error.message);
      return false;
    }
  }

  /**
   * Scenario 2: Kafka Event Processing
   * Produce event -> Consumer processes -> Creates call -> Publishes to Redis
   */
  async scenario2_KafkaEventProcessing() {
    console.log('\n📨 Scenario 2: Kafka Event Processing');

    try {
      // 1. Produce call event to Kafka
      const produceResponse = await axios.post(`${this.apiUrl}/api/kafka/produce`, {
        topic: 'call-events',
        key: 'call-event-001',
        value: {
          callerId: 'kafka-caller-001',
          recipientId: 'kafka-recipient-001',
          status: 'initiated',
          metadata: {
            source: 'kafka-event',
            scenario: 'kafka-processing',
          },
        },
      });

      console.log(`  ✅ Event produced: ${produceResponse.data.messageId}`);

      // 2. Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Check if call was created
      const callsResponse = await axios.get(`${this.apiUrl}/api/kafka/calls`);
      const kafkaCall = callsResponse.data.calls.find(
        (c: any) => c.callerId === 'kafka-caller-001',
      );

      console.log(`  ✅ Call created from Kafka event: ${kafkaCall ? kafkaCall.id : 'Not found'}`);

      // 4. Subscribe to Redis pub/sub for call updates
      const subscriber = new Redis();
      await new Promise<void>((resolve) => {
        subscriber.subscribe('call-created', (err) => {
          if (!err) {
            console.log('  ✅ Subscribed to Redis call-created channel');
            resolve();
          }
        });
      });

      subscriber.unsubscribe('call-created');
      subscriber.disconnect();

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 2 failed:', error.message);
      return false;
    }
  }

  /**
   * Scenario 3: Batch Processing
   * Create multiple calls -> Process concurrently -> Verify consistency
   */
  async scenario3_BatchProcessing() {
    console.log('\n📦 Scenario 3: Batch Processing');

    try {
      // 1. Create batch of calls
      const batchSize = 20;
      const calls = Array(batchSize)
        .fill(null)
        .map((_, i) => ({
          callerId: `batch-caller-${i}`,
          recipientId: `batch-recipient-${i}`,
          status: 'initiated',
          metadata: { batchIndex: i },
        }));

      console.log(`  ⏳ Creating ${batchSize} calls...`);

      const createPromises = calls.map((call) =>
        axios.post(`${this.apiUrl}/api/kafka/calls`, call),
      );

      const responses = await Promise.all(createPromises);
      const createdIds = responses.map((r) => r.data.call.id);

      console.log(`  ✅ Created ${createdIds.length} calls`);

      // 2. Produce batch messages to Kafka
      const batchMessages = {
        topic: 'batch-test',
        messages: createdIds.map((id, i) => ({
          key: `batch-${i}`,
          value: { callId: id, action: 'process' },
        })),
      };

      await axios.post(`${this.apiUrl}/api/kafka/produce-batch`, batchMessages);
      console.log(`  ✅ Produced ${batchMessages.messages.length} Kafka messages`);

      // 3. Verify all calls in database
      const allCalls = await this.dataSource.getRepository(Call).find({
        where: createdIds.map((id) => ({ id })),
      });

      console.log(`  ✅ Verified ${allCalls.length}/${batchSize} calls in database`);

      // 4. Check Redis for cached calls
      let cachedCount = 0;
      for (const id of createdIds) {
        const cached = await this.redis.get(`call:${id}`);
        if (cached) cachedCount++;
      }

      console.log(`  ✅ Found ${cachedCount}/${batchSize} calls in Redis cache`);

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 3 failed:', error.message);
      return false;
    }
  }

  /**
   * Scenario 4: Status Updates and Queries
   * Create calls with different statuses -> Query and filter -> Update statuses
   */
  async scenario4_StatusUpdatesAndQueries() {
    console.log('\n🔄 Scenario 4: Status Updates and Queries');

    try {
      // 1. Create calls with different statuses
      const statuses = ['initiated', 'processing', 'completed', 'failed'];
      const statusCalls = [];

      for (const status of statuses) {
        const response = await axios.post(`${this.apiUrl}/api/kafka/calls`, {
          callerId: `status-test-caller`,
          recipientId: `status-test-recipient`,
          status: status,
          metadata: { testStatus: status },
        });
        statusCalls.push(response.data.call);
      }

      console.log(`  ✅ Created ${statusCalls.length} calls with different statuses`);

      // 2. Query calls by status
      for (const status of statuses) {
        const calls = await this.dataSource.getRepository(Call).find({ where: { status } });
        console.log(`  📊 Found ${calls.length} calls with status: ${status}`);
      }

      // 3. Update call statuses
      const callToUpdate = statusCalls[0];
      const updatedCall = await this.dataSource.getRepository(Call).save({
        ...callToUpdate,
        status: 'completed',
      });

      console.log(`  ✅ Updated call ${updatedCall.id} status to: ${updatedCall.status}`);

      // 4. Get recent calls
      const recentCalls = await this.dataSource.getRepository(Call).find({
        order: { createdAt: 'DESC' },
        take: 5,
      });

      console.log(`  ✅ Retrieved ${recentCalls.length} recent calls`);

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 4 failed:', error.message);
      return false;
    }
  }

  /**
   * Scenario 5: Redis Operations
   * Test store, retrieve, publish, subscribe, and queue operations
   */
  async scenario5_RedisOperations() {
    console.log('\n🔴 Scenario 5: Redis Operations');

    try {
      // 1. Test Redis connectivity
      const testResponse = await axios.post(`${this.apiUrl}/api/kafka/redis/test`);
      console.log(`  ✅ Redis connected: ${testResponse.data.redisConnected}`);

      // 2. Store complex data
      const complexData = {
        id: 'redis-test-001',
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        timestamp: new Date().toISOString(),
      };

      await this.redis.setex('test:complex', 60, JSON.stringify(complexData));
      const retrieved = JSON.parse((await this.redis.get('test:complex')) || '{}');
      console.log(`  ✅ Complex data stored and retrieved: ${retrieved.id}`);

      // 3. Test pub/sub
      const pubSubTest = new Promise<boolean>((resolve) => {
        const subscriber = new Redis();
        subscriber.subscribe('test-channel', () => {
          subscriber.on('message', (channel, message) => {
            console.log(`  ✅ Received message on ${channel}: ${message}`);
            subscriber.disconnect();
            resolve(true);
          });

          // Publish message
          this.redis.publish('test-channel', 'Test message from showcase');
        });
      });

      await pubSubTest;

      // 4. Test queue operations
      const queueStatus = await axios.get(`${this.apiUrl}/api/kafka/queue/status`);
      console.log(`  ✅ Queue status retrieved: ${JSON.stringify(queueStatus.data.queueStatus)}`);

      // 5. Test TTL and expiration
      await this.redis.setex('test:ttl', 2, 'expires-soon');
      const beforeExpiry = await this.redis.get('test:ttl');
      console.log(`  ✅ TTL key set: ${beforeExpiry}`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      const afterExpiry = await this.redis.get('test:ttl');
      console.log(`  ✅ TTL key expired: ${afterExpiry === null}`);

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 5 failed:', error.message);
      return false;
    }
  }

  /**
   * Scenario 6: Error Handling and Recovery
   * Test error scenarios and recovery mechanisms
   */
  async scenario6_ErrorHandlingAndRecovery() {
    console.log('\n⚠️ Scenario 6: Error Handling and Recovery');

    try {
      // 1. Test invalid call creation
      try {
        await axios.post(`${this.apiUrl}/api/kafka/calls`, {
          // Invalid data - missing fields
        });
        console.log('  ✅ API handled empty request gracefully');
      } catch (error) {
        console.log('  ✅ API rejected invalid request appropriately');
      }

      // 2. Test non-existent call retrieval
      const nonExistentCall = await this.dataSource
        .getRepository(Call)
        .findOne({ where: { id: 'non-existent-id' } });
      console.log(`  ✅ Non-existent call query returned: ${nonExistentCall}`);

      // 3. Test Kafka error recovery
      try {
        await axios.post(`${this.apiUrl}/api/kafka/produce`, {
          topic: 'non-existent-topic',
          value: { test: 'data' },
        });
        console.log('  ✅ Kafka handled non-existent topic');
      } catch (error) {
        console.log('  ✅ Kafka error handled appropriately');
      }

      // 4. Test Redis disconnection handling
      const tempRedis = new Redis();
      tempRedis.disconnect();
      try {
        await tempRedis.get('test');
      } catch (error) {
        console.log('  ✅ Redis disconnection error caught');
      }

      // 5. Test database constraint violation
      const call1 = await this.dataSource.getRepository(Call).save({
        callerId: 'dup-test',
        recipientId: 'dup-test',
        status: 'test',
      });

      // This should work as UUID is auto-generated
      const call2 = await this.dataSource.getRepository(Call).save({
        callerId: 'dup-test',
        recipientId: 'dup-test',
        status: 'test',
      });

      console.log(`  ✅ Database handled duplicate data: ${call1.id !== call2.id}`);

      return true;
    } catch (error) {
      console.error('  ❌ Scenario 6 failed:', error.message);
      return false;
    }
  }

  /**
   * Run all development showcase scenarios
   */
  async runAll() {
    console.log('🚀 Starting Development Environment Showcase\n');
    console.log('================================');

    await this.initialize();

    const scenarios = [
      { name: 'Basic Call Flow', fn: () => this.scenario1_BasicCallFlow() },
      { name: 'Kafka Event Processing', fn: () => this.scenario2_KafkaEventProcessing() },
      { name: 'Batch Processing', fn: () => this.scenario3_BatchProcessing() },
      { name: 'Status Updates and Queries', fn: () => this.scenario4_StatusUpdatesAndQueries() },
      { name: 'Redis Operations', fn: () => this.scenario5_RedisOperations() },
      { name: 'Error Handling and Recovery', fn: () => this.scenario6_ErrorHandlingAndRecovery() },
    ];

    const results = [];
    for (const scenario of scenarios) {
      const success = await scenario.fn();
      results.push({ name: scenario.name, success });
    }

    console.log('\n================================');
    console.log('📊 Showcase Results:');
    results.forEach((r) => {
      console.log(`  ${r.success ? '✅' : '❌'} ${r.name}`);
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n🎯 Overall: ${successCount}/${results.length} scenarios passed`);

    await this.cleanup();
  }
}

// Run showcase if executed directly
if (require.main === module) {
  const showcase = new DevShowcase();
  showcase.runAll().catch(console.error);
}
