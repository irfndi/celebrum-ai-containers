/**
 * Test utilities and helpers for Celebrum AI
 */

import { vi, beforeEach, afterEach } from 'vitest';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../../db/src/schema';
import { users, invitationCodes } from '../../../db/src/schema';
import * as fixtures from '../fixtures';
import type { User, UserProfile, UserSubscription, OrderBook, Trade, Candle, Order, BacktestResult, Portfolio } from '../../src/types';
import { sql } from 'drizzle-orm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type TestContext = {
  db: DrizzleD1Database<typeof schema>;
  kv: KVNamespace;
  dispose: () => Promise<void>;
};

// Create a proper mock D1Database implementation
function createMockD1Database(): D1Database {
  const mockResults = new Map();
  
  const mockDb = {
    exec: vi.fn().mockResolvedValue([]),
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue({ results: [], success: true }),
      run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
    }),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
  } as unknown as D1Database;

  return mockDb;
}

function createMockKVNamespace(): KVNamespace {
  const storage = new Map();
  
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(storage.get(key) || null)),
    put: vi.fn().mockImplementation((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true, cursor: '' }),
    getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
  } as unknown as KVNamespace;
}

// Mock platform proxy implementation
const mockGetPlatformProxy = vi.fn().mockImplementation(async () => {
  try {
    const mockEnv = createMockEnv();
    const mockKv = createMockKVNamespace();
    const mockD1 = createMockD1Database();
    
    const platform = {
      env: {
        ...mockEnv,
        CELEBRUM_KV: mockKv,
        CELEBRUM_DB: mockD1,
        CELEBRUM_STORAGE: {} as any,
      },
      cf: {},
      ctx: { 
        waitUntil: vi.fn(), 
        passThroughOnException: vi.fn() 
      },
      caches: { default: {} },
      dispose: vi.fn()
    };
    
    // Ensure env exists
    if (!platform.env) {
      throw new Error('Failed to create mock environment');
    }
    
    return platform;
  } catch (error) {
    console.error('Error in mockGetPlatformProxy:', error);
    // Return a fallback platform object
    return {
      env: createMockEnv(),
      cf: {},
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      caches: { default: {} },
      dispose: vi.fn()
    };
  }
});

/**
 * Get a test database and KV namespace
 */
export async function getTestDb(): Promise<TestContext> {
  // Create a fresh mock database instance for each test
  const mockDb = createMockDatabase();
  
  // Initialize the mock database with empty tables
  mockDb.resetData();
  
  // Always call init() method to ensure proper initialization
  await mockDb.init();
  
  console.log('Fresh mock database created and initialized for new test');
  
  // Create KV namespace
  const kv = createMockKVNamespace();
  
  // Return the test context with proper mock database
  return {
    db: mockDb as any,
    kv,
    dispose: async () => {
      console.log('Test database disposed');
    }
  };
}

// Helper function for migrations - no-op for mock
export const applyMigrations = async (db: D1Database) => {
  console.log('Mock migrations applied (no-op)');
  return {
    success: true,
    meta: {
      duration: 0,
    },
  };
};

// Helper function for cleanup - no-op for mock
export const cleanupDb = async (db: DrizzleD1Database<typeof schema>) => {
  console.log('Mock database cleanup (no-op)');
  return {
    success: true,
    meta: {
      duration: 0,
    },
  };
};

// Mock request/response utilities
export const createMockContext = () => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
});

export const createMockRequest = (url: string, options: RequestInit = {}): Request => {
  return new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
    ...options,
  });
};

export const createMockEnv = () => {
  const mockEnv: Record<string, any> = {
    // Database mock
    DB: createMockD1Database(),
    
    // KV mock
    KV: createMockKVNamespace(),
    
    // Environment variables
    TELEGRAM_BOT_TOKEN: 'mock-bot-token',
    TELEGRAM_WEBHOOK_SECRET: 'mock-webhook-secret',
    JWT_SECRET: 'mock-jwt-secret',
    OPENAI_API_KEY: 'mock-openai-key',
    
    // Bindings
    CLOUDFLARE_API_TOKEN: 'mock-cloudflare-token',
    CLOUDFLARE_ACCOUNT_ID: 'mock-account-id',
    CLOUDFLARE_ZONE_ID: 'mock-zone-id',
    
    // Feature flags
    FEATURE_FLAGS: JSON.stringify({
      enableNewUI: true,
      enableBetaFeatures: false,
      maintenanceMode: false,
    }),
    
    // Mock additional environment variables as needed
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'debug',
  };
  
  return mockEnv;
};

// Production-ready Drizzle mock implementation
class ProductionDrizzleMock {
  private mockDataStore: Record<string, any[]> = {};
  private nextId = 1;
  private currentTable = '';
  private lastInsertedRecord: any = null;

  constructor() {
    this.init();
  }

  async init() {
    this.resetData();
  }

  get mockData() {
    return this.mockDataStore;
  }

