# Production-Ready Testing for Cloudflare Workers

This directory contains production-ready testing utilities and examples for Cloudflare Workers applications using the official `@cloudflare/vitest-pool-workers` integration.

## Overview

Our testing approach uses the **official Cloudflare Workers Vitest integration** which runs tests inside the actual Workers runtime (`workerd`). This ensures maximum compatibility between test and production environments.

### Key Benefits

- ✅ **Production Parity**: Tests run in the same runtime as production
- ✅ **Real Bindings**: Uses actual D1, KV, and Durable Object bindings
- ✅ **Isolated Storage**: Each test gets fresh, isolated storage
- ✅ **No Mocking Required**: Direct access to Workers APIs
- ✅ **TypeScript Support**: Full type safety with Workers types
- ✅ **Fast Execution**: Optimized for Workers runtime

## Architecture

```
src/shared/tests/
├── setup-cloudflare.ts      # Main Cloudflare Workers test setup
├── setup-db-cloudflare.ts   # D1 database-specific setup
├── examples/                # Production-ready test examples
└── README.md                # This documentation
```

## Configuration Files

### `vitest.config.ts`
Main Vitest configuration using `@cloudflare/vitest-pool-workers`:

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { 
          configPath: './wrangler.jsonc',
          environment: 'test' // Uses test environment from wrangler.jsonc
        },
      },
    },
    setupFiles: ['./src/shared/tests/setup-cloudflare.ts'],
  },
});
```

### `vitest.db.config.ts`
Database-specific configuration for D1 testing:

```typescript
export default defineWorkersConfig({
  test: {
    setupFiles: ['./src/shared/tests/setup-db-cloudflare.ts'],
    include: ['**/db/**/*.test.ts'],
  },
});
```

### `wrangler.jsonc`
Cloudflare Workers configuration with test environment:

```json
{
  "env": {
    "test": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "celebrum-ai-test",
          "database_id": "test-database-id"
        }
      ],
      "kv_namespaces": [
        {
          "binding": "CELEBRUM_KV",
          "id": "test-kv-namespace"
        }
      ]
    }
  }
}
```

## Test Setup Files

### `setup-cloudflare.ts`
Main setup file providing:
- Access to Workers runtime environment
- Helper functions for testing D1, KV, and Durable Objects
- Request/response utilities
- Test context creation

### `setup-db-cloudflare.ts`
Database-specific setup providing:
- Drizzle ORM instance with D1 binding
- Database cleanup utilities
- Raw SQL execution helpers
- Test data seeding functions

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db, truncateAllTables } from '../../../shared/tests/setup-db-cloudflare';
import { testEnv, testKVOperation } from '../../../shared/tests/setup-cloudflare';

describe('My Feature', () => {
  beforeEach(async () => {
    await truncateAllTables(); // Clean database
  });

  it('should work with D1 database', async () => {
    const result = await db.insert(users).values({
      telegramId: '123456789',
      username: 'testuser',
      role: 'free',
      status: 'active',
    }).returning();

    expect(result[0].telegramId).toBe('123456789');
  });

  it('should work with KV storage', async () => {
    await testKVOperation('CELEBRUM_KV', async (kv) => {
      await kv.put('test:key', 'test value');
      const value = await kv.get('test:key');
      expect(value).toBe('test value');
    });
  });
});
```

### Database Testing

```typescript
import { db, executeRawSQL, tableExists } from '../setup-db-cloudflare';

// Test with Drizzle ORM
const user = await db.insert(users).values(userData).returning();

// Test with raw SQL
const result = await executeRawSQL('SELECT COUNT(*) as count FROM users');

// Check table existence
const exists = await tableExists('users');
```

### KV Storage Testing

```typescript
import { testKVOperation } from '../setup-cloudflare';

await testKVOperation('CELEBRUM_KV', async (kv) => {
  await kv.put('key', 'value');
  const value = await kv.get('key');
  await kv.delete('key');
});
```

### Durable Objects Testing

```typescript
import { testDurableObjectOperation } from '../setup-cloudflare';

await testDurableObjectOperation(async (stub) => {
  const response = await stub.fetch(new Request('http://localhost/test'));
  return response.json();
});
```

## Running Tests

### All Tests
```bash
pnpm test
```

### Database Tests Only
```bash
pnpm test:db
```

### Unit Tests
```bash
pnpm test:unit
```

### With Coverage
```bash
pnpm test:coverage
```

### CI/CD
```bash
pnpm test:ci
```

## Best Practices

### 1. Use Real Bindings
❌ **Don't mock Cloudflare APIs**
```typescript
// Bad - mocking D1
const mockDb = vi.mock('drizzle-orm/d1');
```

✅ **Use actual bindings**
```typescript
// Good - using real D1 binding
import { db } from '../setup-db-cloudflare';
```

### 2. Clean Up Between Tests
❌ **Don't leave test data**
```typescript
it('should create user', async () => {
  await db.insert(users).values(userData);
  // No cleanup - affects other tests
});
```

✅ **Always clean up**
```typescript
beforeEach(async () => {
  await truncateAllTables();
});
```

### 3. Use Test-Specific Data
❌ **Don't use production-like data**
```typescript
const userData = {
  telegramId: '123456789', // Could conflict
  username: 'john_doe',
};
```

✅ **Use test prefixes**
```typescript
const userData = {
  telegramId: 'test_123456789', // Clear test data
  username: 'test_user_' + Date.now(),
};
```

### 4. Test Error Conditions
```typescript
it('should handle constraint violations', async () => {
  await db.insert(users).values(userData);
  
  // Should fail on duplicate telegramId
  await expect(
    db.insert(users).values(userData)
  ).rejects.toThrow();
});
```

### 5. Test Transactions
```typescript
it('should handle transactions', async () => {
  const result = await db.transaction(async (tx) => {
    const user = await tx.insert(users).values(userData).returning();
    await tx.insert(userHistory).values({
      userId: user[0].id,
      // ... other fields
    });
    return user[0];
  });

  expect(result).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **"D1 database binding not available"**
   - Check `wrangler.jsonc` test environment configuration
   - Ensure database binding name matches

2. **"Failed to terminate worker"**
   - This is normal and can be ignored
   - Related to Workers runtime cleanup

3. **Tests timing out**
   - Increase `testTimeout` in vitest config
   - Check for unresolved promises

4. **Type errors with Workers APIs**
   - Ensure `@cloudflare/workers-types` is installed
   - Check TypeScript configuration

### Debug Mode

Enable debug logging:
```typescript
// In vitest config
poolOptions: {
  workers: {
    miniflare: {
      logLevel: 'debug',
    },
  },
},
```

## Examples

See `src/shared/tests/examples/production-ready-test.test.ts` for comprehensive examples of:
- D1 database operations
- KV storage operations  
- Durable Objects interaction
- HTTP request handling
- Error handling
- Performance testing
- Concurrent operations

## Migration from Mock-Based Testing

If migrating from mock-based tests:

1. Remove mock setup files
2. Update test imports to use real bindings
3. Add proper cleanup in `beforeEach`/`afterEach`
4. Update assertions to work with real data
5. Test error conditions properly

This approach ensures your tests accurately reflect production behavior and catch issues that mocks might miss.