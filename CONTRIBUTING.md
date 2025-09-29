# Contributing to Core Pipeline

Thank you for your interest in contributing to Core Pipeline! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful and inclusive** - We welcome contributors from all backgrounds
- **Be collaborative** - Work together to resolve conflicts and find solutions
- **Be professional** - Keep discussions focused on the technical aspects
- **Be patient** - Remember that everyone was new once

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- Docker (optional, for full development environment)
- SQLite (automatically installed with npm dependencies)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/core-pipeline.git
   cd core-pipeline
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/uz0/core-pipeline.git
   ```

## Development Setup

### Quick Start Options

#### Option 1: Full Development Environment (Recommended)

Includes PostgreSQL, Redis, and Kafka for full feature testing:

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start all services and application
npm run dev
```

This command will:
- Start Docker services (PostgreSQL, Redis, Kafka)
- Create database if it doesn't exist
- Run migrations automatically
- Start the application with hot-reload

#### Option 2: Minimal Development (No Docker Required)

For quick development without external dependencies:

```bash
# Install dependencies
npm install

# Start in minimal mode
npm run start:minimal
```

This runs with:
- SQLite database (stored in `./dev.sqlite`)
- No Redis (caching disabled)
- No Kafka (messaging disabled)
- All API endpoints functional (with limited features)

#### Option 3: Standard Development

If you already have Docker services running:

```bash
npm start
```

### Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with watch mode |
| `npm run dev` | Full development setup (Docker + migrations + app) |
| `npm run start:minimal` | Start without external dependencies |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint with auto-fix |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run migration:generate -- -n Name` | Generate new migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

1. **Clear title and description**
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment details** (OS, Node version, etc.)
6. **Logs or error messages**
7. **Screenshots** (if applicable)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

1. **Use case** - Why is this enhancement needed?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - What other solutions did you consider?
4. **Additional context** - Any mockups, examples, or references

### First-Time Contributors

Look for issues tagged with:
- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the existing code style
- Add/update tests as needed
- Update documentation if necessary

### 3. Test Your Changes

```bash
# Run linting
npm run lint

# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run different test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Tests with coverage
npm run test:watch      # Tests in watch mode
```

### 4. Commit Your Changes

See [Commit Message Guidelines](#commit-message-guidelines) below.

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Keep functions small and focused
- Add JSDoc comments for public APIs

### File Organization

```typescript
// 1. Imports (grouped and ordered)
import { Injectable } from '@nestjs/common';  // Framework
import { SomeService } from './services';     // Internal
import { External } from 'external-lib';       // External

// 2. Decorators
@Injectable()

// 3. Class definition
export class MyService {
  // 4. Constructor
  constructor(private readonly service: SomeService) {}

  // 5. Public methods
  public async doSomething(): Promise<void> {
    // Implementation
  }

