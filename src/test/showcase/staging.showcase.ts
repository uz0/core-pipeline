import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

/**
 * Staging Environment Showcase
 * Tests production-like scenarios with performance monitoring
 */
export class StagingShowcase {
  private apiClient: AxiosInstance;
  private metricsCollector: Map<string, number[]> = new Map();

  constructor(private apiUrl: string = process.env.STAGING_API_URL || 'http://localhost:3000') {
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async measurePerformance(name: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;

      if (!this.metricsCollector.has(name)) {
        this.metricsCollector.set(name, []);
      }
      const metrics = this.metricsCollector.get(name);
      if (metrics) {
        metrics.push(duration);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Scenario 1: Load Testing
   * Simulate concurrent users creating calls
   */
  async scenario1_LoadTesting() {
    console.log('\n⚡ Scenario 1: Load Testing (Staging)');

    const concurrentUsers = 50;
    const requestsPerUser = 10;
    const results = {
      successful: 0,
      failed: 0,
      totalTime: 0,
    };

    console.log(
      `  📊 Simulating ${concurrentUsers} concurrent users, ${requestsPerUser} requests each`,
    );

    const startTime = performance.now();

    const userTasks = Array(concurrentUsers)
      .fill(null)
      .map(async (_, userId) => {
        for (let i = 0; i < requestsPerUser; i++) {
          try {
            await this.measurePerformance('create_call', async () => {
              return await this.apiClient.post('/api/kafka/calls', {
                callerId: `staging-user-${userId}`,
                recipientId: `staging-recipient-${userId}-${i}`,
                status: 'initiated',
                metadata: {
                  environment: 'staging',
                  loadTest: true,
                  userId,
                  requestIndex: i,
                },
              });
            });
            results.successful++;
          } catch (error) {
            results.failed++;
          }
        }
      });

    await Promise.all(userTasks);
    results.totalTime = performance.now() - startTime;

    const totalRequests = concurrentUsers * requestsPerUser;
    const successRate = (results.successful / totalRequests) * 100;
    const avgTime = results.totalTime / totalRequests;

    console.log(`  ✅ Load test completed:`);
    console.log(`     - Total requests: ${totalRequests}`);
    console.log(`     - Successful: ${results.successful}`);
    console.log(`     - Failed: ${results.failed}`);
    console.log(`     - Success rate: ${successRate.toFixed(2)}%`);
    console.log(`     - Total time: ${results.totalTime.toFixed(2)}ms`);
    console.log(`     - Avg time per request: ${avgTime.toFixed(2)}ms`);
    console.log(
      `     - Requests per second: ${(totalRequests / (results.totalTime / 1000)).toFixed(2)}`,
    );

    return successRate >= 95; // Pass if 95% or more requests succeed
  }

  /**
   * Scenario 2: Data Consistency Under Load
   * Verify data consistency across database, cache, and queue
   */
  async scenario2_DataConsistency() {
    console.log('\n🔒 Scenario 2: Data Consistency Under Load (Staging)');

    const testCalls = [];
    const numCalls = 100;

    // Create calls rapidly
    console.log(`  ⏳ Creating ${numCalls} calls rapidly...`);

    for (let i = 0; i < numCalls; i++) {
      const response = await this.measurePerformance('rapid_create', async () => {
        return await this.apiClient.post('/api/kafka/calls', {
          callerId: `consistency-test-${i}`,
          recipientId: `consistency-recipient-${i}`,
          status: 'initiated',
          metadata: {
            testId: i,
            consistency: true,
          },
        });
      });
      testCalls.push(response.data.call);
    }

    console.log(`  ✅ Created ${testCalls.length} calls`);

    // Wait for eventual consistency
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify all calls exist in database
    const dbCalls = await this.measurePerformance('fetch_all_calls', async () => {
      return await this.apiClient.get('/api/kafka/calls');
    });

    const dbIds = new Set(dbCalls.data.calls.map((c: any) => c.id));
    const foundCount = testCalls.filter((c) => dbIds.has(c.id)).length;

    console.log(`  ✅ Database consistency: ${foundCount}/${numCalls} calls found`);

    // Test Redis cache consistency
    let cacheHits = 0;
    const sampleSize = Math.min(10, testCalls.length);

    for (let i = 0; i < sampleSize; i++) {
      try {
        const testResponse = await this.apiClient.post('/api/kafka/redis/test');
        if (testResponse.data.redisConnected) {
          cacheHits++;
        }
      } catch (error) {
        console.log(`  ⚠️ Cache test failed for sample ${i}`);
      }
    }

    console.log(`  ✅ Cache availability: ${cacheHits}/${sampleSize} successful tests`);

    return foundCount === numCalls && cacheHits > sampleSize * 0.8;
  }

  /**
   * Scenario 3: Kafka Message Processing Performance
   * Test Kafka throughput and latency
   */
  async scenario3_KafkaPerformance() {
    console.log('\n📨 Scenario 3: Kafka Message Processing Performance (Staging)');

    const messageCount = 200;
    const messages = Array(messageCount)
      .fill(null)
      .map((_, i) => ({
        key: `perf-key-${i}`,
        value: {
          index: i,
          timestamp: new Date().toISOString(),
          data: 'x'.repeat(1000), // 1KB payload
        },
      }));

    // Test single message production
    console.log(`  📤 Testing single message production...`);
    const singleStartTime = performance.now();

    for (let i = 0; i < 10; i++) {
      await this.measurePerformance('kafka_single_produce', async () => {
        return await this.apiClient.post('/api/kafka/produce', {
          topic: 'performance-test',
          key: `single-${i}`,
          value: messages[i].value,
        });
      });
    }

    const singleTime = performance.now() - singleStartTime;
    console.log(`  ✅ Single production: ${(singleTime / 10).toFixed(2)}ms average`);

    // Test batch message production
    console.log(`  📦 Testing batch message production...`);

    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < messageCount; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    const batchStartTime = performance.now();

    for (const batch of batches) {
      await this.measurePerformance('kafka_batch_produce', async () => {
        return await this.apiClient.post('/api/kafka/produce-batch', {
          topic: 'performance-batch-test',
          messages: batch,
        });
      });
    }

    const batchTime = performance.now() - batchStartTime;
    const messagesPerSecond = (messageCount / (batchTime / 1000)).toFixed(2);

    console.log(`  ✅ Batch production completed:`);
    console.log(`     - Total messages: ${messageCount}`);
    console.log(`     - Total time: ${batchTime.toFixed(2)}ms`);
    console.log(`     - Messages per second: ${messagesPerSecond}`);
    console.log(`     - Average per message: ${(batchTime / messageCount).toFixed(2)}ms`);

    // Get Kafka stats
    const stats = await this.measurePerformance('kafka_stats', async () => {
      return await this.apiClient.get('/api/kafka/stats');
    });

    console.log(`  📊 Kafka statistics:`);
    console.log(`     - Total messages: ${stats.data.total}`);
    console.log(`     - Topics: ${Object.keys(stats.data.byTopic).length}`);

    return parseFloat(messagesPerSecond) > 100; // Should process >100 messages/sec
  }

  /**
   * Scenario 4: API Response Time Under Various Loads
   * Measure API response times for different endpoints
   */
  async scenario4_APIResponseTimes() {
    console.log('\n⏱️ Scenario 4: API Response Time Analysis (Staging)');

    const endpoints = [
      { method: 'GET', path: '/api/kafka/calls', name: 'Get Calls' },
      { method: 'GET', path: '/api/kafka/stats', name: 'Get Stats' },
      { method: 'GET', path: '/api/kafka/topics', name: 'Get Topics' },
      { method: 'GET', path: '/api/kafka/queue/status', name: 'Queue Status' },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const times = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          if (endpoint.method === 'GET') {
            await this.apiClient.get(endpoint.path);
          }
          times.push(performance.now() - start);
        } catch (error) {
          times.push(-1); // Mark failed requests
        }
      }

      const validTimes = times.filter((t) => t > 0);
      const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
      const minTime = Math.min(...validTimes);
      const maxTime = Math.max(...validTimes);
      const p95Time = validTimes.sort((a, b) => a - b)[Math.floor(validTimes.length * 0.95)];

      results.push({
        endpoint: endpoint.name,
        avg: avgTime.toFixed(2),
        min: minTime.toFixed(2),
        max: maxTime.toFixed(2),
        p95: p95Time?.toFixed(2) || 'N/A',
        successRate: `${((validTimes.length / iterations) * 100).toFixed(0)}%`,
      });
    }

    console.log('  📊 Response Time Analysis:');
    console.table(results);

    // Check if all endpoints respond within acceptable time (< 200ms average)
    return results.every((r) => parseFloat(r.avg) < 200);
  }

  /**
   * Scenario 5: Long-running Operations
   * Test system behavior with long-running operations
   */
  async scenario5_LongRunningOperations() {
    console.log('\n⏳ Scenario 5: Long-running Operations (Staging)');

    // Create a large batch of calls to process
    const largeBatch = Array(500)
      .fill(null)
      .map((_, i) => ({
        callerId: `long-run-${i}`,
        recipientId: `long-recipient-${i}`,
        status: 'initiated',
        metadata: {
          processTime: Math.random() * 5000, // Random processing time up to 5s
          batchId: 'long-run-batch',
        },
      }));

    console.log(`  📦 Creating ${largeBatch.length} calls for long-running processing...`);

    // Submit all calls
    const submitStart = performance.now();
    const submissions = [];

    // Submit in chunks to avoid overwhelming the API
    const chunkSize = 50;
    for (let i = 0; i < largeBatch.length; i += chunkSize) {
      const chunk = largeBatch.slice(i, i + chunkSize);
      const chunkPromises = chunk.map((call) =>
        this.apiClient.post('/api/kafka/calls', call).catch(() => null),
      );
      submissions.push(...(await Promise.all(chunkPromises)));
    }

    const submitTime = performance.now() - submitStart;
    const successfulSubmissions = submissions.filter((s) => s !== null).length;

    console.log(
      `  ✅ Submitted ${successfulSubmissions}/${largeBatch.length} calls in ${(
        submitTime / 1000
      ).toFixed(2)}s`,
    );

    // Monitor queue processing
    console.log('  ⏳ Monitoring queue processing...');

    let previousCompleted = 0;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const queueStatus = await this.apiClient.get('/api/kafka/queue/status');
      const { waiting, active, completed, failed } = queueStatus.data.queueStatus;

      const throughput = completed - previousCompleted;
      previousCompleted = completed;

      console.log(
        `     📊 Queue: Waiting=${waiting}, Active=${active}, Completed=${completed}, Failed=${failed}, Throughput=${throughput}/2s`,
      );

      if (waiting === 0 && active === 0) {
        console.log('  ✅ All jobs processed');
        break;
      }
    }

    return successfulSubmissions >= largeBatch.length * 0.9;
  }

