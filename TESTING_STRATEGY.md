# Testing Strategy for Celebrum AI Trading Platform

## Overview

This document outlines the comprehensive testing strategy for the Celebrum AI Trading Platform, focusing on high-quality test cases that ensure proper functionality across the Telegram bot, web UI, API, and database layers.

## Testing Principles

- **Quality over Coverage**: Focus on meaningful tests that catch real issues
- **Entry Point Validation**: Ensure all user entry points work correctly
- **Functional Testing**: Verify end-to-end workflows work as expected
- **Headless Testing**: All browser tests run in headless mode using `pnpm`
- **Modular Organization**: Tests organized by module under respective `/tests` directories

## Test Structure

```
src/
├── telegram-bot/tests/
│   ├── unit/           # Unit tests for individual functions
│   ├── integration/    # Integration tests for handlers and services
│   └── e2e/           # End-to-end command flow tests
├── web/tests/
│   ├── unit/           # Component and utility tests
│   ├── integration/    # API integration tests
│   └── e2e/           # Browser-based user journey tests
├── shared/tests/
│   ├── unit/           # Shared utility and service tests
│   └── integration/    # Cross-service integration tests
├── db/tests/
│   ├── unit/           # Schema and query tests
│   └── integration/    # Database operation tests
└── services/tests/
    ├── unit/           # Service logic tests
    └── integration/    # Service interaction tests
```

## API Routes Confirmation

All API routes follow the `/api/` prefix pattern:
- `/api/telegram/webhook` - Telegram bot webhook
- `/api/status` - API health check
- `/api/health` - System health check
- `/api/storage/:id` - Durable Object storage access
- `/api/container/:id` - Container instance access

## Key Test Categories

### 1. Entry Point Tests

#### Landing Page Access
- ✅ Correct loading of Astro web UI
- ✅ Proper routing and navigation
- ✅ Error handling for invalid routes

#### Telegram Bot `/start` Command
- ✅ New user registration with invitation code
- ✅ Existing user authentication
- ✅ Invalid invitation code handling
- ✅ Missing invitation code scenarios
- ✅ Role-based access validation

### 2. Functional Tests

#### Telegram Bot Functionality
- Command processing and routing
- Session management
- User state persistence
- Rate limiting
- Error handling and recovery

#### Web UI Functionality
- Page rendering and navigation
- API communication
- User interaction flows
- Responsive design validation

#### API Functionality
- Request/response validation
- Authentication and authorization
- Data persistence
- Error responses

#### Database Functionality
- CRUD operations
- Data integrity
- Transaction handling
- Migration validation

### 3. Integration Tests

#### Cross-Service Communication
- Telegram bot ↔ Database
- Web UI ↔ API
- API ↔ Database
- Service ↔ External APIs

#### End-to-End Workflows
- Complete user registration flow
- Trading opportunity discovery
- Profile management
- Admin operations

## Test Execution

### Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run CI tests
pnpm test:ci

# Run specific module tests
pnpm test src/telegram-bot
pnpm test src/web
pnpm test src/shared

# Run headless browser tests
pnpm dlx playwright test
```

### Environment Setup
- Tests use mock services and databases
- Isolated test environments
- Configurable test data
- Headless browser execution

## Quality Gates

1. **All entry points must be tested**
2. **Critical user flows must pass**
3. **Error scenarios must be handled**
4. **Performance thresholds must be met**
5. **Security validations must pass**

## Implementation Priority

1. **High Priority**: Entry point tests (landing page, `/start` command)
2. **Medium Priority**: Core functionality tests
3. **Low Priority**: Edge case and performance tests

## Continuous Integration

- Tests run on every commit
- Blocking deployment on test failures
- Automated test result reporting
- Performance regression detection

This strategy ensures comprehensive testing while maintaining development velocity and code quality.