  // 6. Private methods
  private helperMethod(): void {
    // Implementation
  }
}
```

### NestJS Best Practices

- Use dependency injection
- Keep controllers thin, business logic in services
- Use DTOs for request/response validation
- Implement proper error handling
- Use guards, interceptors, and pipes appropriately

## Testing Guidelines

### Test Structure

```
├── src/
│   ├── **/*.spec.ts           # Unit tests (co-located with source)
│   └── test/
│       ├── integration/        # Integration tests
│       ├── unit/              # Additional unit tests
│       ├── e2e/               # E2E tests (src-based)
│       └── showcase/          # Showcase/demo scenarios
└── test/
    └── *.e2e-spec.ts          # E2E test suites
```

### Unit Tests

- Test files should be co-located with source files
- Name test files as `*.spec.ts`
- Aim for high coverage of business logic
- Mock external dependencies
- Focus on single responsibility

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Integration Tests

Integration tests verify multiple components working together:

- Database operations with repositories
- Message queue processing
- External service interactions
- Multi-service workflows

Location: `src/test/integration/`

### E2E Tests

- Test complete user flows through API endpoints
- Use realistic test data
- Clean up test data after tests
- Test both success and error cases
- Verify response structure and status codes

Location: `test/*.e2e-spec.ts`

### Performance Tests

When adding performance-critical features:

- Test response time under load
- Verify concurrent operation handling
- Check memory usage patterns
- Test with large datasets

### Test Coverage

Maintain minimum coverage levels:
- Overall: 80%
- Critical business logic: 90%
- Controllers: 85%
- Services: 85%

Check coverage: `npm run test:cov`

### Testing Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Names**: Use descriptive test names that explain what's being tested
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Services**: Don't rely on external services in unit tests
5. **Clean Up**: Always clean up test data
6. **Test Edge Cases**: Include boundary conditions and error scenarios
7. **Use Fixtures**: Create reusable test data
8. **Avoid Magic Numbers**: Use named constants for test values

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or corrections
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
# Feature
git commit -m "feat(kafka): add batch message processing"

# Bug fix
git commit -m "fix(redis): handle connection timeout gracefully"

# Documentation
git commit -m "docs: update contributing guidelines"

# Breaking change
git commit -m "feat(api)!: change response format for /calls endpoint

BREAKING CHANGE: Response now returns array instead of object"
```

## Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all tests pass**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

3. **Update documentation** if needed

4. **Write clear PR description** using the template

### PR Requirements

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] Branch is up-to-date with main
- [ ] No console.logs or debugging code
- [ ] PR description clearly describes changes

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. All feedback addressed
4. Final CI/CD pipeline passes

## Project Structure

```
core-pipeline/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # HTTP controllers
│   ├── entities/         # Database entities
│   ├── kafka/           # Kafka module
│   │   ├── services/    # Kafka services
│   │   ├── dto/         # Data transfer objects
│   │   └── interfaces/  # TypeScript interfaces
│   ├── middleware/      # Express middleware
│   ├── migrations/      # Database migrations
│   ├── repositories/    # Data repositories
│   ├── services/        # Business logic services
│   ├── telemetry/       # Monitoring and tracing
│   ├── test/           # Test utilities and fixtures
│   └── main.ts         # Application entry point
├── test/               # E2E tests
├── scripts/            # Utility scripts
├── docker-compose.yml  # Docker services configuration
└── package.json        # Dependencies and scripts
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Create database manually
./scripts/setup-db.sh

# Or use minimal mode (SQLite)
npm run start:minimal
```

#### Port Conflicts

```bash
# Use different port
PORT=3001 npm start
```

#### Redis Connection Issues

The application handles Redis unavailability gracefully. To run with Redis:

```bash
docker-compose up -d redis
```

#### Kafka Connection Issues

The application handles Kafka unavailability gracefully. To run with Kafka:

```bash
docker-compose up -d kafka
```

#### Test Failures

```bash
# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- --testNamePattern="specific test name"
```

### Getting Help

- Check existing [issues](https://github.com/uz0/core-pipeline/issues)
- Review [documentation](./README.md)
- Ask in discussions
- Contact maintainers

## API Documentation

When running locally, interactive API documentation is available at:
- Swagger UI: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics

## Database Information

- **Development**: `core_pipeline_dev` (PostgreSQL) or `./dev.sqlite` (minimal mode)
- **Test**: In-memory SQLite
- **Production**: `core_pipeline` (PostgreSQL)

Migrations run automatically in development mode.

## Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |
| `DB_HOST` | Database host | `localhost` |
| `REDIS_HOST` | Redis host | `localhost` |
| `KAFKA_BROKER` | Kafka broker URL | `localhost:9092` |
| `MINIMAL_DEV` | Use SQLite for development | `false` |
| `ENABLE_SWAGGER` | Enable Swagger docs | `true` |

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to open an issue for any questions about contributing!

---

Thank you for contributing to Core Pipeline! 🚀