  resetData() {
    this.mockDataStore = {
      users: [],
      userProfiles: [],
      userSubscriptions: [],
      orders: [],
      positions: [],
      portfolios: [],
      backtestResults: [],
      invitationCodes: [],
      invitationUsage: [],
      opportunities: [],
      userUsernameHistory: [],
    };
    this.nextId = 1;
    this.currentTable = '';
    this.lastInsertedRecord = null;
  }

  private detectTableName(table: any): string {
    if (!table) return 'unknown';
    
    // Handle Drizzle table objects
    if (table[Symbol.for('drizzle:Name')]) {
      return table[Symbol.for('drizzle:Name')];
    }
    
    // Handle table objects with _ property
    if (table._ && table._.name) {
      return table._.name;
    }
    
    // Handle string table names
    if (typeof table === 'string') {
      return table;
    }
    
    // Fallback: try to extract from constructor name or other properties
    if (table.constructor && table.constructor.name) {
      return table.constructor.name.toLowerCase();
    }
    
    return 'unknown';
  }

  private generateId(): number {
    return this.nextId++;
  }

  private getTableData(tableName: string): any[] {
    if (!this.mockDataStore[tableName]) {
      this.mockDataStore[tableName] = [];
    }
    return this.mockDataStore[tableName];
  }

  private mapColumnNameToProperty(columnName: string): string {
    // Map snake_case column names to camelCase property names
    const columnMappings: Record<string, string> = {
      'telegram_id': 'telegramId',
      'first_name': 'firstName',
      'last_name': 'lastName',
      'account_balance': 'accountBalance',
      'total_pnl': 'totalPnl',
      'weekly_pnl': 'weeklyPnl',
      'last_active_at': 'lastActiveAt',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'user_id': 'userId',
      'risk_tolerance': 'riskTolerance',
      'invitation_code': 'invitationCode',
      'used_at': 'usedAt',
      'expires_at': 'expiresAt',
      'changed_at': 'changedAt',
      'created_by': 'createdBy',
      'max_uses': 'maxUses',
      'current_uses': 'currentUses',
      'is_active': 'isActive',
      'invitation_id': 'invitationId',
      'beta_expires_at': 'betaExpiresAt'
    };
    
    return columnMappings[columnName] || columnName;
  }

  private applyWhereFilter(data: any[], whereCondition: any): any[] {
    if (!whereCondition) return data;
    
    return data.filter(record => {
      return this.evaluateCondition(record, whereCondition);
    });
  }

  private evaluateCondition(record: any, condition: any): boolean {
    if (!condition) return true;
    
    console.log('[MOCK DB DEBUG] Evaluating condition with queryChunks - type:', typeof condition);
    // Avoid circular reference error by not stringifying the entire condition object
    console.log('[MOCK DB DEBUG] Condition has queryChunks:', !!condition.queryChunks, 'length:', condition.queryChunks?.length);
    
    // Handle compound conditions (and, or)
    if (condition && typeof condition === 'object' && condition.queryChunks) {
      // Check if this is a compound condition by looking for logical operators
      const hasLogicalOperator = condition.queryChunks.some((chunk: any) => 
        chunk === 'and' || chunk === 'or' || 
        (typeof chunk === 'string' && (chunk.includes('AND') || chunk.includes('OR')))
      );
      
      // Also check if we have multiple nested conditions (typical for and/or operations)
      const hasNestedConditions = condition.queryChunks.some((chunk: any) => 
        chunk && typeof chunk === 'object' && chunk.queryChunks && Array.isArray(chunk.queryChunks)
      );
      
      console.log('[MOCK DB DEBUG] Found condition with queryChunks:', condition.queryChunks.length);
      console.log('[MOCK DB DEBUG] Has logical operator:', hasLogicalOperator);
      console.log('[MOCK DB DEBUG] Has nested conditions:', hasNestedConditions);
      
      if (hasLogicalOperator || hasNestedConditions) {
        console.log('[MOCK DB DEBUG] Treating as compound condition');
        return this.evaluateCompoundCondition(record, condition);
      }
    }
    
    // Handle single conditions
    console.log('[MOCK DB DEBUG] Handling as single condition');
    return this.evaluateSingleCondition(record, condition);
  }

