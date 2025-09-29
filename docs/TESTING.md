# Testing Documentation

## Overview

This project implements a comprehensive testing strategy including unit tests, integration tests, E2E tests, and performance tests. All tests are automated through GitHub Actions CI/CD pipeline.

## Test Structure

```
├── src/
│   ├── controllers/
│   │   ├── *.spec.ts          # Unit tests for controllers
│   ├── services/
│   │   ├── *.spec.ts          # Unit tests for services
│   ├── repositories/
│   │   ├── *.spec.ts          # Unit tests for repositories
│   └── test/
│       ├── integration/        # Integration tests
│       ├── showcase/           # Showcase scenarios
│       └── run-all-tests.ts   # Test runner
└── test/
    ├── *.e2e-spec.ts          # E2E test files
    └── jest-e2e.json          # E2E Jest configuration
```

## Types of Tests

### 1. Unit Tests

Unit tests focus on testing individual components in isolation.

**Location:** `src/**/*.spec.ts`

**Run command:**
```bash
npm run test
```

**Coverage:**
```bash
npm run test:cov
```

**Key Unit Tests:**
- `CallController` - Tests all CRUD operations for calls
- `RedisController` - Tests Redis cache, pub/sub, and queue operations
- `KafkaController` - Tests Kafka messaging functionality
- `ShowcaseController` - Tests showcase scenarios
- `CallRepository` - Tests database operations
- `RedisService` - Tests Redis operations

### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

**Location:** `src/test/integration/`

**Run command:**
```bash
npm run test:integration
```

**Covered Integrations:**
- Kafka + TypeORM
- Redis + Bull Queue
- TypeORM + PostgreSQL
- Kafka Consumer + Event Processing

### 3. E2E Tests

End-to-end tests verify complete user workflows through API endpoints.

**Location:** `test/*.e2e-spec.ts`

**Run command:**
```bash
npm run test:e2e
```

**E2E Test Files:**
- `app.e2e-spec.ts` - Basic app endpoints
- `call.e2e-spec.ts` - Call management API
- `redis.e2e-spec.ts` - Redis operations API
- `kafka.e2e-spec.ts` - Kafka messaging API
- `showcase.e2e-spec.ts` - Showcase scenarios API

### 4. Performance Tests

Performance tests measure system behavior under load.

**Run command:**
```bash
npm run test:performance
```

**Metrics Tested:**
- Response time under load
- Concurrent operation handling
- Large dataset processing
- Rapid successive operations

## Running Tests

### Local Development

1. **Start services:**
```bash
npm run docker:up
```

2. **Run all tests:**
```bash
npm run test:all
```

3. **Run specific test suites:**
```bash
# Unit tests only
npm run test

# E2E tests only
npm run test:e2e

# Integration tests only
npm run test:integration

# Performance tests
npm run test:performance
```

4. **Run with coverage:**
```bash
npm run test:cov
```

### Docker Environment

Run all tests in Docker environment:
```bash
npm run docker:test
```

This command will:
1. Start all required services (PostgreSQL, Redis, Kafka)
2. Wait for services to be ready
3. Run E2E tests
4. Tear down services

### CI/CD Pipeline

Tests run automatically on:
- Push to `main`, `develop`, or `typeorm` branches
- Pull requests to `main` or `develop`

## Test Scenarios

### Showcase Scenarios

The application includes comprehensive showcase scenarios that demonstrate all features:

1. **Basic Flow** - CRUD operations on calls
2. **Kafka Integration** - Message production and consumption
3. **Redis Operations** - Caching, pub/sub, and queue management
4. **Batch Processing** - Bulk operations handling
5. **Error Recovery** - Error handling and recovery mechanisms
6. **Performance Test** - System performance under load
7. **Full Integration** - Complete workflow across all components

Run showcase scenarios:
```bash
# Development environment
npm run test:showcase:dev

# Staging environment
npm run test:showcase:staging

# Production environment
npm run test:showcase:prod
```

## Test Coverage

Minimum coverage requirements:
- Overall: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Generate coverage report:
```bash
npm run test:cov
```

View coverage report:
```bash
open coverage/lcov-report/index.html
```

## Mocking Strategies

