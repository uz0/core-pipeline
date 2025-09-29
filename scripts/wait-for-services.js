#!/usr/bin/env node

const { Client } = require('pg');
const redis = require('redis');
const { Kafka } = require('kafkajs');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000;

async function waitForPostgres() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USER || 'test_user',
    password: process.env.DATABASE_PASSWORD || 'test_password',
    database: process.env.DATABASE_NAME || 'test_db',
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('✅ PostgreSQL is ready');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for PostgreSQL... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('PostgreSQL failed to become ready');
}

async function waitForRedis() {
  const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.ping();
      await client.quit();
      console.log('✅ Redis is ready');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for Redis... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Redis failed to become ready');
}

async function waitForKafka() {
  const kafka = new Kafka({
    clientId: 'wait-for-kafka',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  const admin = kafka.admin();

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      console.log('✅ Kafka is ready');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for Kafka... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Kafka failed to become ready');
}

async function main() {
  const service = process.argv[2];
  
  try {
    switch (service) {
      case 'postgres':
        await waitForPostgres();
        break;
      case 'redis':
        await waitForRedis();
        break;
      case 'kafka':
        await waitForKafka();
        break;
      case 'all':
        await Promise.all([
          waitForPostgres(),
          waitForRedis(),
          waitForKafka(),
        ]);
        console.log('✅ All services are ready');
        break;
      default:
        console.error('Usage: wait-for-services.js [postgres|redis|kafka|all]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}