  private evaluateCompoundCondition(record: any, condition: any): boolean {
    if (!condition.queryChunks || !Array.isArray(condition.queryChunks)) {
      return true;
    }

    console.log('[MOCK DB DEBUG] Evaluating compound condition with queryChunks:', condition.queryChunks.length);
    
    // For Drizzle and() conditions, the structure is typically:
    // [condition1, operator, condition2]
    // where operator is StringChunk with ' and ' and conditions are _SQL objects with eq() 
    
    let isAndOperation = false;
    const conditions: any[] = [];
    
    for (let i = 0; i < condition.queryChunks.length; i++) {
      const chunk = condition.queryChunks[i];
      
      console.log(`[MOCK DB DEBUG] Processing chunk ${i}:`, chunk, 'chunkStr:', chunk);
      
      // Check for StringChunk with AND/OR operator
      if (chunk && typeof chunk === 'object' && chunk.value && Array.isArray(chunk.value)) {
        const operatorStr = chunk.value[0];
        if (typeof operatorStr === 'string') {
          if (operatorStr.trim() === 'and') {
            isAndOperation = true;
            console.log('[MOCK DB DEBUG] Found AND operator in StringChunk');
            continue;
          }
          if (operatorStr.trim() === 'or') {
            isAndOperation = false;
            console.log('[MOCK DB DEBUG] Found OR operator in StringChunk');
            continue;
          }
          // Skip other string chunks like parentheses
          if (operatorStr.trim() === ')' || operatorStr.trim() === '(') {
            console.log('[MOCK DB DEBUG] Skipping parenthesis chunk:', operatorStr);
            continue;
          }
        }
      }
      
      // If this chunk has queryChunks, it might be a nested condition or eq() condition
      if (chunk && typeof chunk === 'object' && chunk.queryChunks && Array.isArray(chunk.queryChunks)) {
        // Check if this looks like an eq() condition (has column and parameter chunks)
        const hasColumn = chunk.queryChunks.some((subChunk: any) => 
          subChunk && typeof subChunk === 'object' && subChunk.name && subChunk.dataType
        );
        const hasParam = chunk.queryChunks.some((subChunk: any) => 
          subChunk && typeof subChunk === 'object' && subChunk.hasOwnProperty('brand') && subChunk.value !== undefined
        );
        
        if (hasColumn && hasParam) {
          conditions.push(chunk);
          console.log(`[MOCK DB DEBUG] Found eq() condition ${conditions.length}`);
        } else {
          // This might be a nested compound condition, recursively process it
          console.log(`[MOCK DB DEBUG] Found nested compound condition, recursively processing`);
          const nestedResult = this.evaluateCompoundCondition(record, chunk);
          // For now, treat nested compound conditions as individual conditions
          // This is a simplification but should work for our test case
          if (chunk.queryChunks.length > 1) {
            // Extract individual eq() conditions from the nested structure
            for (const nestedChunk of chunk.queryChunks) {
              if (nestedChunk && typeof nestedChunk === 'object' && nestedChunk.queryChunks) {
                const nestedHasColumn = nestedChunk.queryChunks.some((subChunk: any) => 
                  subChunk && typeof subChunk === 'object' && subChunk.name && subChunk.dataType
                );
                const nestedHasParam = nestedChunk.queryChunks.some((subChunk: any) => 
                  subChunk && typeof subChunk === 'object' && subChunk.hasOwnProperty('brand') && subChunk.value !== undefined
                );
                
                if (nestedHasColumn && nestedHasParam) {
                  conditions.push(nestedChunk);
                  console.log(`[MOCK DB DEBUG] Found nested eq() condition ${conditions.length}`);
                }
              } else if (nestedChunk && typeof nestedChunk === 'object' && nestedChunk.value && Array.isArray(nestedChunk.value)) {
                const operatorStr = nestedChunk.value[0];
                if (typeof operatorStr === 'string' && operatorStr.trim() === 'and') {
                  isAndOperation = true;
                  console.log('[MOCK DB DEBUG] Found AND operator in nested structure');
                }
              }
            }
          }
        }
      }
    }
    
    console.log('[MOCK DB DEBUG] Parsed', conditions.length, 'individual conditions for', isAndOperation ? 'AND' : 'OR', 'operation');
    
    // Evaluate all conditions
    if (isAndOperation) {
      // AND: all conditions must be true
      for (const cond of conditions) {
        const condResult = this.evaluateSingleCondition(record, cond);
        console.log('[MOCK DB DEBUG] AND condition result:', condResult);
        if (!condResult) {
          console.log('[MOCK DB DEBUG] AND operation failed, returning false');
          return false;
        }
      }
      console.log('[MOCK DB DEBUG] All AND conditions passed, returning true');
      return true;
    } else {
      // OR: at least one condition must be true
      for (const cond of conditions) {
        const condResult = this.evaluateSingleCondition(record, cond);
        console.log('[MOCK DB DEBUG] OR condition result:', condResult);
        if (condResult) {
          console.log('[MOCK DB DEBUG] OR operation succeeded, returning true');
          return true;
        }
      }
      console.log('[MOCK DB DEBUG] All OR conditions failed, returning false');
      return false;
    }
  }

