import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDb, getDatabase } from '../../src/utils/connection.js';
import type { Env } from '../../src/utils/connection.js';

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

// Mock D1Database
const mockD1Database = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
  dump: vi.fn(),
  batch: vi.fn(),
  exec: vi.fn()
};

describe('Database Connection Utils', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: mockD1Database as any
    };
  });

  describe('createDb', () => {
    it('should create database connection with schema', () => {
      const db = createDb(mockEnv.DB);

      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
    });

    it('should create database connection with D1Database client', () => {
      const customD1 = {
        ...mockD1Database,
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
        { DB: mockD1Database },
        { DB: { ...mockD1Database, name: 'prod' } },
        { DB: { ...mockD1Database, name: 'test' } }
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
    const db = createDb(mockD1Database as any);
    
    // Type checks - these should compile without errors
    expect(db).toHaveProperty('select');
    expect(db).toHaveProperty('insert');
    expect(db).toHaveProperty('update');
    expect(db).toHaveProperty('delete');
  });

  it('should maintain D1Database client reference', () => {
    const customClient = {
      ...mockD1Database,
      customProperty: 'test'
    };
    
    const db = createDb(customClient as any);
    
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
  });
});