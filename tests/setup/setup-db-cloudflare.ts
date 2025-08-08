/**
 * Production-ready database testing setup for Cloudflare D1
 * 
 * This setup uses the official Cloudflare Workers Vitest integration
 * to provide real D1 database instances for testing.
 */
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { Miniflare } from 'miniflare';


import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../src/db/src/schema';

// Global instances
let mf: Miniflare;
export let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  console.log('Initializing Miniflare for D1 testing...');
  
  try {
    // Manually instantiate Miniflare
    mf = new Miniflare({
      modules: true,
      script: ``, // We don't need a script, just the bindings
      d1Databases: {
        DB: 'test-db',
      },
      d1Persist: true, // Persist the database to the file system
    });

    // Get the D1 database instance from Miniflare
    const d1 = await mf.getD1Database('DB');
    
    // Initialize Drizzle with the D1 binding
    db = drizzle(d1, { schema });
    
    // Create basic schema for testing
    console.log('Creating database schema for testing...');
    await createBasicSchema();
    
    console.log('Miniflare and D1 database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Miniflare for D1 testing:', error);
    throw error;
  }
}, 60000);

beforeEach(async () => {
  // Manually clear all tables before each test to ensure a clean state
  console.log('Clearing database tables before test...');
  try {
    // Order matters for foreign key constraints. Delete from child tables first.
    await db.delete(schema.invitationUsage);
    await db.delete(schema.positions);
    await db.delete(schema.tradingStrategies);
    await db.delete(schema.userUsernameHistory);
    await db.delete(schema.invitationCodes);
    await db.delete(schema.opportunities);
    await db.delete(schema.users); // Delete from parent table last
    console.log('All tables cleared successfully.');
  } catch (error) {
    console.error('Failed to clear tables:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('Disposing Miniflare instance...');
  await mf.dispose();
  console.log('Miniflare disposed. D1 database testing cleanup complete');
});

/**
 * Create basic database schema for testing when migrations are not available
 */
async function createBasicSchema(): Promise<void> {
  console.log('Creating basic database schema for testing...');
  
  try {
    // Create the essential tables needed for testing
    const createTableStatements = [
      // Users table (core table) - matches Drizzle schema exactly
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        telegram_id TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        language_code TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        last_active_at INTEGER,
        settings TEXT DEFAULT '{}',
        api_limits TEXT DEFAULT '{}',
        account_balance TEXT DEFAULT '0.00',
        beta_expires_at INTEGER,
        trading_preferences TEXT DEFAULT '{}'
      )`,
      
      // User username history table - matches Drizzle schema
      `CREATE TABLE IF NOT EXISTS user_username_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        telegram_id TEXT NOT NULL,
        username TEXT NOT NULL,
        changed_at INTEGER NOT NULL DEFAULT (unixepoch()),
        change_source TEXT NOT NULL DEFAULT 'manual_correction',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Positions table - matches Drizzle schema exactly
      `CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        strategy TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        quantity REAL NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        stop_loss REAL,
        take_profit REAL,
        leverage INTEGER DEFAULT 1,
        fees REAL DEFAULT 0,
        pnl REAL DEFAULT 0,
        exchange_id TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        closed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Opportunities table - matches Drizzle schema exactly
      `CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        exchange_1 TEXT,
        exchange_2 TEXT,
        price_1 REAL,
        price_2 REAL,
        profit_percentage REAL NOT NULL,
        confidence REAL NOT NULL,
        expires_at INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      
      // Trading strategies table - matches Drizzle schema exactly
      `CREATE TABLE IF NOT EXISTS trading_strategies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        settings TEXT DEFAULT '{}',
        performance TEXT DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Invitation codes table
      `CREATE TABLE IF NOT EXISTS invitation_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        created_by TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        expires_at INTEGER,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        purpose TEXT NOT NULL DEFAULT 'general',
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
      
      // Invitation usage table
      `CREATE TABLE IF NOT EXISTS invitation_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invitation_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        used_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (invitation_id) REFERENCES invitation_codes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // User sessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_data TEXT DEFAULT '{}',
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];
    
    // Execute each CREATE TABLE statement using the raw D1 client
    for (const statement of createTableStatements) {
      // Clean up the statement by removing extra whitespace and line breaks
      const cleanStatement = statement.replace(/\s+/g, ' ').trim();
      console.log(`Executing SQL: ${cleanStatement.substring(0, 50)}...`);
      await db.$client.exec(cleanStatement);
    }
    
    console.log('Basic database schema created successfully');
  } catch (error) {
    console.error('Failed to create basic database schema:', error);
    throw error;
  }
}

/**
 * Helper to execute raw SQL queries for testing
 */
export async function executeRawSQL(sql: string, params: any[] = []): Promise<any> {
  if (!db) {
    throw new Error('D1 database not available');
  }
  // Access the underlying D1Database instance to use prepared statements
  const statement = db.$client.prepare(sql);
  return await statement.bind(...params).all();
}

/**
 * Helper to check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await executeRawSQL(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    // D1 `all()` returns `results`, not `rows`
    return result.results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Helper to get table row count
 */
export async function getTableRowCount(tableName: string): Promise<number> {
  const result = await executeRawSQL(`SELECT COUNT(*) as count FROM ${tableName}`);
  return result.rows[0]?.count || 0;
}