  private evaluateSingleCondition(record: any, condition: any): boolean {
    if (!condition) return true;
    
    // Handle Drizzle SQL objects with queryChunks
    if (condition && typeof condition === 'object' && condition.queryChunks) {
      console.log('[MOCK DB DEBUG] Evaluating condition with queryChunks - type:', typeof condition);
      console.log('[MOCK DB DEBUG] Record being evaluated:', record);
      
      // Parse queryChunks to extract the actual condition
       // For Drizzle eq() conditions, we need to find the column and value
        let columnName = null;
        let value = null;
        
        for (let i = 0; i < condition.queryChunks.length; i++) {
          const chunk = condition.queryChunks[i];
          console.log(`[MOCK DB DEBUG] Processing chunk ${i}:`, chunk?.name || chunk?.value || 'unknown chunk');
          
          // Look for column chunk (has name, dataType, etc.)
          if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
            columnName = chunk.name;
            console.log('[MOCK DB DEBUG] Found column name:', columnName);
          }
          
          // Look for parameter chunk (has brand, value, encoder) - this is the actual value
          if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('brand') && chunk.value !== undefined) {
            value = chunk.value;
            console.log('[MOCK DB DEBUG] Found value:', value);
          }
        }
       
       if (columnName && value !== null) {
         // Map snake_case column names to camelCase property names
         const propertyName = this.mapColumnNameToProperty(columnName);
         let actualValue = record[propertyName];
         let expectedValue = value;
         
         console.log(`[MOCK DB DEBUG] Before comparison:`);
         console.log(`[MOCK DB DEBUG]   Column: ${columnName} -> Property: ${propertyName}`);
         console.log(`[MOCK DB DEBUG]   Expected: ${expectedValue} (${typeof expectedValue})`);
         console.log(`[MOCK DB DEBUG]   Actual: ${actualValue} (${typeof actualValue})`);
         
         // Handle boolean comparisons with detailed logging
         if (typeof expectedValue === 'boolean' || typeof actualValue === 'boolean') {
           console.log(`[MOCK DB DEBUG] Boolean comparison detected:`);
           console.log(`[MOCK DB DEBUG]   Column: ${columnName}, Property: ${propertyName}`);
           console.log(`[MOCK DB DEBUG]   Expected: ${expectedValue} (${typeof expectedValue})`);
           console.log(`[MOCK DB DEBUG]   Actual: ${actualValue} (${typeof actualValue})`);
           
           // Convert boolean to integer for database storage (SQLite boolean mode)
           if (typeof expectedValue === 'boolean') {
             expectedValue = expectedValue ? 1 : 0;
             console.log(`[MOCK DB DEBUG]   Expected converted to: ${expectedValue}`);
           }
           
           if (typeof actualValue === 'boolean') {
             actualValue = actualValue ? 1 : 0;
             console.log(`[MOCK DB DEBUG]   Actual converted to: ${actualValue}`);
           }
           
           // Also handle string representations
           if (typeof actualValue === 'string') {
             if (actualValue === 'true') actualValue = 1;
             else if (actualValue === 'false') actualValue = 0;
             else actualValue = parseInt(actualValue) || 0;
           }
           
           if (typeof expectedValue === 'string') {
             if (expectedValue === 'true') expectedValue = 1;
             else if (expectedValue === 'false') expectedValue = 0;
             else expectedValue = parseInt(expectedValue) || 0;
           }
         }
         
         const result = actualValue === expectedValue;
         console.log(`[MOCK DB DEBUG] Final comparison result: ${result}`);
         return result;
       } else {
         console.log('[MOCK DB DEBUG] Could not extract columnName or value, returning true');
       }
    }
    
    // Handle direct Drizzle operator objects (legacy support)
    if (condition && typeof condition === 'object') {
      // Check if it's a Drizzle operator (has left, right, operator properties)
      if (condition.left && condition.right !== undefined && condition.operator) {
        const columnName = this.extractColumnNameFromDrizzle(condition.left);
        const value = condition.right;
        const operator = condition.operator;
        
        if (columnName) {
          const propertyName = this.mapColumnNameToProperty(columnName);
          let result = false;
          switch (operator) {
            case '=':
              result = record[propertyName] === value;
              break;
            case '!=':
            case '<>':
              result = record[propertyName] !== value;
              break;
            case '>':
              result = record[propertyName] > value;
              break;
            case '>=':
              result = record[propertyName] >= value;
              break;
            case '<':
              result = record[propertyName] < value;
              break;
            case '<=':
              result = record[propertyName] <= value;
              break;
            default:
              result = false;
          }
          return result;
        }
      }
      
      // Parse the SQL structure to extract column name and expected value (legacy)
      if (condition.sql && condition.queryChunks && condition.params) {
        const columnName = this.extractColumnName(condition);
        const expectedValue = condition.params[0];
        
        if (columnName && expectedValue !== undefined) {
          const propertyName = this.mapColumnNameToProperty(columnName);
          return record[propertyName] === expectedValue;
        }
      }
      
      // Handle SQL expressions
      if (condition.sql && typeof condition.sql === 'string') {
        // Simple string-based SQL parsing for basic conditions
        const sqlStr = condition.sql;
        if (sqlStr.includes('=')) {
          const parts = sqlStr.split('=');
          if (parts.length === 2) {
            const columnName = parts[0].trim().replace(/["'`]/g, '');
            const propertyName = this.mapColumnNameToProperty(columnName);
            const expectedValue = parts[1].trim().replace(/["'`]/g, '');
            return record[propertyName] === expectedValue;
          }
        }
      }
      
      // Handle direct object conditions
      for (const [key, value] of Object.entries(condition)) {
        if (key !== 'left' && key !== 'right' && key !== 'operator' && key !== 'sql') {
          if (record[key] !== value) {
            return false;
          }
        }
      }
      return true;
    }
    
    return true;
  }

  private extractColumnNameFromDrizzle(left: any): string | null {
    // Handle Drizzle column objects
    if (left && typeof left === 'object') {
      // Check for column name property
      if (left.name) return left.name;
      if (left.columnName) return left.columnName;
      if (left.fieldName) return left.fieldName;
      
      // Check for table.column structure
      if (left.table && left.table.name && left.name) {
        return left.name;
      }
    }
    
    // Fallback to string parsing
    if (typeof left === 'string') {
      return this.extractColumnNameFromString(left);
    }
    
    return null;
  }

  private extractColumnName(condition: any): string | null {
    if (!condition.queryChunks || !Array.isArray(condition.queryChunks)) {
      return null;
    }
    
    // Look for column references in query chunks
    for (const chunk of condition.queryChunks) {
      if (chunk && typeof chunk === 'object' && chunk.name) {
        return chunk.name;
      }
      if (typeof chunk === 'string' && chunk.includes('.')) {
        const parts = chunk.split('.');
        return parts[parts.length - 1].replace(/["'`]/g, '');
      }
    }
    
    return null;
  }

  private extractColumnNameFromString(chunk: string): string | null {
    // Extract column name from string like '"invitation_codes"."id"'
    const match = chunk.match(/"([^"]+)"\."([^"]+)"/); 
    return match ? match[2] : null;
  }

  private applyOrdering(data: any[], orderColumn: any): any[] {
    if (!orderColumn) return data;
    
    let columnName = '';
    let isDescending = false;
    
    if (orderColumn && typeof orderColumn === 'object') {
      // Handle desc() wrapper
      if (orderColumn.column && orderColumn.column.name) {
        columnName = orderColumn.column.name;
        isDescending = orderColumn.desc === true;
      } else if (orderColumn.name) {
        columnName = orderColumn.name;
      }
    }
    
    if (!columnName) return data;
    
    return [...data].sort((a, b) => {
      const propertyName = this.mapColumnNameToProperty(columnName);
      let aValue = a[propertyName];
      let bValue = b[propertyName];
      
      // Handle date fields
      if (propertyName === 'changedAt' || propertyName === 'createdAt' || propertyName === 'updatedAt') {
        aValue = new Date(aValue || '1970-01-01T00:00:00.000Z').getTime();
        bValue = new Date(bValue || '1970-01-01T00:00:00.000Z').getTime();
      }
      
      // Handle numeric fields
      if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
        aValue = Number(aValue);
      }
      if (typeof bValue === 'string' && !isNaN(Number(bValue))) {
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return isDescending ? 1 : -1;
      if (aValue > bValue) return isDescending ? -1 : 1;
      return 0;
    });
  }

  // INSERT implementation
  insert(table: any) {
    this.currentTable = this.detectTableName(table);
    
    return {
      values: (data: any) => {
        const tableData = this.getTableData(this.currentTable);
        
        // Handle single record or array of records
        const records = Array.isArray(data) ? data : [data];
        const insertedRecords: any[] = [];
        
        for (const record of records) {
          // Check unique constraints for users table
          if (this.currentTable === 'users') {
            // Check telegramId uniqueness
            if (record.telegramId && tableData.some(u => u.telegramId === record.telegramId)) {
              throw new Error(`UNIQUE constraint failed: users.telegramId`);
            }
            // Check email uniqueness (if provided)
            if (record.email && tableData.some(u => u.email === record.email)) {
              throw new Error(`UNIQUE constraint failed: users.email`);
            }
            // Check username uniqueness (if provided)
            if (record.username && tableData.some(u => u.username === record.username)) {
              throw new Error(`UNIQUE constraint failed: users.username`);
            }
          }
          
          const newRecord = {
            id: this.generateId(),
            ...record,
            createdAt: record.createdAt || new Date().toISOString(),
            updatedAt: record.updatedAt || new Date().toISOString(),
          };
          
          tableData.push(newRecord);
          insertedRecords.push(newRecord);
          this.lastInsertedRecord = newRecord;
        }
        
        return {
          returning: (columns?: any) => ({
            execute: () => Promise.resolve(insertedRecords)
          }),
          execute: () => Promise.resolve({ success: true, meta: { changes: insertedRecords.length } })
        };
      }
    };
  }

  // SELECT implementation
  select(columns?: any) {
    const createQueryBuilder = () => {
      const builder = {
        from: (table: any) => {
          this.currentTable = this.detectTableName(table);

          const baseQuery = {
            where: (whereCondition: any) => {
              return {
                orderBy: (orderColumn: any) => ({
                  limit: (limitValue: number) => {
                    const tableData = this.getTableData(this.currentTable);
                    let filteredData = this.applyWhereFilter(tableData, whereCondition);
                    
                    if (orderColumn) {
                      filteredData = this.applyOrdering(filteredData, orderColumn);
                    }
                    
                    return Promise.resolve(filteredData.slice(0, limitValue));
                  },
                  execute: () => {
                    const tableData = this.getTableData(this.currentTable);
                    let filteredData = this.applyWhereFilter(tableData, whereCondition);
                    
                    if (orderColumn) {
                      filteredData = this.applyOrdering(filteredData, orderColumn);
                    }
                    
                    return Promise.resolve(filteredData);
                  },
                  get: () => {
                    const tableData = this.getTableData(this.currentTable);
                    let filteredData = this.applyWhereFilter(tableData, whereCondition);
                    
                    if (orderColumn) {
                      filteredData = this.applyOrdering(filteredData, orderColumn);
                    }
                    
                    const result = filteredData[0] || null;
                    return Promise.resolve(result);
                  },
                  then: (resolve: any, reject: any) => {
                    const tableData = this.getTableData(this.currentTable);
                    let filteredData = this.applyWhereFilter(tableData, whereCondition);
                    
                    if (orderColumn) {
                      filteredData = this.applyOrdering(filteredData, orderColumn);
                    }
                    
                    return Promise.resolve(filteredData).then(resolve, reject);
                  }
                }),
                limit: (limitValue: number) => ({
                  execute: () => {
                    const tableData = this.getTableData(this.currentTable);
                    const filteredData = this.applyWhereFilter(tableData, whereCondition);
                    return Promise.resolve(filteredData.slice(0, limitValue));
                  },
                  then: (resolve: any, reject: any) => {
                    const tableData = this.getTableData(this.currentTable);
                    const filteredData = this.applyWhereFilter(tableData, whereCondition);
                    return Promise.resolve(filteredData.slice(0, limitValue)).then(resolve, reject);
                  }
                }),
                execute: () => {
                  const tableData = this.getTableData(this.currentTable);
                  const filteredData = this.applyWhereFilter(tableData, whereCondition);
                  return Promise.resolve(filteredData);
                },
                get: () => {
                  const tableData = this.getTableData(this.currentTable);
                  const filteredData = this.applyWhereFilter(tableData, whereCondition);
                  const result = filteredData[0] || null;
                  return Promise.resolve(result);
                },
                then: (resolve: any, reject: any) => {
                  const tableData = this.getTableData(this.currentTable);
                  const filteredData = this.applyWhereFilter(tableData, whereCondition);
                  return Promise.resolve(filteredData).then(resolve, reject);
                }
              };
            },
            orderBy: (orderColumn: any) => {
              const applySorting = (data: any[]) => {
                if (!orderColumn) return data;
                
                let columnName = '';
                let isDescending = false;
                
                if (orderColumn && typeof orderColumn === 'object') {
                  if (orderColumn.column && orderColumn.column.name) {
                    columnName = orderColumn.column.name;
                    isDescending = orderColumn.desc === true;
                  } else if (orderColumn.name) {
                    columnName = orderColumn.name;
                  }
                }
                
                if (!columnName) return data;
                
                return [...data].sort((a, b) => {
                  let aValue = a[columnName];
                  let bValue = b[columnName];
                  
                  if (columnName === 'changedAt' || columnName === 'createdAt' || columnName === 'updatedAt') {
                    aValue = new Date(aValue || '1970-01-01T00:00:00.000Z').getTime();
                    bValue = new Date(bValue || '1970-01-01T00:00:00.000Z').getTime();
                  }
                  
                  if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
                    aValue = Number(aValue);
                  }
                  if (typeof bValue === 'string' && !isNaN(Number(bValue))) {
                    bValue = Number(bValue);
                  }
                  
                  if (aValue < bValue) return isDescending ? 1 : -1;
                  if (aValue > bValue) return isDescending ? -1 : 1;
                  return 0;
                });
              };
              
              return {
                where: (whereCondition: any) => ({
                  limit: (limitValue: number) => ({
                    execute: () => {
                      const tableData = this.getTableData(this.currentTable);
                      const filteredData = this.applyWhereFilter(tableData, whereCondition);
                      const sortedData = applySorting(filteredData);
                      return Promise.resolve(sortedData.slice(0, limitValue));
                    },
                    then: (resolve: any, reject: any) => {
                      const tableData = this.getTableData(this.currentTable);
                      const filteredData = this.applyWhereFilter(tableData, whereCondition);
                      const sortedData = applySorting(filteredData);
                      return Promise.resolve(sortedData.slice(0, limitValue)).then(resolve, reject);
                    }
                  }),
                  execute: () => {
                    const tableData = this.getTableData(this.currentTable);
                    const filteredData = this.applyWhereFilter(tableData, whereCondition);
                    const sortedData = applySorting(filteredData);
                    return Promise.resolve(sortedData);
                  },
                  then: (resolve: any, reject: any) => {
                    const tableData = this.getTableData(this.currentTable);
                    const filteredData = this.applyWhereFilter(tableData, whereCondition);
                    const sortedData = applySorting(filteredData);
                    return Promise.resolve(sortedData).then(resolve, reject);
                  }
                }),
                limit: (limitValue: number) => ({
                  execute: () => {
                    const tableData = this.getTableData(this.currentTable);
                    const sortedData = applySorting(tableData);
                    return Promise.resolve(sortedData.slice(0, limitValue));
                  },
                  then: (resolve: any, reject: any) => {
                    const tableData = this.getTableData(this.currentTable);
                    const sortedData = applySorting(tableData);
                    return Promise.resolve(sortedData.slice(0, limitValue)).then(resolve, reject);
                  }
                }),
                execute: () => {
                  const tableData = this.getTableData(this.currentTable);
                  const sortedData = applySorting(tableData);
                  return Promise.resolve(sortedData);
                },
                then: (resolve: any, reject: any) => {
                  const tableData = this.getTableData(this.currentTable);
                  const sortedData = applySorting(tableData);
                  return Promise.resolve(sortedData).then(resolve, reject);
                }
              };
            },
            limit: (limitValue: number) => ({
              execute: () => {
                const tableData = this.getTableData(this.currentTable);
                return Promise.resolve(tableData.slice(0, limitValue));
              },
              then: (resolve: any, reject: any) => {
                const tableData = this.getTableData(this.currentTable);
                return Promise.resolve(tableData.slice(0, limitValue)).then(resolve, reject);
              }
            }),
            execute: () => {
              const tableData = this.getTableData(this.currentTable);
              return Promise.resolve(tableData);
            },
            then: (resolve: any, reject: any) => {
              const tableData = this.getTableData(this.currentTable);
              return Promise.resolve(tableData).then(resolve, reject);
            }
          };

          return baseQuery;
        }
      };
      
      (builder as any).then = (resolve: any, reject: any) => {
        return Promise.resolve([]).then(resolve, reject);
      };
      
      return builder;
    };

    return createQueryBuilder();
  }

  // UPDATE implementation
  update(table: any) {
    this.currentTable = this.detectTableName(table);
    let accumulatedData = {};

    const createChainableUpdate = () => ({
      set: (updateData: any) => {
        accumulatedData = { ...accumulatedData, ...updateData };

        return {
          ...createChainableUpdate(),
          where: (whereCondition: any) => ({
            returning: (columns?: any) => ({
              execute: () => {
                const tableData = this.getTableData(this.currentTable);
                let filteredData = tableData;
                if (whereCondition) {
                  filteredData = this.applyWhereFilter(tableData, whereCondition);
                }
                
                if (filteredData.length > 0) {
                  let processedData = { ...accumulatedData } as any;
                  if (this.currentTable === 'users' && processedData.accountBalance && typeof processedData.accountBalance === 'string') {
                    processedData.accountBalance = parseFloat(processedData.accountBalance);
                  }

                  const recordToUpdate = filteredData[0];
                  Object.assign(recordToUpdate, processedData, { updatedAt: new Date().toISOString() });
                  return Promise.resolve([recordToUpdate]);
                }
                return Promise.resolve([]);
              }
            }),
            execute: () => {
              const tableData = this.getTableData(this.currentTable);
              
              let filteredData = tableData;
              if (whereCondition) {
                filteredData = this.applyWhereFilter(tableData, whereCondition);
              }
              
              if (filteredData.length > 0) {
                const recordToUpdate = filteredData[0];
                Object.assign(recordToUpdate, accumulatedData, { updatedAt: new Date().toISOString() });
                return Promise.resolve({ changes: 1 });
              }
              return Promise.resolve({ changes: 0 });
            }
          })
        };
      }
    });

    return createChainableUpdate();
  }

  // DELETE implementation
  delete(table: any) {
    this.currentTable = this.detectTableName(table);

    return {
      where: (whereCondition: any) => ({
        execute: () => {
          const tableData = this.getTableData(this.currentTable);
          let toDelete = tableData;
          if (whereCondition) {
            toDelete = this.applyWhereFilter(tableData, whereCondition);
          }
          
          for (let i = tableData.length - 1; i >= 0; i--) {
            if (toDelete.some(record => record.id === tableData[i].id)) {
              tableData.splice(i, 1);
            }
          }
          
          return Promise.resolve({
            success: true,
            meta: {
              changes: toDelete.length
            }
          });
        }
      })
    };
  }

  // Query interface
  query = {
    users: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('users');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      }
    },
    invitationCodes: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('invitation_codes');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      }
    },
    invitationUsage: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('invitation_usage');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      }
    },
    positions: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('positions');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      }
    },
    opportunities: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('opportunities');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      },
      findMany: (options?: any) => {
        const tableData = this.getTableData('opportunities');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        const now = Math.floor(Date.now() / 1000);
        filteredData = filteredData.filter((record: any) => {
          const expiresAt = record.expiresAt;
          if (typeof expiresAt === 'string') {
            const expiresTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000);
            return expiresTimestamp > now;
          } else if (typeof expiresAt === 'number') {
            return expiresAt > now;
          }
          return true;
        });
        
        filteredData = [...filteredData].sort((a, b) => {
          const aProfitPercentage = a.profitPercentage || 0;
          const bProfitPercentage = b.profitPercentage || 0;
          return bProfitPercentage - aProfitPercentage;
        });
        
        if (options?.limit) {
          filteredData = filteredData.slice(0, options.limit);
        }
        
        return Promise.resolve(filteredData);
      }
    },
    userUsernameHistory: {
      findFirst: (options?: any) => {
        const tableData = this.getTableData('userUsernameHistory');
        let filteredData = tableData;
        
        if (options?.where) {
          filteredData = this.applyWhereFilter(tableData, options.where);
        }
        
        filteredData = [...filteredData].sort((a, b) => {
          const aValue = a.changedAt || a.createdAt || '1970-01-01T00:00:00.000Z';
          const bValue = b.changedAt || b.createdAt || '1970-01-01T00:00:00.000Z';
          return new Date(bValue).getTime() - new Date(aValue).getTime();
        });
        
        const result = filteredData.length > 0 ? filteredData[0] : null;
        return Promise.resolve(result);
      }
    }
  };

  // Transaction support
  transaction(callback: (db: any) => Promise<any>) {
    const snapshot = JSON.parse(JSON.stringify(this.mockDataStore));
    const mockInstance = this;
    
    const transactionContext = {
      select: (...args: any[]) => mockInstance.select(...args),
      insert: (table: any) => mockInstance.insert(table),
      update: (table: any) => mockInstance.update(table),
      delete: (table: any) => mockInstance.delete(table),
      query: {
        invitationCodes: {
          findFirst: (options?: any) => {
            const tableData = mockInstance.getTableData('invitation_codes');
            let filteredData = tableData;
            
            if (options?.where) {
              filteredData = mockInstance.applyWhereFilter(tableData, options.where);
            }
            
            const result = filteredData.length > 0 ? filteredData[0] : null;
            return Promise.resolve(result);
          }
        },
        invitationUsage: {
          findFirst: (options?: any) => {
            const tableData = mockInstance.getTableData('invitation_usage');
            let filteredData = tableData;
            
            if (options?.where) {
              filteredData = mockInstance.applyWhereFilter(tableData, options.where);
            }
            
            const result = filteredData.length > 0 ? filteredData[0] : null;
            return Promise.resolve(result);
          }
        },
        users: {
          findFirst: (options?: any) => {
            const tableData = mockInstance.getTableData('users');
            let filteredData = tableData;
            
            if (options?.where) {
              filteredData = mockInstance.applyWhereFilter(tableData, options.where);
            }
            
            const result = filteredData.length > 0 ? filteredData[0] : null;
            return Promise.resolve(result);
          }
        },
        positions: mockInstance.query.positions,
        opportunities: mockInstance.query.opportunities,
        userUsernameHistory: mockInstance.query.userUsernameHistory
      }
    };
    
    return callback(transactionContext)
      .then(result => result)
      .catch(error => {
        mockInstance.mockDataStore = snapshot;
        throw error;
      });
  }
}

