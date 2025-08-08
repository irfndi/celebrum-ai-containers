// Production-ready test helper utilities for Cloudflare Workers with Drizzle ORM
import { vi } from 'vitest';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { Env, ExtendedKVNamespace } from '../../src/types';
import { createDb } from '../../../db/src/utils/connection';
import { Miniflare } from 'miniflare';

// Define proper types for our mock data store
interface MockDataStore {
  [key: string]: any[];
  users: any[];
  user_username_history: any[];
  positions: any[];
  opportunities: any[];
  trading_strategies: any[];
  invitation_codes: any[];
  invitation_usage: any[];
}

// Production-ready mock KV namespace that simulates Cloudflare KV behavior
export function createMockKV(): ExtendedKVNamespace {
  const store = new Map<string, string>();
  
  return {
    get: vi.fn().mockImplementation(async (key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }) => {
      const value = store.get(key);
      if (!value) return null;
      
      if (options?.type === 'json') {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      
      return value;
    }),
    
    put: vi.fn().mockImplementation(async (key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream) => {
      if (typeof value === 'object' && value !== null) {
        store.set(key, JSON.stringify(value));
      } else {
        store.set(key, String(value));
      }
      return undefined;
    }),
    
    delete: vi.fn().mockImplementation(async (key: string) => {
      store.delete(key);
      return undefined;
    }),
    
    list: vi.fn().mockImplementation(async (options?: { prefix?: string; limit?: number; cursor?: string }) => {
      const keys = Array.from(store.keys());
      const filteredKeys = options?.prefix 
        ? keys.filter(key => key.startsWith(options.prefix!))
        : keys;
      
      const limitedKeys = options?.limit 
        ? filteredKeys.slice(0, options.limit)
        : filteredKeys;
      
      return {
        keys: limitedKeys.map(name => ({ name })),
        list_complete: true,
        cursor: '',
      };
    }),
    
    getWithMetadata: vi.fn().mockImplementation(async (key: string, options?: any) => {
      // Mock implementation - return null value and metadata
      return {
        value: null,
        metadata: null,
      };
    }),
    
    clear: vi.fn().mockImplementation(async () => {
      store.clear();
    }),
  } as ExtendedKVNamespace;
}

