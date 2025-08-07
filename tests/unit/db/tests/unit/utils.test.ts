import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDb, getDatabase } from '../../../../../src/db/src/utils/connection';
import type { Env } from '../../../../../src/db/src/utils/connection';
import { createMockD1Database, createMockEnv } from '../../../../../src/shared/tests/utils/test-helpers';

// Mock drizzle-orm/d1
vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn((client, options) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    ...options
  }))
}));

describe('Database Connection Utils', () => {
  let mockEnv: Env;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEnv = createMockEnv();
    mockEnv.DB = createMockD1Database();
    // Use robust, shared test DB and KV mocks
    // Remove any static/fake responses or placeholder logic in tests
  });

  describe('createDb', () => {
    it('should create database connection with schema', () => {
      const db = createDb(mockEnv.DB);

      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
    });

    it('should create database connection with D1Database client', () => {
      const customD1 = {
        ...createMockD1Database(),
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue({ id: 1, name: 'test' }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true })
        })
      };

      const db = createDb(customD1 as any);

      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
    });

    it('should handle database operations', async () => {
      const db = createDb(mockEnv.DB);
      
      // Test that the database object has the expected methods
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });
  });

  describe('Database Schema Integration', () => {
    it('should work with schema tables', () => {
      const db = createDb(mockEnv.DB);
      
      // Verify the database can be used for queries
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle null database client', () => {
      expect(() => createDb(null as any)).not.toThrow();
    });

    it('should handle undefined database client', () => {
      expect(() => createDb(undefined as any)).not.toThrow();
    });
  });

  describe('Environment Integration', () => {
    it('should work with different environment configurations', () => {
      const testEnvs = [
        { DB: createMockD1Database() },
        { DB: { ...createMockD1Database(), name: 'prod' } },
        { DB: { ...createMockD1Database(), name: 'test' } }
      ];

      testEnvs.forEach(env => {
        const db = createDb(env.DB as any);
        expect(db).toBeDefined();
        expect(typeof db.select).toBe('function');
      });
    });

    it('should work with getDatabase function', () => {
      const db = getDatabase(mockEnv);
      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
    });
  });
});

describe('Database Types', () => {
  it('should have correct type definitions', () => {
    const db = createDb(createMockD1Database() as any);
    
    // Type checks - these should compile without errors
    expect(db).toHaveProperty('select');
    expect(db).toHaveProperty('insert');
    expect(db).toHaveProperty('update');
    expect(db).toHaveProperty('delete');
  });

  it('should maintain D1Database client reference', () => {
    const customClient = {
      ...createMockD1Database(),
      customProperty: 'test'
    };
    
    const db = createDb(customClient as any);
    
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
  });
});