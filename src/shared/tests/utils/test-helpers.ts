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
  dataStore.set('invitationUsage', new Map());
  
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
          if (!tableData || tableData.size === 0) {
            console.log('[TEST HELPERS DEBUG] No users table data found');
            return null;
          }
          
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
      }
    },
    select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: any) => {
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
                // Handle single conditions
                let columnName = null;
                let value = null;
                
                console.log('[TEST HELPERS DEBUG] Processing single condition...');
                
                // Extract column name and value from queryChunks
                for (const chunk of condition.queryChunks) {
                  console.log('[TEST HELPERS DEBUG] Processing chunk type:', typeof chunk, chunk?.name || 'unknown');
                  if (chunk && typeof chunk === 'object' && chunk.name && chunk.dataType) {
                    columnName = chunk.name;
                    console.log('[TEST HELPERS DEBUG] Found column name:', columnName);
                  }
                  if (chunk && typeof chunk === 'object' && chunk.hasOwnProperty('value')) {
                    value = chunk.value;
                    console.log('[TEST HELPERS DEBUG] Found value:', value);
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
                    console.log(`[TEST HELPERS DEBUG] Record ${propertyName}=${actualValue} vs expected=${value}, matches: ${matches}`);
                    if (matches) {
                      console.log('[TEST HELPERS DEBUG] Found matching record:', record);
                      return record;
                    }
                  }
                } else {
                  console.log('[TEST HELPERS DEBUG] No valid column/value found in single condition');
                }
              }
            }
            
            console.log('[TEST HELPERS DEBUG] No matching record found');
            return null;
          };
         
         return {
           where: vi.fn().mockImplementation((condition: any) => {
             const whereResult = {
               get: vi.fn().mockImplementation(() => {
                 const tableData = dataStore.get(tableName);
                 if (tableData && tableData.size > 0) {
                   const allData = Array.from(tableData.values());
                   const results = getFilteredResults(allData, condition);
                   return results.length > 0 ? results[0] : null;
                 }
                 return null;
               }),
               all: vi.fn().mockImplementation(async () => {
                 const tableData = dataStore.get(tableName);
                 if (tableData && tableData.size > 0) {
                   const allData = Array.from(tableData.values());
                   return getFilteredResults(allData, condition);
                 }
                 return [];
               })
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
           get: vi.fn().mockImplementation(getResult),
           all: vi.fn().mockImplementation(getAllResults)
         };
       })
     }),
     insert: vi.fn().mockImplementation((table: any) => {
        // Detect table name using Symbol or fallback methods
        const tableName = detectTableName(table);
        console.log('[MOCK DB] INSERT - Table name detected:', tableName);
        return {
          values: vi.fn().mockImplementation((data: any) => {
            console.log('[MOCK DB] INSERT - Data to insert:', JSON.stringify(data, null, 2));
            return {
              execute: vi.fn().mockImplementation(async () => {
                // Store the actual data being inserted
                const insertedData = {
                  ...data,
                  createdAt: data.createdAt || new Date(),
                  updatedAt: data.updatedAt || new Date(),
                  ...(tableName === 'users' && { lastActiveAt: data.lastActiveAt || new Date() })
                };
                
                // Store in our mock database based on table
                const tableStore = dataStore.get(tableName);
                if (tableStore) {
                  const key = data.id || data.code || data.userId || Math.random().toString();
                  console.log(`[TEST HELPERS INSERT DEBUG] Storing in ${tableName} with key ${key}:`, insertedData);
                  tableStore.set(key, insertedData);
                  console.log(`[TEST HELPERS INSERT DEBUG] Table ${tableName} now has ${tableStore.size} records`);
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
                // Store the actual data being inserted
                const insertedData = {
                  ...data,
                  createdAt: data.createdAt || new Date(),
                  updatedAt: data.updatedAt || new Date(),
                  ...(tableName === 'users' && { lastActiveAt: data.lastActiveAt || new Date() })
                };
                
                // Store in our mock database based on table
                const tableStore = dataStore.get(tableName);
                if (tableStore) {
                  const key = data.id || data.code || data.userId || Math.random().toString();
                  console.log(`[TEST HELPERS INSERT DEBUG] Storing in ${tableName} with key ${key}:`, insertedData);
                  tableStore.set(key, insertedData);
                  console.log(`[TEST HELPERS INSERT DEBUG] Table ${tableName} now has ${tableStore.size} records`);
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
                  // Actually update the data in dataStore with proper filtering
                  const tableStore = dataStore.get(tableName);
                  if (tableStore && whereCondition && whereCondition.queryChunks && Array.isArray(whereCondition.queryChunks)) {
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
                          console.log('[TEST HELPERS UPDATE DEBUG] Updated record:', updatedRecord);
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
                          if (record[propertyName] === value) {
                            const updatedRecord = { ...record, ...updateData, updatedAt: new Date() };
                            tableStore.set(key, updatedRecord);
                            rowsAffected++;
                            console.log('[TEST HELPERS UPDATE DEBUG] Updated record:', updatedRecord);
                          }
                        }
                      }
                    }
                    
                    console.log('[TEST HELPERS UPDATE DEBUG] Rows affected:', rowsAffected);
                    return { rowsAffected };
                  }
                  return { rowsAffected: 0 };
                })
              };
            })
          };
        }),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockImplementation(async () => {
          return { rowsAffected: 1 };
        }),
        returning: vi.fn().mockImplementation(async () => {
          // Return mock updated data based on table
          if (tableName === 'invitation_codes') {
            return [{
              id: 'mock-invitation-id',
              code: 'BETA2024',
              currentUses: 1,
              maxUses: 5,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }];
          }
          if (tableName === 'users') {
            return [{
              id: 'mock-user-id',
              name: 'Mock User',
              createdAt: new Date(),
              updatedAt: new Date()
            }];
          }
          return [{ rowsAffected: 1 }];
        })
      };
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([])
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
      invitationsTable.set(invitation.code || `invitation_${index}`, invitation);
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