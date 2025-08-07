# Testing Guide for Celebrum AI

This document provides comprehensive information about the testing setup, strategies, and best practices for the Celebrum AI trading platform.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Configuration](#configuration)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)

## Overview

Our testing strategy follows a multi-layered approach:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between different modules
- **End-to-End Tests**: Test complete user workflows and system behavior
- **Performance Tests**: Validate system performance under load

## Test Structure

```
src/
├── db/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── services/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── shared/
│   └── tests/
│       ├── unit/
│       │   └── services.test.ts
│       ├── integration/
│       │   └── database.test.ts
│       ├── e2e/
│       │   └── database-scenarios.test.ts
│       └── setup.ts
├── telegram-bot/
│   └── tests/
│       ├── unit/
│       │   └── telegram-webhook.test.ts
│       ├── integration/
│       └── e2e/
└── web/
    └── tests/
        ├── unit/
        ├── integration/
        │   └── api-endpoints.test.ts
        └── e2e/
            └── user-flow.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run CI tests (verbose output + coverage)
pnpm test:ci
```

### Test by Type

```bash
# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# End-to-end tests only
pnpm test:e2e
```

### Test by Module

```bash
# Telegram bot tests
pnpm test:telegram

# Web application tests
pnpm test:web

# Shared services tests
pnpm test:shared

# Services tests
pnpm test:services

# Database tests
pnpm test:db
```

### Advanced Test Runner

```bash
# Use the custom test runner
pnpm test:runner

# Run all tests with detailed reporting
pnpm test:all

# Generate comprehensive coverage report
pnpm test:report
```

## Test Types

### Unit Tests

**Purpose**: Test individual functions, classes, and components in isolation.

**Location**: `src/*/tests/unit/`

**Examples**:
- Service method validation
- Utility function testing
- Component behavior testing
- Error handling validation

**Best Practices**:
- Mock external dependencies
- Test edge cases and error conditions
- Keep tests fast and focused
- Use descriptive test names

### Integration Tests

**Purpose**: Test interactions between different modules and services.

**Location**: `src/*/tests/integration/`

**Examples**:
- API endpoint testing
- Database operations
- Service-to-service communication
- External API integrations

**Best Practices**:
- Use test databases or mock services
- Test realistic data flows
- Validate error propagation
- Test transaction boundaries

### End-to-End Tests

**Purpose**: Test complete user workflows and system behavior.

**Location**: `src/*/tests/e2e/`

**Examples**:
- User registration flow
- Telegram bot interactions
- Trading signal processing
- Web application workflows

**Best Practices**:
- Test critical user paths
- Use realistic test data
- Test error scenarios
- Validate system state changes

## Configuration

### Vitest Configuration

The main configuration is in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/shared/tests/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['.wrangler/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Test Setup

Global test setup is configured in `src/shared/tests/setup.ts`:

- Mock implementations for external services
- Global test utilities
- Environment variable setup
- Common test fixtures

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### Mocking Guidelines

```typescript
// Mock external dependencies
vi.mock('@cloudflare/workers-types', () => ({
  // Mock implementation
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Use test utilities from setup.ts
import { TestUtils } from '@/shared/tests/setup';

const mockUser = TestUtils.createMockUser();
const mockResponse = TestUtils.createMockApiResponse();
```

### Async Testing

```typescript
it('should handle async operations', async () => {
  const promise = asyncFunction();
  
  await expect(promise).resolves.toBe('expected');
  // or
  await expect(promise).rejects.toThrow('error message');
});
```

## Coverage

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML coverage report
open coverage/index.html
```

### Coverage Exclusions

- Configuration files
- Type definitions
- Test files themselves
- Build artifacts

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: pnpm test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

### Pre-commit Hooks

```bash
# Run tests before commit
pnpm test:unit

# Run linting
pnpm lint

# Type checking
pnpm typecheck
```

## Best Practices

### General

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Organization**: Group related tests using `describe` blocks
3. **Test Independence**: Each test should be independent and not rely on others
4. **Mock Strategy**: Mock external dependencies but test real integrations
5. **Error Testing**: Always test error conditions and edge cases

### Performance

1. **Fast Tests**: Keep unit tests fast (< 100ms each)
2. **Parallel Execution**: Use Vitest's parallel execution capabilities
3. **Resource Cleanup**: Always clean up resources in `afterEach`
4. **Selective Testing**: Use test patterns to run specific test suites

### Maintenance

1. **Regular Updates**: Keep test dependencies updated
2. **Coverage Monitoring**: Monitor coverage trends over time
3. **Test Refactoring**: Refactor tests when code changes
4. **Documentation**: Keep this guide updated with new patterns

## Troubleshooting

### Common Issues

1. **Import Errors**: Check path aliases in `vitest.config.ts`
2. **Mock Issues**: Ensure mocks are properly reset between tests
3. **Async Issues**: Use proper async/await patterns
4. **Coverage Issues**: Check file inclusion/exclusion patterns

### Debug Mode

```bash
# Run tests in debug mode
pnpm test --reporter=verbose

# Run specific test file
pnpm test src/path/to/test.ts

# Run tests matching pattern
pnpm test --grep="pattern"
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed
5. Add integration tests for new APIs
6. Add E2E tests for new user flows

---

For questions or issues with testing, please refer to the [Vitest documentation](https://vitest.dev/) or create an issue in the repository.