// Global mock instance
let globalMockDb: ProductionDrizzleMock;

export const createMockDatabase = (): ProductionDrizzleMock => {
  globalMockDb = new ProductionDrizzleMock();
  return globalMockDb;
};

// Helper for updating feature flags in tests
export const updateFeatureFlags = async (kv: any, flags: Record<string, any>) => {
  for (const [key, value] of Object.entries(flags)) {
    await kv.put(`feature_flags:${key}`, JSON.stringify(value));
  }
};

// Mock user creation functions
export const createMockUser = (overrides: Partial<any> = {}): any => ({
  id: 1,
  telegramId: '123456',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  accountBalance: '1000.00',
  totalPnl: '0.00',
  weeklyPnl: '0.00',
  lastActiveAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUserProfile = (overrides: Partial<any> = {}): any => ({
  id: 1,
  userId: 1,
  bio: 'Test bio',
  experience: 'beginner',
  riskTolerance: 'medium',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockOrder = (overrides: Partial<any> = {}): any => ({
  id: 1,
  userId: 1,
  symbol: 'BTCUSDT',
  side: 'buy',
  quantity: '0.1',
  price: '45000.00',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test setup helpers
export const setupMockDb = () => {
  const mockDb = createMockDatabase();
  
  beforeEach(() => {
    mockDb.resetData();
  });
  
  return mockDb;
};

export const createMockCreateDb = () => {
  const mockDb = createMockDatabase();
  
  vi.mock('../../db/index', () => ({
    createDb: vi.fn().mockReturnValue(mockDb),
  }));
  
  return mockDb;
};