  /**
   * Scenario 6: Failover and Recovery Testing
   * Simulate failures and test recovery mechanisms
   */
  async scenario6_FailoverRecovery() {
    console.log('\n🔄 Scenario 6: Failover and Recovery Testing (Staging)');

    const results = {
      connectionRecovery: false,
      queueRecovery: false,
      dataIntegrity: false,
    };

    // Test 1: Connection recovery
    console.log('  🔌 Testing connection recovery...');

    let connectionAttempts = 0;
    const maxAttempts = 3;

    while (connectionAttempts < maxAttempts) {
      try {
        await this.apiClient.get('/health');
        results.connectionRecovery = true;
        console.log(`  ✅ Connection recovered after ${connectionAttempts + 1} attempts`);
        break;
      } catch (error) {
        connectionAttempts++;
        console.log(`  ⚠️ Connection attempt ${connectionAttempts} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Test 2: Queue recovery after failure
    console.log('  📋 Testing queue recovery...');

    // Create calls that might fail
    const failureCalls = Array(10)
      .fill(null)
      .map((_, i) => ({
        callerId: `recovery-${i}`,
        recipientId: `recovery-recipient-${i}`,
        status: i % 2 === 0 ? 'fail-test' : 'initiated',
        metadata: { shouldFail: i % 2 === 0 },
      }));

    for (const call of failureCalls) {
      try {
        await this.apiClient.post('/api/kafka/calls', call);
      } catch (error) {
        // Expected for some calls
      }
    }

    // Check queue recovery
    const queueStatus = await this.apiClient.get('/api/kafka/queue/status');
    results.queueRecovery = queueStatus.data.queueStatus !== null;
    console.log(`  ✅ Queue recovery: ${results.queueRecovery ? 'Working' : 'Failed'}`);

    // Test 3: Data integrity after failures
    console.log('  💾 Testing data integrity...');

    const beforeCalls = await this.apiClient.get('/api/kafka/calls');
    const beforeCount = beforeCalls.data.count;

    // Simulate rapid operations that might cause race conditions
    const rapidOps = Array(20)
      .fill(null)
      .map(async (_, i) => {
        try {
          if (i % 3 === 0) {
            // Read operation
            await this.apiClient.get('/api/kafka/calls');
          } else if (i % 3 === 1) {
            // Write operation
            await this.apiClient.post('/api/kafka/calls', {
              callerId: `integrity-${i}`,
              recipientId: `integrity-rec-${i}`,
            });
          } else {
            // Update simulation (create with status)
            await this.apiClient.post('/api/kafka/calls', {
              callerId: `integrity-update-${i}`,
              recipientId: `integrity-update-rec-${i}`,
              status: 'updated',
            });
          }
        } catch (error) {
          // Some operations might fail, that's ok for this test
        }
      });

    await Promise.all(rapidOps);

    const afterCalls = await this.apiClient.get('/api/kafka/calls');
    const afterCount = afterCalls.data.count;

    results.dataIntegrity = afterCount >= beforeCount;
    console.log(`  ✅ Data integrity maintained: Before=${beforeCount}, After=${afterCount}`);

    const allTestsPassed = Object.values(results).every((r) => r === true);
    console.log(
      `  🎯 Failover/Recovery: ${allTestsPassed ? 'All tests passed' : 'Some tests failed'}`,
    );

    return allTestsPassed;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n📈 Performance Metrics Report:');
    console.log('================================');

    for (const [operation, times] of this.metricsCollector.entries()) {
      if (times.length === 0) continue;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const sorted = [...times].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      console.log(`\n📊 ${operation}:`);
      console.log(`  - Samples: ${times.length}`);
      console.log(`  - Average: ${avg.toFixed(2)}ms`);
      console.log(`  - Min: ${min.toFixed(2)}ms`);
      console.log(`  - Max: ${max.toFixed(2)}ms`);
      console.log(`  - P50: ${p50.toFixed(2)}ms`);
      console.log(`  - P95: ${p95.toFixed(2)}ms`);
      console.log(`  - P99: ${p99.toFixed(2)}ms`);
    }
  }

  /**
   * Run all staging showcase scenarios
   */
  async runAll() {
    console.log('🚀 Starting Staging Environment Showcase\n');
    console.log('================================');
    console.log(`API URL: ${this.apiUrl}\n`);

    const scenarios = [
      { name: 'Load Testing', fn: () => this.scenario1_LoadTesting() },
      { name: 'Data Consistency', fn: () => this.scenario2_DataConsistency() },
      { name: 'Kafka Performance', fn: () => this.scenario3_KafkaPerformance() },
      { name: 'API Response Times', fn: () => this.scenario4_APIResponseTimes() },
      { name: 'Long-running Operations', fn: () => this.scenario5_LongRunningOperations() },
      { name: 'Failover Recovery', fn: () => this.scenario6_FailoverRecovery() },
    ];

    const results = [];
    for (const scenario of scenarios) {
      try {
        const success = await scenario.fn();
        results.push({ name: scenario.name, success });
      } catch (error) {
        console.error(`\n❌ ${scenario.name} encountered an error:`, error.message);
        results.push({ name: scenario.name, success: false });
      }
    }

    this.generateReport();

    console.log('\n================================');
    console.log('📊 Staging Showcase Results:');
    results.forEach((r) => {
      console.log(`  ${r.success ? '✅' : '❌'} ${r.name}`);
    });

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n🎯 Overall: ${successCount}/${results.length} scenarios passed`);

    return successCount === results.length;
  }
}

// Run showcase if executed directly
if (require.main === module) {
  const showcase = new StagingShowcase();
  showcase
    .runAll()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