// Production-ready Drizzle database instance for testing
export async function createTestDatabase() {
  // Create an in-memory store for test data
  const dataStore = new Map<string, Map<string, any>>();
  
  // Initialize tables
  dataStore.set('users', new Map());
  dataStore.set('positions', new Map());
  dataStore.set('invitation_codes', new Map());
  dataStore.set('sessions', new Map());
  dataStore.set('invitation_usage', new Map());
  
  // Use a mock D1 database that works with Drizzle and stores data
  const mockD1 = {
    prepare: vi.fn().mockImplementation((sql: string) => {
      return {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockImplementation(async () => {
          // Simple mock - return first item from users table for SELECT queries
          if (sql.includes('SELECT') && sql.includes('users')) {
            const usersTable = dataStore.get('users');
            if (usersTable && usersTable.size > 0) {
              return Array.from(usersTable.values())[0];
            }
          }
          return null;
        }),
        all: vi.fn().mockImplementation(async () => {
          // Return all items for SELECT queries
          if (sql.includes('SELECT') && sql.includes('users')) {
            const usersTable = dataStore.get('users');
            return { results: usersTable ? Array.from(usersTable.values()) : [] };
          }
          return { results: [] };
        }),
        run: vi.fn().mockImplementation(async () => {
          // Mock successful operations
          return { success: true, meta: { changes: 1, last_row_id: 1 } };
        }),
        raw: vi.fn().mockResolvedValue([]),
      };
    }),
    exec: vi.fn().mockResolvedValue({ success: true }),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    batch: vi.fn().mockResolvedValue([]),
  };
  
  // Create a mock Drizzle database that can handle basic operations
   let lastInsertedUser: any = null;
   
   // Helper function to detect table name from Drizzle table objects
   const detectTableName = (table: any): string => {
     if (!table) return 'unknown';
     
     // Check for Drizzle Symbol
     if (table[Symbol.for('drizzle:Name')]) {
       return table[Symbol.for('drizzle:Name')];
     }
     
     // Check for table metadata (most common for Drizzle tables)
     if (table._ && table._.name) {
       return table._.name;
     }
     
     // Check for table config
     if (table._ && table._.config && table._.config.name) {
       return table._.config.name;
     }
     
     // Check for dbName property
     if (table._ && table._.dbName) {
       return table._.dbName;
     }
     
     // For Drizzle SQLite tables, check the table name directly
     if (table._.baseName) {
       return table._.baseName;
     }
     
     // Fallback to string representation
     if (typeof table === 'string') {
       return table;
     }
     
     // Last resort: try to extract from toString or constructor
     if (table.toString && typeof table.toString === 'function') {
       const str = table.toString();
       // Look for table name patterns in the string representation
       const match = str.match(/table["']([^"']+)["']/) || str.match(/name["']([^"']+)["']/);
       if (match) {
         return match[1];
       }
     }
     
     return 'unknown';
   };
   
   // Define getFilteredResults function globally within the mock
   const getFilteredResults = (tableData: any[], whereCondition: any) => {
     if (!whereCondition || !whereCondition.queryChunks || !Array.isArray(whereCondition.queryChunks)) {
       return tableData;
     }
     
     // Check if this is a compound condition
     const hasLogicalOperator = whereCondition.queryChunks.some((chunk: any) => 
       chunk === 'and' || chunk === 'or' || 
       (typeof chunk === 'string' && (chunk.includes('AND') || chunk.includes('OR')))
     );
     
     if (hasLogicalOperator) {
       // Handle compound conditions
       const individualConditions: any[] = [];
       let currentCondition: any = null;
       
       for (let i = 0; i < whereCondition.queryChunks.length; i++) {
         const chunk = whereCondition.queryChunks[i];
         
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
       
       // Find records that match all conditions (AND logic)
       return tableData.filter(record => {
         let matchesAll = true;
         
         for (const cond of individualConditions) {
           let columnName = null;
           let value = null;
           
           for (const chunk of cond.queryChunks) {
             if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
               columnName = chunk.name;
             }
             if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
               value = chunk.value;
             }
           }
           
           if (columnName && value !== null) {
             const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
             if (record[propertyName] !== value) {
               matchesAll = false;
               break;
             }
           }
         }
         
         return matchesAll;
       });
     } else {
       // Handle single conditions
       let columnName = null;
       let value = null;
       
       // Extract column name and value from queryChunks
       for (const chunk of whereCondition.queryChunks) {
         if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
           columnName = chunk.name;
         }
         if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
           value = chunk.value;
         }
       }
       
       if (columnName && value !== null) {
         // Convert snake_case column name to camelCase property name
         const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
         
         // Find matching records
         const filtered = tableData.filter(record => {
           const actualValue = record[propertyName];
           const matches = actualValue === value;
           return matches;
         });
         
         return filtered;
       }
     }
     
     return tableData;
   };
   
   const mockDrizzleDb = {
    // Add the query property that Drizzle expects
    query: {
      users: {
        findFirst: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('users');
          if (!tableData || tableData.size === 0) return null;
          
          const allData = Array.from(tableData.values());
          console.log(`[TEST HELPERS DEBUG] Users table has ${allData.length} records`);
          
          if (options.where) {
            console.log('[TEST HELPERS DEBUG] Applying where condition:', options.where);
            const filtered = getFilteredResults(allData, options.where);
            console.log(`[TEST HELPERS DEBUG] Filtered results: ${filtered.length} records`);
            return filtered.length > 0 ? filtered[0] : null;
          }
          return allData[0] || null;
        }),
        findMany: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('users');
          if (!tableData || tableData.size === 0) return [];
          
          const allData = Array.from(tableData.values());
          if (options.where) {
            return getFilteredResults(allData, options.where);
          }
          return allData;
        }),
        findById: vi.fn().mockImplementation(async (id: any) => {
          console.log(`[FINDBYID DEBUG] Called with id: ${id} (type: ${typeof id})`);
          console.log(`[FINDBYID DEBUG] DataStore keys:`, Array.from(dataStore.keys()));
          
          const tableData = dataStore.get('users');
          console.log(`[FINDBYID DEBUG] Table data exists:`, !!tableData);
          console.log(`[FINDBYID DEBUG] Table data size:`, tableData ? tableData.size : 0);
          
          if (!tableData || tableData.size === 0) {
            console.log(`[FINDBYID DEBUG] No table data found, returning null`);
            return null;
          }
          
          // Convert search ID to string for consistent comparison
          const searchId = String(id);
          console.log(`[FINDBYID DEBUG] Searching for ID: ${searchId} (converted to string)`);
          
          // First try direct key lookup (most efficient)
          if (tableData.has(searchId)) {
            const user = tableData.get(searchId);
            console.log(`[FINDBYID DEBUG] Found user via direct key lookup:`, user);
            return user;
          }
          
          // Fallback to value search
          const allData = Array.from(tableData.values());
          console.log(`[FINDBYID DEBUG] All data count:`, allData.length);
          console.log(`[FINDBYID DEBUG] Available user ids:`, allData.map(u => `${u.id} (${typeof u.id})`));
          console.log(`[FINDBYID DEBUG] Available users:`, allData.map(u => ({ id: u.id, telegramId: u.telegramId })));
          
          const user = allData.find(record => String(record.id) === searchId);
          console.log(`[FINDBYID DEBUG] Found user via value search:`, user ? 'YES' : 'NO');
          if (user) {
            console.log(`[FINDBYID DEBUG] Found user details:`, { id: user.id, telegramId: user.telegramId });
          }
          return user || null;
        })
      },
      invitationCodes: {
        findFirst: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('invitation_codes');
          if (!tableData || tableData.size === 0) return null;
          
          const allData = Array.from(tableData.values());
          if (options.where) {
            const filtered = getFilteredResults(allData, options.where);
            return filtered.length > 0 ? filtered[0] : null;
          }
          return allData[0] || null;
        }),
        findMany: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('invitation_codes');
          if (!tableData || tableData.size === 0) return [];
          
          const allData = Array.from(tableData.values());
          if (options.where) {
            return getFilteredResults(allData, options.where);
          }
          return allData;
        })
      },
      opportunities: {
        findFirst: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('opportunities');
          if (!tableData || tableData.size === 0) return null;
          
          const allData = Array.from(tableData.values());
          if (options.where) {
            const filtered = getFilteredResults(allData, options.where);
            return filtered.length > 0 ? filtered[0] : null;
          }
          return allData[0] || null;
        }),
        findMany: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('opportunities');
          if (!tableData || tableData.size === 0) return [];
          
          const allData = Array.from(tableData.values());
          if (options.where) {
            return getFilteredResults(allData, options.where);
          }
          return allData;
        }),
        findById: vi.fn().mockImplementation(async (id: any) => {
          const tableData = dataStore.get('opportunities');
          if (!tableData || tableData.size === 0) return null;
          
          const allData = Array.from(tableData.values());
          return allData.find(record => record.id === id) || null;
        }),
        findActive: vi.fn().mockImplementation(async (options: any = {}) => {
          const tableData = dataStore.get('opportunities');
          if (!tableData || tableData.size === 0) return [];
          
          const allData = Array.from(tableData.values());
          // Filter for active opportunities (assuming isActive property)
          const activeOpportunities = allData.filter(opp => opp.isActive !== false);
          
          if (options.where) {
            return getFilteredResults(activeOpportunities, options.where);
          }
          return activeOpportunities;
        })
      }
    },
    select: vi.fn().mockImplementation(() => {
      console.log('[MOCK DB] SELECT method called!');
      return {
        from: vi.fn().mockImplementation((table: any) => {
          console.log('[MOCK DB] FROM method called with table:', table);
          const tableName = detectTableName(table);
          console.log('[MOCK DB] SELECT - Table name detected:', tableName);
          console.log('[MOCK DB] SELECT - Table object:', table);
          console.log('[TEST HELPERS DEBUG] Detected table name:', tableName);
          console.log('[TEST HELPERS DEBUG] Available tables in dataStore:', Array.from(dataStore.keys()));
         
         const getResult = async () => {
            const tableData = dataStore.get(tableName);
            if (tableData && tableData.size > 0) {
              // For users table, return the last inserted user or first available
              if (tableName === 'users' && lastInsertedUser) {
                return lastInsertedUser;
              }
              return Array.from(tableData.values())[0];
            }
            return null;
          };
          
          const getAllResults = async () => {
            const tableData = dataStore.get(tableName);
            if (tableData && tableData.size > 0) {
              return Array.from(tableData.values());
            }
            return [];
          };
          
          // Add get method for single result queries (like .get() in Drizzle)
          const getSingleResult = async () => {
            const tableData = dataStore.get(tableName);
            if (tableData && tableData.size > 0) {
              const allData = Array.from(tableData.values());
              return allData[0] || null;
            }
            return null;
          };
          


          const getFilteredResult = async (condition: any) => {
            const tableData = dataStore.get(tableName);
            if (!tableData || tableData.size === 0) {
              console.log('[TEST HELPERS DEBUG] No table data found for:', tableName);
              return null;
            }
            
            console.log('[TEST HELPERS DEBUG] Table data size:', tableData.size);
            console.log('[TEST HELPERS DEBUG] Table data keys:', Array.from(tableData.keys()));
            
            // Parse Drizzle condition with queryChunks using enhanced logic
            if (condition && condition.queryChunks && Array.isArray(condition.queryChunks)) {
              console.log('[TEST HELPERS DEBUG] Filtering with queryChunks:', condition.queryChunks.length);
              console.log('[TEST HELPERS DEBUG] QueryChunks content:', condition.queryChunks);
              
              // Check if this is a compound condition
              const hasLogicalOperator = condition.queryChunks.some((chunk: any) => 
                chunk === 'and' || chunk === 'or' || 
                (typeof chunk === 'string' && (chunk.includes('AND') || chunk.includes('OR')))
              );
              
              if (hasLogicalOperator) {
                // Handle compound conditions
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
                
                console.log('[TEST HELPERS DEBUG] Parsed individual conditions:', individualConditions.length);
                
                // Find records that match all conditions (AND logic)
                for (const record of Array.from(tableData.values())) {
                  let matchesAll = true;
                  
                  for (const cond of individualConditions) {
                    let columnName = null;
                    let value = null;
                    
                    for (const chunk of cond.queryChunks) {
                      if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
                        columnName = chunk.name;
                      }
                      if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
                        value = chunk.value;
                      }
                    }
                    
                    if (columnName && value !== null) {
                      const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
                      if (record[propertyName] !== value) {
                        matchesAll = false;
                        break;
                      }
                    }
                  }
                  
                  if (matchesAll) {
                    console.log('[TEST HELPERS DEBUG] Found matching record:', record);
                    return record;
                  }
                }
              } else {
                // Handle single conditions - improved logic for eq() conditions
                let columnName = null;
                let value = null;
                
                console.log('[TEST HELPERS DEBUG] Processing single condition...');
                
                // Extract column name and value from queryChunks
                // Look for patterns like: [columnChunk, valueChunk] or [columnChunk, operatorChunk, valueChunk]
                for (let i = 0; i < condition.queryChunks.length; i++) {
                  const chunk = condition.queryChunks[i];
                  console.log(`[TEST HELPERS DEBUG] Processing chunk ${i}:`, typeof chunk, chunk?.name || chunk?.value || 'unknown');
                  
                  if (chunk && typeof chunk === 'object') {
                    if (chunk.name && chunk.dataType) {
                      columnName = chunk.name;
                      console.log('[TEST HELPERS DEBUG] Found column name:', columnName);
                    } else if (chunk.hasOwnProperty('value')) {
                      value = chunk.value;
                      console.log('[TEST HELPERS DEBUG] Found value:', value);
                    }
                  }
                }
                
                // Special handling for eq() conditions - look for adjacent column and value
                if (!columnName || value === null) {
                  console.log('[TEST HELPERS DEBUG] Trying alternative parsing for eq() condition');
                  for (let i = 0; i < condition.queryChunks.length - 1; i++) {
                    const chunk1 = condition.queryChunks[i];
                    const chunk2 = condition.queryChunks[i + 1];
                    
                    if (chunk1 && typeof chunk1 === 'object' && chunk1.name && chunk1.dataType &&
                        chunk2 && typeof chunk2 === 'object' && chunk2.hasOwnProperty('value')) {
                      columnName = chunk1.name;
                      value = chunk2.value;
                      console.log('[TEST HELPERS DEBUG] Found adjacent column/value:', columnName, value);
                      break;
                    }
                  }
                }
                
                if (columnName && value !== null) {
                  // Convert snake_case column name to camelCase property name
                  const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
                  
                  console.log(`[TEST HELPERS DEBUG] Single condition: ${columnName}(${propertyName}) = ${value}`);
                  
                  // Find matching record based on the column and value
                  for (const record of Array.from(tableData.values())) {
                    const actualValue = record[propertyName];
                    const matches = actualValue === value;
                    console.log(`[TEST HELPERS DEBUG] Record ${propertyName}=${actualValue} (type: ${typeof actualValue}) vs expected=${value} (type: ${typeof value}), matches: ${matches}`);
                    console.log('[TEST HELPERS DEBUG] Full record:', JSON.stringify(record, null, 2));
                    if (matches) {
                      console.log('[TEST HELPERS DEBUG] Found matching record:', record);
                      return record;
                    }
                  }
                } else {
                  console.log('[TEST HELPERS DEBUG] No valid column/value found in single condition');
                  console.log('[TEST HELPERS DEBUG] columnName:', columnName, 'value:', value);
                }
              }
            }
            
            console.log('[TEST HELPERS DEBUG] No matching record found');
            return null;
          };
         
         return {
           where: vi.fn().mockImplementation((condition: any) => {
             console.log('[MOCK DB] WHERE condition called for table:', tableName);
             console.log('[MOCK DB] WHERE condition:', condition);
             console.log('[MOCK DB] WHERE condition type:', typeof condition);
             console.log('[MOCK DB] WHERE condition queryChunks:', condition?.queryChunks);
             
             // Apply filtering based on where condition
             const getFilteredSingleResult = async () => {
               console.log(`[MOCK DB] WHERE.GET - Filtering ${tableName} with condition:`, condition);
               return await getFilteredResult(condition);
             };
             
             const getAllFilteredResults = async () => {
               console.log(`[MOCK DB] WHERE.ALL - Filtering ${tableName} with condition:`, condition);
               const tableData = dataStore.get(tableName);
               if (!tableData || tableData.size === 0) {
                 return [];
               }
               
               const allData = Array.from(tableData.values());
               const filtered = getFilteredResults(allData, condition);
               console.log('[MOCK DB] All filtered results:', filtered);
               return filtered;
             };
             
             const whereResult = {
               get: vi.fn().mockImplementation(getFilteredSingleResult),
               all: vi.fn().mockImplementation(getAllFilteredResults)
             };
             
             // Make the where result itself awaitable and return an array
             // This handles cases where .all() is not explicitly called
             Object.defineProperty(whereResult, 'then', {
               value: function(resolve: any) {
                 console.log(`[TEST HELPERS SELECT DEBUG] Making ${tableName} where result awaitable`);
                 const tableData = dataStore.get(tableName);
                 console.log(`[TEST HELPERS SELECT DEBUG] Table ${tableName} has ${tableData ? tableData.size : 0} records`);
                 if (tableData && tableData.size > 0) {
                   const allData = Array.from(tableData.values());
                   console.log(`[TEST HELPERS SELECT DEBUG] All data for ${tableName}:`, allData);
                   const results = getFilteredResults(allData, condition);
                   console.log(`[TEST HELPERS SELECT DEBUG] Filtered results for ${tableName}:`, results);
                   resolve(results);
                 } else {
                   console.log(`[TEST HELPERS SELECT DEBUG] No data found for ${tableName}, returning empty array`);
                   resolve([]);
                 }
               },
               writable: false,
               enumerable: false
             });
             
             return whereResult;
           }),
           get: vi.fn().mockImplementation(async () => {
             console.error('[MOCK DEBUG] select().get() called for table:', tableName, '(no where condition)');
             const tableData = dataStore.get(tableName);
             console.error('[MOCK DEBUG] tableData size:', tableData?.size || 0);
             
             if (!tableData || tableData.size === 0) {
               console.error('[MOCK DEBUG] No data in table, returning null');
               return null;
             }
             
             const allData = Array.from(tableData.values());
             console.error('[MOCK DEBUG] allData sample:', allData.slice(0, 2));
             const result = allData.length > 0 ? allData[0] : null;
             console.error('[MOCK DEBUG] final result (first record):', result);
             
             return result;
           }),
           all: vi.fn().mockImplementation(async () => {
             console.log(`[MOCK DB] ALL called for table: ${tableName}`);
             const tableData = dataStore.get(tableName);
             if (!tableData || tableData.size === 0) {
               console.log(`[MOCK DB] No data found for ${tableName}, returning empty array`);
               return [];
             }
             
             const allData = Array.from(tableData.values());
             console.log(`[MOCK DB] Returning ${allData.length} records for ${tableName}`);
             return allData;
           })
         };
       })
     };
   }),
     insert: vi.fn().mockImplementation((table: any) => {
        // Detect table name using Symbol or fallback methods
        const tableName = detectTableName(table);
        console.log('[MOCK DB] INSERT - Table name detected:', tableName);
        
        // Helper function to convert snake_case to camelCase
        const convertSnakeToCamel = (obj: any): any => {
          if (obj === null || obj === undefined || typeof obj !== 'object') {
            return obj;
          }
          
          if (Array.isArray(obj)) {
            return obj.map(convertSnakeToCamel);
          }
          
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            converted[camelKey] = convertSnakeToCamel(value);
          }
          return converted;
        };
        
        return {
          values: vi.fn().mockImplementation((data: any) => {
            console.log('[MOCK DB] INSERT - Data to insert:', JSON.stringify(data, null, 2));
            return {
              execute: vi.fn().mockImplementation(async () => {
                // Convert snake_case to camelCase for consistency
                const processedData = convertSnakeToCamel(data);
                
                // Store the actual data being inserted
                const insertedData = {
                  ...processedData,
                  createdAt: processedData.createdAt || new Date(),
                  updatedAt: processedData.updatedAt || new Date(),
                  ...(tableName === 'users' && { lastActiveAt: processedData.lastActiveAt || new Date() })
                };
                
                // Store in our mock database based on table
                const tableStore = dataStore.get(tableName);
                if (tableStore) {
                  // Generate a more predictable key based on table type
                  let key: string;
                  if (tableName === 'users') {
                    // Use the provided ID or generate one if not provided
                    if (!insertedData.id) {
                      insertedData.id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    }
                    // Always use the ID as the key for users (convert to string for consistency)
                    key = String(insertedData.id);
                  } else if (tableName === 'invitation_codes') {
                    // Use the code as the key since it's the primary key in the schema
                    key = String(insertedData.code);
                  } else if (tableName === 'invitation_usage') {
                    key = String(insertedData.id || insertedData.userId || Math.random().toString());
                  } else {
                    key = String(insertedData.id || Math.random().toString());
                  }
                  
                  console.log(`[TEST HELPERS INSERT DEBUG] Storing in ${tableName} with key ${key}:`, insertedData);
                  tableStore.set(key, insertedData);
                  console.log(`[TEST HELPERS INSERT DEBUG] Table ${tableName} now has ${tableStore.size} records`);
                  console.log(`[TEST HELPERS INSERT DEBUG] All keys in ${tableName}:`, Array.from(tableStore.keys()));
                  console.log('[MOCK DB] INSERT - Data stored in table', tableName, ':', JSON.stringify(Array.from(tableStore.values()), null, 2));
                  console.log('[MOCK DB] INSERT - All dataStore keys:', Array.from(dataStore.keys()));
                } else {
                  console.log(`[TEST HELPERS INSERT DEBUG] No table store found for ${tableName}`);
                }
                
                // Keep track of last inserted user for backward compatibility
                if (tableName === 'users') {
                  lastInsertedUser = insertedData;
                }
                
                return [insertedData];
              }),
              returning: vi.fn().mockImplementation(async () => {
                // Convert snake_case to camelCase for consistency
                const processedData = convertSnakeToCamel(data);
                
                // Store the actual data being inserted
                const insertedData = {
                  ...processedData,
                  createdAt: processedData.createdAt || new Date(),
                  updatedAt: processedData.updatedAt || new Date(),
                  ...(tableName === 'users' && { lastActiveAt: processedData.lastActiveAt || new Date() })
                };
                
                // Store in our mock database based on table
                const tableStore = dataStore.get(tableName);
                if (tableStore) {
                  // Generate a more predictable key based on table type
                  let key: string;
                  if (tableName === 'users') {
                    // Use the provided ID or generate one if not provided
                    if (!insertedData.id) {
                      insertedData.id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    }
                    // Always use the ID as the key for users (convert to string for consistency)
                    key = String(insertedData.id);
                  } else if (tableName === 'invitation_codes') {
                    // Generate a unique ID for invitation codes, don't use code as key
                    if (!insertedData.id) {
                      insertedData.id = `invitation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    }
                    key = String(insertedData.id);
                  } else if (tableName === 'invitation_usage') {
                    key = String(insertedData.id || insertedData.userId || Math.random().toString());
                  } else {
                    key = String(insertedData.id || Math.random().toString());
                  }
                  
                  console.log(`[TEST HELPERS INSERT DEBUG] Storing in ${tableName} with key ${key}:`, insertedData);
                  tableStore.set(key, insertedData);
                  console.log(`[TEST HELPERS INSERT DEBUG] Table ${tableName} now has ${tableStore.size} records`);
                  console.log(`[TEST HELPERS INSERT DEBUG] All keys in ${tableName}:`, Array.from(tableStore.keys()));
                  console.log('[MOCK DB] INSERT - Data stored in table', tableName, ':', JSON.stringify(Array.from(tableStore.values()), null, 2));
                  console.log('[MOCK DB] INSERT - All dataStore keys:', Array.from(dataStore.keys()));
                } else {
                  console.log(`[TEST HELPERS INSERT DEBUG] No table store found for ${tableName}`);
                }
                
                // Keep track of last inserted user for backward compatibility
                if (tableName === 'users') {
                  lastInsertedUser = insertedData;
                }
                
                return [insertedData];
              })
            };
          })
        };
      }),
     update: vi.fn().mockImplementation((table: any) => {
       const tableName = detectTableName(table);
       let updateData: any = {};
       let whereCondition: any = null;
       
      return {
        set: vi.fn().mockImplementation((data: any) => {
          updateData = data;
          return {
            where: vi.fn().mockImplementation((condition: any) => {
              whereCondition = condition;
              return {
                execute: vi.fn().mockImplementation(async () => {
                  console.log(`[TEST HELPERS UPDATE DEBUG] Executing update for table: ${tableName}`);
                  console.log(`[TEST HELPERS UPDATE DEBUG] Update data:`, updateData);
                  console.log(`[TEST HELPERS UPDATE DEBUG] Where condition:`, whereCondition);
                  
                  // Actually update the data in dataStore with proper filtering
                  const tableStore = dataStore.get(tableName);
                  if (!tableStore) {
                    console.log(`[TEST HELPERS UPDATE DEBUG] No table store found for ${tableName}`);
                    return { rowsAffected: 0 };
                  }
                  
                  console.log(`[TEST HELPERS UPDATE DEBUG] Table ${tableName} has ${tableStore.size} records before update`);
                  
                  if (whereCondition && whereCondition.queryChunks && Array.isArray(whereCondition.queryChunks)) {
                    console.log('[TEST HELPERS UPDATE DEBUG] Updating with queryChunks:', whereCondition.queryChunks.length);
                    
                    // Check if this is a compound condition
                    const hasLogicalOperator = whereCondition.queryChunks.some((chunk: any) => 
                      chunk === 'and' || chunk === 'or' || 
                      (typeof chunk === 'string' && (chunk.includes('AND') || chunk.includes('OR')))
                    );
                    
                    let rowsAffected = 0;
                    
                    if (hasLogicalOperator) {
                      // Handle compound conditions
                      const individualConditions: any[] = [];
                      let currentCondition: any = null;
                      
                      for (let i = 0; i < whereCondition.queryChunks.length; i++) {
                        const chunk = whereCondition.queryChunks[i];
                        
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
                      
                      console.log('[TEST HELPERS UPDATE DEBUG] Parsed individual conditions:', individualConditions.length);
                      
                      // Find and update records that match all conditions (AND logic)
                      for (const [key, record] of Array.from(tableStore.entries())) {
                        let matchesAll = true;
                        
                        for (const cond of individualConditions) {
                          let columnName = null;
                          let value = null;
                          
                          for (const chunk of cond.queryChunks) {
                            if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
                              columnName = chunk.name;
                            }
                            if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
                              value = chunk.value;
                            }
                          }
                          
                          if (columnName && value !== null) {
                            const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
                            if (record[propertyName] !== value) {
                              matchesAll = false;
                              break;
                            }
                          }
                        }
                        
                        if (matchesAll) {
                          const updatedRecord = { ...record, ...updateData, updatedAt: new Date() };
                          tableStore.set(key, updatedRecord);
                          rowsAffected++;
                          console.log('[TEST HELPERS UPDATE DEBUG] Updated record with key:', key, 'new record:', updatedRecord);
                        }
                      }
                    } else {
                      // Handle single conditions
                      let columnName = null;
                      let value = null;
                      
                      // Extract column name and value from queryChunks
                      for (const chunk of whereCondition.queryChunks) {
                        if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
                          columnName = chunk.name;
                        }
                        if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
                          value = chunk.value;
                        }
                      }
                      
                      if (columnName && value !== null) {
                        // Convert snake_case column name to camelCase property name
                        const propertyName = columnName.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
                        
                        console.log(`[TEST HELPERS UPDATE DEBUG] Single condition: ${columnName}(${propertyName}) = ${value}`);
                        
                        // Find and update matching records
                        for (const [key, record] of Array.from(tableStore.entries())) {
                          console.log(`[TEST HELPERS UPDATE DEBUG] Checking record with key ${key}:`, record);
                          console.log(`[TEST HELPERS UPDATE DEBUG] Comparing ${propertyName}: ${record[propertyName]} === ${value}`);
                          if (record[propertyName] === value) {
                            const updatedRecord = { ...record, ...updateData, updatedAt: new Date() };
                            tableStore.set(key, updatedRecord);
                            rowsAffected++;
                            console.log('[TEST HELPERS UPDATE DEBUG] Updated record with key:', key, 'new record:', updatedRecord);
                          }
                        }
                      }
                    }
                    
                    console.log('[TEST HELPERS UPDATE DEBUG] Rows affected:', rowsAffected);
                    console.log(`[TEST HELPERS UPDATE DEBUG] Table ${tableName} has ${tableStore.size} records after update`);
                    console.log(`[TEST HELPERS UPDATE DEBUG] All records after update:`, Array.from(tableStore.values()));
                    return { rowsAffected };
                  }
                  return { rowsAffected: 0 };
                }),
                returning: vi.fn().mockImplementation(async () => {
                  console.log(`[TEST HELPERS RETURNING DEBUG] Getting updated records for table: ${tableName}`);
                  const tableStore = dataStore.get(tableName);
                  if (!tableStore) {
                    console.log(`[TEST HELPERS RETURNING DEBUG] No table store found for ${tableName}`);
                    return [];
                  }
                  
                  // Return all records from the table store (they should be updated)
                  const allRecords = Array.from(tableStore.values());
                  console.log(`[TEST HELPERS RETURNING DEBUG] Returning ${allRecords.length} records:`, allRecords);
                  return allRecords;
                })
              };
            })
          };
        })
      };
    }),
    delete: vi.fn().mockImplementation((table: any) => {
      const tableName = detectTableName(table);
      console.log(`[MOCK DELETE] Deleting from table: ${tableName}`);
      
      // Support for delete without where clause (clear entire table)
      const deleteResult = {
        where: vi.fn().mockImplementation((condition: any) => {
          console.log(`[MOCK DELETE] Where condition:`, condition);
          
          // If no condition, clear the entire table
          if (!condition) {
            const tableStore = dataStore.get(tableName);
            if (tableStore) {
              const deletedCount = tableStore.size;
              tableStore.clear();
              console.log(`[MOCK DELETE] Cleared entire table ${tableName}, deleted ${deletedCount} records`);
              return Promise.resolve({ rowsAffected: deletedCount });
            }
            return Promise.resolve({ rowsAffected: 0 });
          }
          
          // Handle conditional deletes
          const tableStore = dataStore.get(tableName);
          if (!tableStore) {
            console.log(`[MOCK DELETE] Table ${tableName} not found`);
            return Promise.resolve({ rowsAffected: 0 });
          }
          
          const recordsToDelete = getFilteredResults(Array.from(tableStore.values()), condition);
          console.log(`[MOCK DELETE] Found ${recordsToDelete.length} records to delete`);
          
          // Delete matching records
          let deletedCount = 0;
          for (const record of recordsToDelete) {
            const recordId = record.id || record.code || record.telegramId;
            if (recordId && tableStore.has(recordId)) {
              tableStore.delete(recordId);
              deletedCount++;
            }
          }
          
          console.log(`[MOCK DELETE] Deleted ${deletedCount} records from ${tableName}`);
          return Promise.resolve({ rowsAffected: deletedCount });
        }),
        
        // Support for direct execution without where clause
        execute: vi.fn().mockImplementation(async () => {
          console.log(`[MOCK DELETE] Direct execute - clearing entire table ${tableName}`);
          const tableStore = dataStore.get(tableName);
          if (tableStore) {
            const deletedCount = tableStore.size;
            tableStore.clear();
            console.log(`[MOCK DELETE] Cleared entire table ${tableName}, deleted ${deletedCount} records`);
            return { rowsAffected: deletedCount };
          }
          return { rowsAffected: 0 };
        })
      };
      
      // Make the delete result thenable to support await without .execute()
       deleteResult.then = function(onFulfilled, onRejected) {
         return deleteResult.execute().then(onFulfilled, onRejected);
       };
      
      return deleteResult;
    }),
    transaction: vi.fn().mockImplementation(async (callback: any) => {
      // Mock transaction - just execute the callback with the same db instance
      return await callback(mockDrizzleDb);
    })
  };
  
  return {
    mockD1: mockD1 as any,
    drizzleDb: mockDrizzleDb as any,
    dataStore
  };
}

// Helper to get just the Drizzle database instance
export async function createTestDrizzleDatabase() {
  const { drizzleDb } = await createTestDatabase();
  return drizzleDb;
}

// Test user creation helper
export function createMockUser(overrides = {}) {
  return {
    id: 123,
    telegramId: '123456789',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    languageCode: 'en',
    email: undefined,
    role: 'free' as const,
    status: 'active' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'), // Date object for 2024-01-01
    updatedAt: new Date('2024-01-01T00:00:00Z'), // Date object for 2024-01-01
    lastActiveAt: new Date('2024-01-01T00:00:00Z'), // Date object for 2024-01-01
    settings: { notifications: true, theme: 'light' as const, language: 'en', timezone: 'UTC' }, // JSON object
    apiLimits: {}, // JSON object
    accountBalance: '0.00',
    betaExpiresAt: undefined,
    tradingPreferences: {}, // JSON object
    ...overrides,
  };
}

// Mock environment for Cloudflare Workers
export async function createMockEnv(): Promise<Env> {
  const { drizzleDb } = await createTestDatabase();
  return {
    DB: drizzleDb as any,
    SESSIONS: createMockKV(),
    CELEBRUM_KV: createMockKV(),
    PROD_BOT_MARKET_CACHE: createMockKV(),
    PROD_BOT_SESSION_STORE: createMockKV(),
    FEATURE_REGISTRATION_INVITATION_REQUIRED: 'false',
    CELEBRUM_CONTAINERS: {} as any,
    CELEBRUM_STORAGE: {} as any,
    API_SERVICE_URL: 'http://localhost:3000',
    WEB_SERVICE_URL: 'http://localhost:3001',
    DISCORD_BOT_SERVICE_URL: 'http://localhost:3002',
    TELEGRAM_BOT_SERVICE_URL: 'http://localhost:3003',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    ADMIN_TELEGRAM_IDS: '123456789',
    RATE_LIMIT_REQUESTS_PER_MINUTE: '100',
    ALCHEMY_MANAGED: 'false',
    CONTAINER_VERSION: '1.0.0',
    DEPLOYMENT_STRATEGY: 'rolling',
    ENVIRONMENT: 'test',
  };
}

// Additional mock utilities for Cloudflare Workers
export function createMockRequest(url = 'https://example.com', options: RequestInit = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options;
  
  return new Request(url, {
    method,
    body: typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  });
}

export function createMockResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function createMockContext() {
  const env = await createMockEnv();
  return {
    env,
    request: new Request('https://example.com'),
    waitUntil: vi.fn(),
  };
}

export function createScenarioBasedTelegramApiMock(scenario: {
  networkError?: boolean;
  rateLimit?: boolean;
  invalidToken?: boolean;
} = {}) {
  const mockSendMessage = vi.fn();
  const mockEditMessageText = vi.fn();
  const mockDeleteMessage = vi.fn();
  const mockAnswerCallbackQuery = vi.fn();

  if (scenario.networkError) {
    mockSendMessage.mockRejectedValue(new Error('Network error'));
    mockEditMessageText.mockRejectedValue(new Error('Network error'));
    mockDeleteMessage.mockRejectedValue(new Error('Network error'));
    mockAnswerCallbackQuery.mockRejectedValue(new Error('Network error'));
  } else if (scenario.rateLimit) {
    mockSendMessage.mockRejectedValue(new Error('Rate limit exceeded'));
    mockEditMessageText.mockRejectedValue(new Error('Rate limit exceeded'));
    mockDeleteMessage.mockRejectedValue(new Error('Rate limit exceeded'));
    mockAnswerCallbackQuery.mockRejectedValue(new Error('Rate limit exceeded'));
  } else if (scenario.invalidToken) {
    mockSendMessage.mockRejectedValue(new Error('Unauthorized'));
    mockEditMessageText.mockRejectedValue(new Error('Unauthorized'));
    mockDeleteMessage.mockRejectedValue(new Error('Unauthorized'));
    mockAnswerCallbackQuery.mockRejectedValue(new Error('Unauthorized'));
  } else {
    // Default successful responses
    mockSendMessage.mockResolvedValue({ ok: true, result: { message_id: 123 } });
    mockEditMessageText.mockResolvedValue({ ok: true, result: { message_id: 123 } });
    mockDeleteMessage.mockResolvedValue({ ok: true, result: true });
    mockAnswerCallbackQuery.mockResolvedValue({ ok: true, result: true });
  }

  // Mock the global fetch or telegram API calls
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (scenario.networkError) {
      return Promise.reject(new Error('Network error'));
    }
    if (scenario.rateLimit) {
      return Promise.reject(new Error('Rate limit exceeded'));
    }
    if (scenario.invalidToken) {
      return Promise.reject(new Error('Unauthorized'));
    }
    
    if (url.includes('sendMessage')) {
      return Promise.resolve({
        ok: true,
        json: () => mockSendMessage(),
      });
    }
    if (url.includes('editMessageText')) {
      return Promise.resolve({
        ok: true,
        json: () => mockEditMessageText(),
      });
    }
    if (url.includes('deleteMessage')) {
      return Promise.resolve({
        ok: true,
        json: () => mockDeleteMessage(),
      });
    }
    if (url.includes('answerCallbackQuery')) {
      return Promise.resolve({
        ok: true,
        json: () => mockAnswerCallbackQuery(),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  return {
    sendMessage: mockSendMessage,
    sendPhoto: vi.fn().mockResolvedValue({ ok: true }),
    sendDocument: vi.fn().mockResolvedValue({ ok: true }),
    answerCallbackQuery: mockAnswerCallbackQuery,
    editMessageText: mockEditMessageText,
    editMessageReplyMarkup: vi.fn().mockResolvedValue({ ok: true }),
    deleteMessage: mockDeleteMessage,
    getChat: vi.fn().mockResolvedValue({ ok: true }),
    getChatMember: vi.fn().mockResolvedValue({ ok: true }),
  };
}

// Enhanced test database helper with proper cleanup
export async function getTestDb(options: {
  users?: any[];
  invitations?: any[];
  sessions?: any[];
  opportunities?: any[];
} = {}) {
  const { mockD1, drizzleDb, dataStore } = await createTestDatabase();
  const kv = createMockKV();
  
  // Pre-populate the database with test data if provided
  if (options.users) {
    const usersTable = dataStore.get('users')!;
    options.users.forEach((user, index) => {
      usersTable.set(user.id || `user_${index}`, user);
    });
    console.log('[TEST HELPERS] Populated users table with', options.users.length, 'records');
  }
  
  if (options.invitations) {
    const invitationsTable = dataStore.get('invitation_codes')!;
    options.invitations.forEach((invitation, index) => {
      // Store invitation with a unique ID as key, not the code
      const invitationId = invitation.id || `invitation_${index}`;
      // Ensure the invitation object has all required properties
      const invitationData = {
        id: invitationId,
        code: invitation.code,
        maxUses: invitation.maxUses || invitation.max_uses,
        currentUses: invitation.currentUses || invitation.current_uses || 0,
        expiresAt: invitation.expiresAt || invitation.expires_at,
        isActive: invitation.isActive !== undefined ? invitation.isActive : (invitation.is_active !== undefined ? invitation.is_active : true),
        createdAt: invitation.createdAt || invitation.created_at || new Date().toISOString(),
        updatedAt: invitation.updatedAt || invitation.updated_at || new Date().toISOString(),
        ...invitation
      };
      invitationsTable.set(invitationId, invitationData);
    });
    console.log('[TEST HELPERS] Populated invitation_codes table with', options.invitations.length, 'records');
  }
  
  if (options.sessions) {
    const sessionsTable = dataStore.get('sessions')!;
    options.sessions.forEach((session, index) => {
      sessionsTable.set(session.id || `session_${index}`, session);
    });
    console.log('[TEST HELPERS] Populated sessions table with', options.sessions.length, 'records');
  }
  
  return {
    db: drizzleDb,
    mockD1,
    kv,
    dispose: async () => {
      vi.clearAllMocks();
    },
  };
}

// Cleanup utility
export async function cleanupDb() {
  vi.clearAllMocks();
}

// Backward compatibility
export function createMockKVNamespace(): ExtendedKVNamespace {
  return createMockKV();
}

// Legacy function for backward compatibility - now uses proper Drizzle mock
export { createTestDatabase as createMockD1Database };