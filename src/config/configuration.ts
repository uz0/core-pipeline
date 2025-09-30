export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  node_env: process.env.NODE_ENV || 'development',

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint:
      process.env.LOG_PRETTY === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.LOG_PRETTY !== 'false'),
  },

  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: process.env.METRICS_PREFIX || 'core_pipeline',
  },

  tracing: {
    enabled: process.env.TRACING_ENABLED !== 'false',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    serviceName: process.env.OTEL_SERVICE_NAME || 'core-pipeline',
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'core-pipeline',
    groupId: process.env.KAFKA_GROUP_ID || 'core-pipeline-group',
  },

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'core_pipeline',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
});
