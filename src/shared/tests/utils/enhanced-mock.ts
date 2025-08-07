/**
 * Enhanced mock database with compound condition support
 */

import { vi } from 'vitest';

/**
 * Sets up a robust, production-grade mock for the 'ccxt' module.
 * This is the ONLY allowed way to mock CCXT in tests. Do not use ad-hoc or partial mocks.
 * Covers all major exchanges and unified methods, simulates both success and error cases.
 * Call this at the top of any test file that uses ccxt.
 */
export function setupRobustCCXTMock() {
  vi.mock('ccxt', () => {
    const createMockExchange = (id: string, name: string) => ({
      id,
      name,
      urls: {
        api: {
          public: `https://api.${id}.com`
        }
      },
      rateLimit: 1200,
      has: {
        fetchTicker: true,
        fetchOrderBook: true,
        fetchTrades: true,
        fetchOHLCV: true,
        fetchStatus: true,
        close: true
      },
      markets: {
        'BTC/USDT': {
          id: 'BTCUSDT',
          symbol: 'BTC/USDT',
          base: 'BTC',
          quote: 'USDT',
          active: true
        }
      },
      loadMarkets: vi.fn().mockResolvedValue({}),
      fetchTicker: vi.fn().mockImplementation((symbol: string) => {
        if (symbol === 'MISSING') throw new Error('Symbol not found');
        return Promise.resolve({
          symbol,
          last: 45000,
          bid: 44999,
          ask: 45001,
          baseVolume: 1000,
          quoteVolume: 45000000,
          timestamp: Date.now(),
          high: 46000,
          low: 44000
        });
      }),
      fetchOrderBook: vi.fn().mockImplementation((symbol: string) => {
        if (symbol === 'MISSING') throw new Error('Symbol not found');
        return Promise.resolve({
          symbol,
          bids: [[44999, 1.5], [44998, 2.0]],
          asks: [[45001, 1.2], [45002, 1.8]],
          timestamp: Date.now()
        });
      }),
      fetchTrades: vi.fn().mockImplementation((symbol: string) => {
        if (symbol === 'MISSING') throw new Error('Symbol not found');
        return Promise.resolve([
          {
            id: '1',
            timestamp: Date.now(),
            symbol,
            side: 'buy',
            amount: 1.0,
            price: 45000
          }
        ]);
      }),
      fetchOHLCV: vi.fn().mockResolvedValue([
        [Date.now(), 44000, 46000, 43900, 45000, 1000]
      ]),
      fetchStatus: vi.fn().mockResolvedValue({ status: 'ok', updated: Date.now() }),
      close: vi.fn().mockResolvedValue(undefined)
    });

    const createMockExchangeClass = (id: string, name: string) => {
      return class {
        constructor(config?: any) {
          return createMockExchange(id, name);
        }
      };
    };

    return {
      binance: createMockExchangeClass('binance', 'Binance'),
      coinbase: createMockExchangeClass('coinbase', 'Coinbase'),
      kraken: createMockExchangeClass('kraken', 'Kraken'),
      bitfinex: createMockExchangeClass('bitfinex', 'Bitfinex'),
      huobi: createMockExchangeClass('huobi', 'Huobi'),
      okx: createMockExchangeClass('okx', 'OKX'),
      bybit: createMockExchangeClass('bybit', 'Bybit'),
      exchanges: ['binance', 'coinbase', 'kraken', 'bitfinex', 'huobi', 'okx', 'bybit']
    };
  });
}

