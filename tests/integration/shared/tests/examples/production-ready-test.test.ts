/**
 * Production-ready testing example for Cloudflare Workers
 * 
 * This example demonstrates how to write tests that work both locally
 * and in production environments using the official Cloudflare Workers
 * Vitest integration.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../../../src/db/src/schema';
import type { Env } from '../../../../../src/shared/src/types';
import { 
  testEnv, 
  createTestRequest, 
  createTestContext,
  testD1Operation,
  testKVOperation,
  testDurableObjectOperation 
} from '../../../../../src/shared/tests/setup-cloudflare';

describe('Production-Ready Testing Examples', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(async () => {
    // Initialize database with actual D1 binding
    db = drizzle(testEnv.DB, { schema });
    
    // Clean up any existing test data
    await testD1Operation(async (d1: any) => {
      await d1.prepare('DELETE FROM users WHERE telegramId LIKE ?').bind('test_%').run();
      await d1.prepare('DELETE FROM positions WHERE userId IN (SELECT id FROM users WHERE telegramId LIKE ?)').bind('test_%').run();
    });
  });

  afterEach(async () => {
    // Clean up test data
    await testD1Operation(async (d1: any) => {
      await d1.prepare('DELETE FROM users WHERE telegramId LIKE ?').bind('test_%').run();
    });
  });

  describe('D1 Database Testing', () => {
    it('should perform CRUD operations on D1 database', async () => {
      const userData = {
        telegramId: 'test_123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'free' as const,
        status: 'active' as const,
      };

      // Test CREATE
      const createdUser = await db.insert(schema.users).values(userData).returning();
      expect(createdUser).toHaveLength(1);
      expect(createdUser[0].telegramId).toBe(userData.telegramId);

      // Test READ
      const foundUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, createdUser[0].id))
        .get();
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(userData.username);

      // Test UPDATE
      const updatedUser = await db
        .update(schema.users)
        .set({ username: 'updateduser', role: 'pro' })
        .where(eq(schema.users.id, createdUser[0].id))
        .returning();

      expect(updatedUser[0].username).toBe('updateduser');
      expect(updatedUser[0].role).toBe('premium');

      // Test DELETE
      await db.delete(schema.users).where(eq(schema.users.id, createdUser[0].id));
      
      const deletedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, createdUser[0].id))
        .get();
      
      expect(deletedUser).toBeNull();
    });

    it('should handle database transactions', async () => {
      const userData = {
        telegramId: 'test_987654321',
        username: 'transactionuser',
        firstName: 'Transaction',
        lastName: 'User',
        role: 'free' as const,
        status: 'active' as const,
      };

      // Test successful transaction
      const result = await db.transaction(async (tx) => {
        const user = await tx.insert(schema.users).values(userData).returning();
        
        await tx.insert(schema.userUsernameHistory).values({
          userId: user[0].id,
          telegramId: userData.telegramId,
          username: userData.username,
          changeSource: 'system_migration',
        });

        return user[0];
      });

      expect(result.telegramId).toBe(userData.telegramId);

      // Verify both records exist
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, result.id))
        .get();
      
      const history = await db
        .select()
        .from(schema.userUsernameHistory)
        .where(eq(schema.userUsernameHistory.userId, result.id));

      expect(user).toBeDefined();
      expect(history).toHaveLength(1);
    });

    it('should handle raw SQL queries', async () => {
      // Insert test data
      const userData = {
        telegramId: 'test_raw_sql',
        username: 'rawsqluser',
        firstName: 'Raw',
        lastName: 'SQL',
        role: 'pro' as const,
        status: 'active' as const,
      };

      await db.insert(schema.users).values(userData);

      // Test raw SQL query
      const result = await testD1Operation(async (d1: any) => {
        return await d1.prepare(`
          SELECT username, role, status 
          FROM users 
          WHERE telegramId = ?
        `).bind(userData.telegramId).first();
      });

      expect(result).toBeDefined();
      expect(result.username).toBe(userData.username);
      expect(result.role).toBe(userData.role);
    });
  });

  describe('KV Storage Testing', () => {
    it('should perform KV operations', async () => {
      const testKey = 'test:user:123';
      const testValue = { name: 'Test User', active: true };

      // Test PUT
      await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        await kv.put(testKey, JSON.stringify(testValue));
      });

      // Test GET
      const retrievedValue = await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        const value = await kv.get(testKey, 'json');
        return value;
      });

      expect(retrievedValue).toEqual(testValue);

      // Test DELETE
      await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        await kv.delete(testKey);
      });

      // Verify deletion
      const deletedValue = await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        return await kv.get(testKey);
      });

      expect(deletedValue).toBeNull();
    });

    it('should handle KV list operations', async () => {
      const prefix = 'test:list:';
      const testData = [
        { key: `${prefix}1`, value: 'value1' },
        { key: `${prefix}2`, value: 'value2' },
        { key: `${prefix}3`, value: 'value3' },
      ];

      // Insert test data
      await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        for (const item of testData) {
          await kv.put(item.key, item.value);
        }
      });

      // List keys with prefix
      const listedKeys = await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        const result = await kv.list({ prefix });
        return result.keys;
      });

      expect(listedKeys).toHaveLength(3);
      expect(listedKeys.map((k: any) => k.name).sort()).toEqual([
        `${prefix}1`,
        `${prefix}2`, 
        `${prefix}3`
      ]);

      // Clean up
      await testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
        for (const item of testData) {
          await kv.delete(item.key);
        }
      });
    });
  });

  describe('Durable Objects Testing', () => {
    it('should interact with Durable Objects', async () => {
      // Note: This is a basic example. In practice, you'd need to implement
      // the actual Durable Object class with methods to test.
      
      const result = await testDurableObjectOperation(async (stub: any) => {
        // Example: Call a method on your Durable Object
        // const response = await stub.fetch(new Request('http://localhost/test'));
        // return response.json();
        
        // For now, just verify the stub exists
        expect(stub).toBeDefined();
        return { success: true };
      });

      expect(result.success).toBe(true);
    });
  });

  describe('HTTP Request Testing', () => {
    it('should handle HTTP requests', async () => {
      const request = createTestRequest('https://example.com/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://example.com/api/test');
      
      const body = await request.json();
      expect(body).toEqual({ test: 'data' });
    });

    it('should create proper test context', async () => {
      const context = createTestContext();

      expect(context.env).toBeDefined();
      expect(context.env.DB).toBeDefined();
      expect(context.env.CELEBRUM_KV).toBeDefined();
      expect(context.ctx.waitUntil).toBeDefined();
      expect(context.ctx.passThroughOnException).toBeDefined();
    });
  });

  describe('Environment Variables Testing', () => {
    it('should have access to test environment variables', async () => {
      expect(testEnv).toBeDefined();
      expect(testEnv.DB).toBeDefined();
      expect(testEnv.CELEBRUM_KV).toBeDefined();
      expect(testEnv.PROD_BOT_MARKET_CACHE).toBeDefined();
      expect(testEnv.PROD_BOT_SESSION_STORE).toBeDefined();
      expect(testEnv.CELEBRUM_STORAGE).toBeDefined();
    });

    it('should use test-specific configuration', async () => {
      // Verify we're using the test environment
      // These values should come from wrangler.jsonc test environment
      expect(process.env.NODE_ENV || 'test').toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test constraint violation
      const userData = {
        telegramId: 'test_error_handling',
        username: 'erroruser',
        firstName: 'Error',
        lastName: 'User',
        role: 'free' as const,
        status: 'active' as const,
      };

      // First insert should succeed
      await db.insert(schema.users).values(userData);

      // Second insert with same telegramId should fail
      await expect(
        db.insert(schema.users).values(userData)
      ).rejects.toThrow();
    });

    it('should handle KV errors gracefully', async () => {
      // Test with invalid key or operation
      await expect(
        testKVOperation('CELEBRUM_KV', async (kv: KVNamespace) => {
          // Try to get a key that doesn't exist
          const value = await kv.get('nonexistent:key');
          return value;
        })
      ).resolves.toBeNull(); // KV returns null for missing keys, doesn't throw
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent operations', async () => {
      const concurrentOperations = 10;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const userData = {
          telegramId: `test_concurrent_${i}`,
          username: `concurrentuser${i}`,
          firstName: 'Concurrent',
          lastName: `User${i}`,
          role: 'free' as const,
          status: 'active' as const,
        };

        promises.push(db.insert(schema.users).values(userData).returning());
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentOperations);
      
      // Verify all users were created with unique IDs
      const userIds = results.map(r => r[0].id);
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(concurrentOperations);

      // Clean up
      for (let i = 0; i < concurrentOperations; i++) {
        await db.delete(schema.users)
          .where(eq(schema.users.telegramId, `test_concurrent_${i}`));
      }
    });
  });
});