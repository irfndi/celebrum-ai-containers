import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDb, getDatabase, withTransaction } from '../../src/utils/connection.js';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../src/schema/index.js';

// Define Database type to match what's used in connection.js
type Database = DrizzleD1Database<typeof schema>;

// Mock drizzle
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

// Mock D1Database
const mockD1Database = {
  prepare: vi.fn(),
  dump: vi.fn(),
  batch: vi.fn(),
  exec: vi.fn(),
} as unknown as D1Database;

// Create a more complete mock that matches the Database type
const mockDrizzleDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  transaction: vi.fn(),
  // Additional properties required by DrizzleD1Database
  batch: vi.fn(),
  resultKind: vi.fn(),
  _: {},
  query: vi.fn(),
  run: vi.fn(),
  all: vi.fn(),
  get: vi.fn(),
  prepare: vi.fn(),
} as unknown as Database;

describe('Database Connection Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (drizzle as any).mockReturnValue(mockDrizzleDb);
  });

  describe('createDb', () => {
    it('should create a drizzle database instance', () => {
      const result = createDb(mockD1Database);
      
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
      expect(result).toBe(mockDrizzleDb);
    });

    it('should handle null D1Database', () => {
      const result = createDb(null as any);
      
      expect(drizzle).toHaveBeenCalledWith(null, { schema });
      expect(result).toBe(mockDrizzleDb);
    });
  });

  describe('getDatabase', () => {
    it('should return database from environment', () => {
      const mockEnv = {
        DB: mockD1Database,
        ENVIRONMENT: 'test',
      };
      
      const result = getDatabase(mockEnv);
      
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
      expect(result).toBe(mockDrizzleDb);
    });

    it('should handle missing database in environment', () => {
      const mockEnv = {
        ENVIRONMENT: 'test',
      };
      
      const result = getDatabase(mockEnv as any);
      
      expect(drizzle).toHaveBeenCalledWith(undefined, { schema });
      expect(result).toBe(mockDrizzleDb);
    });

    it('should work with different environment types', () => {
      const mockEnv = {
        DB: mockD1Database,
        ENVIRONMENT: 'production',
        API_KEY: 'test-key',
      };
      
      const result = getDatabase(mockEnv);
      
      expect(result).toBe(mockDrizzleDb);
    });
  });

  describe('withTransaction', () => {
    it('should execute callback within transaction', async () => {
      const mockCallback = vi.fn().mockResolvedValue('test-result');
      const mockTransaction = {
        ...mockDrizzleDb,
        rollback: vi.fn(),
      };
      
      (mockDrizzleDb.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      
      const result = await withTransaction(mockDrizzleDb, mockCallback);
      
      expect(mockDrizzleDb.transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe('test-result');
    });

    it('should handle transaction errors', async () => {
      const mockError = new Error('Transaction failed');
      const mockCallback = vi.fn().mockRejectedValue(mockError);
      
      (mockDrizzleDb.transaction as any).mockImplementation(async (callback: any) => {
        try {
          return await callback(mockDrizzleDb);
        } catch (error) {
          throw error;
        }
      });
      
      await expect(withTransaction(mockDrizzleDb, mockCallback)).rejects.toThrow('Transaction failed');
      expect(mockDrizzleDb.transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle successful transaction with complex operations', async () => {
      const mockCallback = vi.fn().mockImplementation(async (tx) => {
        // Simulate multiple database operations
        await tx.insert().values({}).execute();
        await tx.update().set({}).execute();
        return { success: true, count: 2 };
      });
      
      const mockTransaction = {
        ...mockDrizzleDb,
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({}),
      };
      
      (mockDrizzleDb.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      
      const result = await withTransaction(mockDrizzleDb, mockCallback);
      
      expect(result).toEqual({ success: true, count: 2 });
      expect(mockCallback).toHaveBeenCalledWith(mockTransaction);
    });

    it('should handle transaction rollback', async () => {
      const mockCallback = vi.fn().mockImplementation(async (tx) => {
        await tx.insert().values({}).execute();
        throw new Error('Rollback test');
      });
      
      const mockTransaction = {
        ...mockDrizzleDb,
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({}),
        rollback: vi.fn(),
      };
      
      (mockDrizzleDb.transaction as any).mockImplementation(async (callback: any) => {
        try {
          return await callback(mockTransaction);
        } catch (error) {
          // Simulate rollback behavior
          throw error;
        }
      });
      
      await expect(withTransaction(mockDrizzleDb, mockCallback)).rejects.toThrow('Rollback test');
      expect(mockCallback).toHaveBeenCalledWith(mockTransaction);
    });
  });

  describe('createDb Error Handling', () => {
    it('should handle database connection errors', () => {
      const mockError = new Error('Connection failed');
      vi.mocked(drizzle).mockImplementation(() => {
        throw mockError;
      });

      expect(() => createDb(mockD1Database)).toThrow('Connection failed');
    });

    it('should handle undefined database parameter', () => {
      // The actual implementation doesn't validate the input parameter
      // so it won't throw an error, but drizzle might
      const result = createDb(undefined as any);
      expect(result).toBe(mockDrizzleDb);
      expect(drizzle).toHaveBeenCalledWith(undefined, { schema });
    });

    it('should create database with schema', () => {
      const result = createDb(mockD1Database);
      
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
      expect(result).toBe(mockDrizzleDb);
    });

    it('should handle drizzle initialization errors', () => {
      const initError = new Error('Drizzle initialization failed');
      vi.mocked(drizzle).mockImplementation(() => {
        throw initError;
      });

      expect(() => createDb(mockD1Database)).toThrow('Drizzle initialization failed');
    });
  });

  describe('Database Connection Integration', () => {
    it('should create database and execute transaction', async () => {
      const mockEnv = {
        DB: mockD1Database,
        ENVIRONMENT: 'test',
      };
      
      const db = getDatabase(mockEnv);
      
      const mockCallback = vi.fn().mockResolvedValue({ id: 1, name: 'test' });
      (mockDrizzleDb.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockDrizzleDb);
      });
      
      const result = await withTransaction(db, mockCallback);
      
      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle multiple database instances', () => {
      const db1 = createDb(mockD1Database);
      const db2 = createDb(mockD1Database);
      
      expect(db1).toBe(mockDrizzleDb);
      expect(db2).toBe(mockDrizzleDb);
      expect(drizzle).toHaveBeenCalledTimes(2);
    });

    it('should work with different environment configurations', () => {
      const environments = [
        { DB: mockD1Database, ENVIRONMENT: 'development' },
        { DB: mockD1Database, ENVIRONMENT: 'staging' },
        { DB: mockD1Database, ENVIRONMENT: 'production' },
      ];
      
      environments.forEach((env) => {
        const db = getDatabase(env);
        expect(db).toBe(mockDrizzleDb);
      });
      
      expect(drizzle).toHaveBeenCalledTimes(environments.length);
    });
  });

  // Additional Connection Tests
  describe('Database Connection Edge Cases', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle multiple database connections', () => {
      const db1 = createDb(mockD1Database);
      const db2 = createDb(mockD1Database);
      
      expect(db1).toBe(mockDrizzleDb);
      expect(db2).toBe(mockDrizzleDb);
      expect(drizzle).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent connection attempts', async () => {
      const promises = Array.from({ length: 5 }, () => 
        Promise.resolve(createDb(mockD1Database))
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toBe(mockDrizzleDb));
      expect(drizzle).toHaveBeenCalledTimes(5);
    });

    it('should handle multiple database creations', () => {
      createDb(mockD1Database);
      createDb(mockD1Database);
      
      expect(drizzle).toHaveBeenNthCalledWith(1, mockD1Database, { schema });
      expect(drizzle).toHaveBeenNthCalledWith(2, mockD1Database, { schema });
    });
  });

  // Database Instance Management Tests
  describe('Database Instance Management', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should maintain database instance state', () => {
      const db = createDb(mockD1Database);
      
      // Simulate database operations
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });

    it('should handle database cleanup scenarios', () => {
      const db = createDb(mockD1Database);
      
      // Test that database instance is properly created
      expect(db).toBeDefined();
      expect(db).toBe(mockDrizzleDb);
      
      // Verify drizzle was called with correct parameters
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
    });

    it('should handle schema validation', () => {
      const db = createDb(mockD1Database);
      
      expect(db).toBe(mockDrizzleDb);
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
    });

    it('should handle database creation with schema', () => {
      const db = createDb(mockD1Database);
      
      expect(db).toBe(mockDrizzleDb);
      expect(drizzle).toHaveBeenCalledWith(mockD1Database, { schema });
    });
  });

  // Error Recovery Tests
  describe('Connection Error Recovery', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle transient connection errors', () => {
      // First call fails, second succeeds
      vi.mocked(drizzle)
        .mockImplementationOnce(() => {
          throw new Error('Temporary failure');
        })
        .mockImplementationOnce(() => mockDrizzleDb);

      expect(() => createDb(mockD1Database)).toThrow('Temporary failure');
      
      const db = createDb(mockD1Database);
      expect(db).toBe(mockDrizzleDb);
    });

    it('should handle network timeout errors', () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      vi.mocked(drizzle).mockImplementation(() => {
        throw timeoutError;
      });

      expect(() => createDb(mockD1Database)).toThrow('Network timeout');
    });

    it('should handle authentication errors', () => {
      const authError = new Error('Authentication failed');
      authError.name = 'AuthenticationError';
      
      vi.mocked(drizzle).mockImplementation(() => {
        throw authError;
      });

      expect(() => createDb(mockD1Database)).toThrow('Authentication failed');
    });

    it('should handle resource exhaustion errors', () => {
      const resourceError = new Error('Too many connections');
      resourceError.name = 'ResourceExhaustedError';
      
      vi.mocked(drizzle).mockImplementation(() => {
        throw resourceError;
      });

      expect(() => createDb(mockD1Database)).toThrow('Too many connections');
    });
  });

  // Performance Tests
  describe('Connection Performance', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create connections efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        createDb(mockD1Database);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(drizzle).toHaveBeenCalledTimes(100);
    });

    it('should handle high-frequency connection requests', async () => {
      const connectionPromises = Array.from({ length: 50 }, (_, i) => 
        Promise.resolve().then(() => createDb(mockD1Database))
      );
      
      const results = await Promise.all(connectionPromises);
      
      expect(results).toHaveLength(50);
      results.forEach(result => expect(result).toBe(mockDrizzleDb));
      expect(drizzle).toHaveBeenCalledTimes(50);
    });
  });
});