export class EnhancedProductionDrizzleMock {
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
      invitation_codes: [],
      invitationUsage: [],
      sessions: [],
      trades: [],
      candles: [],
      backtestResults: [],
      orderBooks: [],
      featureFlags: [],
      userFeatureFlags: [],
    };
    this.nextId = 1;
  }

  private applyWhereFilter(data: any[], whereCondition: any): any[] {
    if (!whereCondition) return data;
    
    return data.filter(record => {
      return this.evaluateCondition(record, whereCondition);
    });
  }

  private evaluateCondition(record: any, condition: any): boolean {
    if (!condition) return true;
    
    // Handle compound conditions (and, or)
    if (condition && typeof condition === 'object' && condition.queryChunks) {
      // Check if this is a compound condition by looking for logical operators
      const hasLogicalOperator = condition.queryChunks.some((chunk: any) => 
        chunk === 'and' || chunk === 'or' || 
        (typeof chunk === 'string' && (chunk.includes('AND') || chunk.includes('OR')))
      );
      
      if (hasLogicalOperator) {
        return this.evaluateCompoundCondition(record, condition);
      }
    }
    
    // Handle single conditions
    return this.evaluateSingleCondition(record, condition);
  }

  private evaluateCompoundCondition(record: any, condition: any): boolean {
    if (!condition.queryChunks || !Array.isArray(condition.queryChunks)) {
      return true;
    }

    console.log('[MOCK DB DEBUG] Evaluating compound condition with queryChunks:', condition.queryChunks.length);
    
    // For Drizzle and() conditions, we need to find all individual eq() conditions
    // and evaluate them all as AND operations
    const individualConditions: any[] = [];
    let currentCondition: any = null;
    
    for (let i = 0; i < condition.queryChunks.length; i++) {
      const chunk = condition.queryChunks[i];
      
      // Skip logical operators
      if (chunk === 'and' || chunk === 'or') {
        continue;
      }
      
      // Collect condition parts (column and value pairs)
      if (chunk && typeof chunk === 'object') {
        if (chunk.name && chunk.dataType) {
          // This is a column chunk, start a new condition
          if (currentCondition) {
            individualConditions.push(currentCondition);
          }
          currentCondition = { queryChunks: [chunk] };
        } else if (chunk.hasOwnProperty('value') && currentCondition) {
          // This is a value chunk, add to current condition
          currentCondition.queryChunks.push(chunk);
          individualConditions.push(currentCondition);
          currentCondition = null;
        }
      }
    }
    
    // Add any remaining condition
    if (currentCondition) {
      individualConditions.push(currentCondition);
    }
    
    console.log('[MOCK DB DEBUG] Parsed individual conditions:', individualConditions.length);
    
    // Evaluate all conditions with AND logic (default for and() function)
    let result = true;
    for (const cond of individualConditions) {
      const condResult = this.evaluateSingleCondition(record, cond);
      result = result && condResult;
      console.log('[MOCK DB DEBUG] Individual condition result:', condResult, 'Combined:', result);
      
      // Short-circuit on false for AND operations
      if (!result) break;
    }
    
    console.log('[MOCK DB DEBUG] Final compound condition result:', result);
    return result;
  }

  private evaluateSingleCondition(record: any, condition: any): boolean {
    if (!condition) return true;
    
    // Handle Drizzle SQL objects with queryChunks
    if (condition && typeof condition === 'object' && condition.queryChunks) {
      console.log('[MOCK DB DEBUG] Evaluating single condition with queryChunks');
      
      let columnName = null;
      let value = null;
      
      for (const chunk of condition.queryChunks) {
        // Look for column chunk
        if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
          columnName = chunk.name;
        }
        
        // Look for value chunk
        if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
          value = chunk.value;
        }
      }
      
      if (columnName && value !== null) {
        const propertyName = this.mapColumnNameToProperty(columnName);
        let actualValue = record[propertyName];
        let expectedValue = value;
        
        // Handle boolean comparisons
        if (typeof expectedValue === 'boolean' || typeof actualValue === 'boolean') {
          if (typeof expectedValue === 'boolean' && typeof actualValue !== 'boolean') {
            actualValue = actualValue === 1 || actualValue === '1' || actualValue === 'true';
          }
          if (typeof actualValue === 'boolean' && typeof expectedValue !== 'boolean') {
            expectedValue = expectedValue === 1 || expectedValue === '1' || expectedValue === 'true';
          }
        }
        
        const result = actualValue === expectedValue;
        console.log(`[MOCK DB DEBUG] Single condition: ${columnName}(${propertyName}) = ${expectedValue}, actual = ${actualValue}, result = ${result}`);
        return result;
      }
    }
    
    return true;
  }

  private mapColumnNameToProperty(columnName: string): string {
    // Convert snake_case to camelCase
    return columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  // Add other necessary methods from the original mock...
  select(columns?: any) {
    const createQueryBuilder = () => {
      const builder = {
        from: (table: any) => {
          this.currentTable = this.detectTableName(table);
          
          return {
            where: (whereCondition: any) => ({
              get: () => {
                const tableData = this.getTableData(this.currentTable);
                const filteredData = this.applyWhereFilter(tableData, whereCondition);
                return Promise.resolve(filteredData[0] || null);
              }
            })
          };
        }
      };
      return builder;
    };
    
    return createQueryBuilder();
  }

  private detectTableName(table: any): string {
    if (!table) return 'unknown';
    
    if (table[Symbol.for('drizzle:Name')]) {
      return table[Symbol.for('drizzle:Name')];
    }
    
    if (table._ && table._.name) {
      return table._.name;
    }
    
    if (typeof table === 'string') {
      return table;
    }
    
    return 'unknown';
  }

  private getTableData(tableName: string): any[] {
    return this.mockDataStore[tableName] || [];
  }

  // Add insert method for completeness
  insert(table: any) {
    const tableName = this.detectTableName(table);
    
    return {
      values: (data: any) => ({
        returning: () => ({
          get: () => {
            const newRecord = { ...data, id: this.nextId++ };
            this.mockDataStore[tableName] = this.mockDataStore[tableName] || [];
            this.mockDataStore[tableName].push(newRecord);
            return Promise.resolve(newRecord);
          }
        })
      })
    };
  }

  transaction(callback: (db: any) => Promise<any>) {
    return callback(this);
  }
}