### Database Mocking
- Use `@nestjs/testing` TestingModule
- Mock repositories with jest.fn()
- Example in `call.controller.spec.ts`

### Redis Mocking
- Mock RedisService methods
- Simulate cache hits/misses
- Example in `redis.controller.spec.ts`

### Kafka Mocking
- Mock producer and consumer services
- Simulate message production/consumption
- Example in `kafka.controller.spec.ts`

## Test Data Management

### Fixtures
Test data fixtures are used for consistent testing:
```typescript
const mockCall = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  callerId: 'user-123',
  recipientId: 'user-456',
  status: 'initiated',
  createdAt: new Date('2024-01-01'),
};
```

### Database Cleanup
E2E tests clean up after each test:
```typescript
beforeEach(async () => {
  await callRepository.delete({});
});
```

## Debugging Tests

### Debug single test file:
```bash
npm run test:debug -- call.controller.spec.ts
```

### Debug E2E tests:
```bash
node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --config ./test/jest-e2e.json
```

### View test logs:
Set log level in tests:
```typescript
process.env.LOG_LEVEL = 'debug';
```

## Common Test Patterns

### Testing Controllers
```typescript
describe('CallController', () => {
  let controller: CallController;
  let repository: CallRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CallController],
      providers: [
        {
          provide: CallRepository,
          useValue: mockCallRepository,
        },
      ],
    }).compile();

    controller = module.get<CallController>(CallController);
  });

  it('should create a call', async () => {
    const dto = { callerId: 'user-1', recipientId: 'user-2' };
    mockCallRepository.createCall.mockResolvedValue(mockCall);
    
    const result = await controller.createCall(dto);
    
    expect(result.success).toBe(true);
    expect(result.call).toEqual(mockCall);
  });
});
```

### Testing Services
```typescript
describe('RedisService', () => {
  let service: RedisService;
  let redis: Redis;

  beforeEach(() => {
    redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    } as any;
    
    service = new RedisService(redis);
  });

  it('should store data', async () => {
    await service.store('key', { data: 'value' }, 60);
    
    expect(redis.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ data: 'value' }),
      'EX',
      60
    );
  });
});
```

### Testing E2E Flows
```typescript
describe('Call API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should create and retrieve a call', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/calls')
      .send({ callerId: 'user-1', recipientId: 'user-2' })
      .expect(201);

    const callId = createResponse.body.call.id;

    const getResponse = await request(app.getHttpServer())
      .get(`/api/calls/${callId}`)
      .expect(200);

    expect(getResponse.body.call.id).toBe(callId);
  });
});
```

## Troubleshooting

### Common Issues

1. **Database connection errors in tests**
   - Ensure PostgreSQL is running: `docker ps`
   - Check connection string in test environment

2. **Redis connection errors**
   - Verify Redis is running: `docker ps`
   - Check Redis port is not in use: `lsof -i :6379`

3. **Kafka connection errors**
   - Ensure Kafka and Zookeeper are running
   - Wait for Kafka to be ready: `npm run wait-for-kafka`

4. **Test timeouts**
   - Increase Jest timeout: `jest.setTimeout(30000)`
   - Check for unresolved promises
   - Verify async operations complete

5. **Flaky tests**
   - Add proper wait conditions
   - Use `waitFor` utilities
   - Ensure proper cleanup between tests

## Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests isolated** - Each test should be independent
3. **Use descriptive test names** - Clearly state what is being tested
4. **Mock external dependencies** - Don't make real API calls
5. **Test edge cases** - Include error scenarios
6. **Keep tests fast** - Use mocks instead of real services
7. **Maintain test data** - Use factories or fixtures
8. **Clean up after tests** - Reset state between tests
9. **Use proper assertions** - Be specific about expectations
10. **Document complex tests** - Add comments for clarity

## Continuous Integration

GitHub Actions runs tests on every push and PR:

1. **Lint** - Code style checking
2. **Unit Tests** - With coverage reporting
3. **E2E Tests** - Against test database
4. **Security Scan** - Dependency vulnerabilities
5. **Performance Tests** - On main branch only

See `.github/workflows/ci.yml` for complete pipeline configuration.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)