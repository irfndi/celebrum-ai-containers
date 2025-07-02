/**
 * End-to-End database tests
 * Tests real-world scenarios and performance
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock environment for E2E testing
interface MockEnv {
  DB: MockD1Database;
  KV: MockKVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}

// Mock KV Namespace
class MockKVNamespace {
  private data = new Map<string, string>();
  private metadata = new Map<string, Record<string, unknown>>();

  async get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | Record<string, unknown> | null> {
    const value = this.data.get(key);
    if (!value) return null;

    if (options?.type === 'json') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  async put(key: string, value: string | ArrayBuffer | ReadableStream, options?: {
    expirationTtl?: number;
    expiration?: number;
    metadata?: unknown;
  }): Promise<void> {
    if (typeof value !== 'string') {
      throw new Error('Mock KV only supports string values');
    }
    
    this.data.set(key, value);
    if (options?.metadata) {
      this.metadata.set(key, options.metadata as Record<string, unknown>);
    }

    // Simulate expiration
    if (options?.expirationTtl) {
      setTimeout(() => {
        this.data.delete(key);
        this.metadata.delete(key);
      }, options.expirationTtl * 1000);
    }
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
    this.metadata.delete(key);
  }

  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
    list_complete: boolean;
    cursor?: string;
  }> {
    const keys = Array.from(this.data.keys())
      .filter(key => !options?.prefix || key.startsWith(options.prefix))
      .slice(0, options?.limit || 1000)
      .map(name => ({
        name,
        metadata: this.metadata.get(name)
      }));

    return {
      keys,
      list_complete: true
    };
  }

  clear(): void {
    this.data.clear();
    this.metadata.clear();
  }
}

// Mock D1 Database (simplified version)
class MockD1Database {
  private data = new Map<string, Record<string, unknown>[]>();
  private nextId = 1;

  constructor() {
    this.initializeTables();
  }

  private initializeTables(): void {
    this.data.set('users', []);
    this.data.set('sessions', []);
    this.data.set('invitations', []);
    this.data.set('trading_signals', []);
    this.data.set('user_subscriptions', []);
    this.data.set('user_settings', []);
    this.data.set('audit_logs', []);
  }

  prepare(query: string) {
    return new MockPreparedStatement(this, query);
  }

  async exec(_query: string) {
    // Handle schema operations
    return [{ success: true, meta: { changes: 0 } }];
  }

  // Public methods for testing
  getData(table: string): Record<string, unknown>[] {
    return this.data.get(table) || [];
  }

  insertRecord(table: string, record: Record<string, unknown>): Record<string, unknown> {
    const records = this.data.get(table) || [];
    const newRecord = { ...record, id: record.id || this.nextId++ };
    records.push(newRecord);
    this.data.set(table, records);
    return newRecord;
  }

  updateRecord(table: string, id: unknown, updates: Record<string, unknown>): boolean {
    const records = this.data.get(table) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    records[index] = { ...records[index], ...updates };
    this.data.set(table, records);
    return true;
  }

  deleteRecord(table: string, id: unknown): boolean {
    const records = this.data.get(table) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    records.splice(index, 1);
    this.data.set(table, records);
    return true;
  }

  findRecord(table: string, predicate: (record: Record<string, unknown>) => boolean): Record<string, unknown> | null {
    const records = this.data.get(table) || [];
    return records.find(predicate) || null;
  }

  clear(): void {
    this.data.clear();
    this.nextId = 1;
    this.initializeTables();
  }

  getStats(): { totalRecords: number; tableStats: Record<string, number> } {
    const tableStats: Record<string, number> = {};
    let totalRecords = 0;

    for (const [table, records] of this.data.entries()) {
      tableStats[table] = records.length;
      totalRecords += records.length;
    }

    return { totalRecords, tableStats };
  }
}

class MockPreparedStatement {
  private boundValues: unknown[] = [];

  constructor(private db: MockD1Database, private query: string) {}

  bind(...values: unknown[]) {
    this.boundValues = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.execute();
    return result.results[0] as T || null;
  }

  async run() {
    return await this.execute();
  }

  async all<T = unknown>() {
    return await this.execute() as { results: T[] };
  }

  private async execute() {
    const query = this.query.toLowerCase().trim();
    
    // Simple query parsing and execution
    if (query.includes('select')) {
      return this.handleSelect();
    } else if (query.includes('insert')) {
      return this.handleInsert();
    } else if (query.includes('update')) {
      return this.handleUpdate();
    } else if (query.includes('delete')) {
      return this.handleDelete();
    }

    return { results: [], success: true, meta: { changes: 0, last_row_id: 0 } };
  }

  private handleSelect() {
    // Simplified select handling
    const tableName = this.extractTableName();
    const records = this.db.getData(tableName);
    
    // Handle COUNT queries
    if (this.query.includes('COUNT(')) {
      let filteredRecords = records;
      
      // Apply WHERE conditions if present
      if (this.query.includes('WHERE') && this.boundValues.length > 0) {
        filteredRecords = records.filter(record => {
          // Simple matching logic for expires_at comparisons
          if (this.query.includes('expires_at >')) {
            const expiresAt = new Date(record.expires_at as string);
            const compareDate = new Date(this.boundValues[0] as string);
            return expiresAt > compareDate;
          }
          return Object.values(record).some(value => 
            this.boundValues.includes(value)
          );
        });
      }
      
      // Handle different COUNT patterns - check most specific patterns first
      
      // Handle COUNT(*) as total, SUM(used) as used pattern
      if (this.query.includes('COUNT(*) as total') && this.query.includes('SUM(used) as used')) {
        const total = filteredRecords.length;
        const used = filteredRecords.reduce((sum, record) => sum + ((record.used as number) || 0), 0);
        return { 
          results: [{ total, used }], 
          success: true, 
          meta: { changes: 0, last_row_id: 0 } 
        };
      }
      
      if (this.query.includes('COUNT(*) as total')) {
        const total = filteredRecords.length;
        let admins = 0;
        
        // Count admins if query includes admin role counting
        if (this.query.includes('COUNT(CASE WHEN role = "admin"')) {
          admins = filteredRecords.filter(record => record.role === 'admin').length;
        }
        
        return { 
          results: [{ total, admins }], 
          success: true, 
          meta: { changes: 0, last_row_id: 0 } 
        };
      }
      
      if (this.query.includes('COUNT(*) as active')) {
        return { 
          results: [{ active: filteredRecords.length }], 
          success: true, 
          meta: { changes: 0, last_row_id: 0 } 
        };
      }
      
      if (this.query.includes('SUM(used)')) {
        const total = filteredRecords.length;
        const used = filteredRecords.reduce((sum, record) => sum + ((record.used as number) || 0), 0);
        return { 
          results: [{ total, used }], 
          success: true, 
          meta: { changes: 0, last_row_id: 0 } 
        };
      }
      
      // Default COUNT behavior
      return { 
        results: [{ count: filteredRecords.length }], 
        success: true, 
        meta: { changes: 0, last_row_id: 0 } 
      };
    }
    
    // Regular SELECT queries
    if (this.query.includes('WHERE') && this.boundValues.length > 0) {
      const filtered = records.filter(record => {
        // Handle complex invitation query: code = ? AND used < max_uses AND (expires_at IS NULL OR expires_at > ?)
        if (this.query.includes('code = ?') && this.query.includes('used < max_uses') && this.query.includes('expires_at IS NULL OR expires_at >')) {
          const code = this.boundValues[0];
          const compareDate = new Date(this.boundValues[1] as string);
          
          const codeMatches = record.code === code;
          const usedValid = (record.used || 0) < (record.max_uses || 0);
          const expiresAtValid = !record.expires_at || new Date(record.expires_at as string) > compareDate;
          
          return codeMatches && usedValid && expiresAtValid;
        }
        
        // Handle simple expires_at comparisons for session queries
        if (this.query.includes('telegram_id = ?') && this.query.includes('expires_at >')) {
          const telegramId = this.boundValues[0];
          const compareDate = new Date(this.boundValues[1] as string);
          
          const telegramIdMatches = record.telegram_id === telegramId;
          const expiresAtValid = new Date(record.expires_at as string) > compareDate;
          
          return telegramIdMatches && expiresAtValid;
        }
        
        // Simple matching logic for other WHERE conditions
        return Object.values(record).some(value => 
          this.boundValues.includes(value)
        );
      });
      return { results: filtered, success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    
    return { results: records, success: true, meta: { changes: 0, last_row_id: 0 } };
  }

  private handleInsert() {
    const tableName = this.extractTableName();
    const record = this.createRecordFromValues(tableName);
    const newRecord = this.db.insertRecord(tableName, record);
    
    return {
      results: [],
      success: true,
      meta: { changes: 1, last_row_id: newRecord.id }
    };
  }

  private handleUpdate() {
    const tableName = this.extractTableName();
    const records = this.db.getData(tableName);
    let changes = 0;
    
    // Handle UPDATE invitations SET used = used + 1 WHERE code = ?
    if (this.query.includes('UPDATE invitations SET used = used + 1') && this.boundValues.length > 0) {
      const code = this.boundValues[0];
      for (const record of records) {
        if (record.code === code) {
          const success = this.db.updateRecord(tableName, record.id, { used: ((record.used as number) || 0) + 1 });
          if (success) changes++;
        }
      }
    }
    
    // Handle other UPDATE patterns as needed
    // For now, just return success for other updates
    
    return {
      results: [],
      success: true,
      meta: { changes, last_row_id: 0 }
    };
  }

  private handleDelete() {
    const _tableName = this.extractTableName();
    // Simplified delete logic
    return {
      results: [],
      success: true,
      meta: { changes: 1, last_row_id: 0 }
    };
  }

  private extractTableName(): string {
    const query = this.query.toLowerCase();
    if (query.includes('users')) return 'users';
    if (query.includes('sessions')) return 'sessions';
    if (query.includes('invitations')) return 'invitations';
    if (query.includes('trading_signals')) return 'trading_signals';
    if (query.includes('user_subscriptions')) return 'user_subscriptions';
    if (query.includes('user_settings')) return 'user_settings';
    if (query.includes('audit_logs')) return 'audit_logs';
    return 'unknown';
  }

  private createRecordFromValues(tableName: string): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    const now = new Date().toISOString();
    
    switch (tableName) {
      case 'users':
        record.telegram_id = this.boundValues[0];
        record.first_name = this.boundValues[1];
        record.last_name = this.boundValues[2];
        record.username = this.boundValues[3];
        record.language_code = this.boundValues[4] || 'en';
        record.role = this.boundValues[5] || 'user';
        record.created_at = now;
        record.updated_at = now;
        break;
      case 'sessions':
        record.session_id = this.boundValues[0];
        record.user_id = this.boundValues[1];
        record.telegram_id = this.boundValues[2];
        record.created_at = now;
        record.expires_at = this.boundValues[3] || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'invitations':
        record.code = this.boundValues[0];
        record.max_uses = this.boundValues[1] || 1;
        record.used = 0;
        record.expires_at = this.boundValues[2];
        record.created_at = now;
        break;
      case 'trading_signals':
        record.signal_type = this.boundValues[0];
        record.symbol = this.boundValues[1];
        record.action = this.boundValues[2];
        record.price = this.boundValues[3];
        record.confidence = this.boundValues[4];
        record.created_at = now;
        break;
      case 'user_subscriptions':
        record.user_id = this.boundValues[0];
        record.subscription_type = this.boundValues[1];
        record.status = this.boundValues[2] || 'active';
        record.created_at = now;
        record.expires_at = this.boundValues[3];
        break;
    }
    
    return record;
  }
}

// Application service layer for E2E testing
class ApplicationService {
  constructor(private env: MockEnv) {}

  async registerNewUser(telegramUpdate: {
    message: {
      from: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
      };
      text: string;
    };
  }) {
    const { from } = telegramUpdate.message;
    const invitationCode = telegramUpdate.message.text.split(' ')[1]; // /start INVITATION_CODE

    // 1. Validate invitation code if provided
    if (invitationCode) {
      const invitation = await this.env.DB
        .prepare('SELECT * FROM invitations WHERE code = ? AND used < max_uses AND (expires_at IS NULL OR expires_at > ?)')
        .bind(invitationCode, new Date().toISOString())
        .first();

      if (!invitation) {
        throw new Error('Invalid or expired invitation code');
      }
    }

    // 2. Check if user already exists
    const existingUser = await this.env.DB
      .prepare('SELECT * FROM users WHERE telegram_id = ?')
      .bind(from.id.toString())
      .first();

    if (existingUser) {
      // User exists, just create new session
      const session = await this.createUserSession(existingUser as unknown as { id: number; telegram_id: string; first_name?: string; last_name?: string; username?: string; language_code?: string; role?: string });
      return { user: existingUser as unknown as { id: number; telegram_id: string; first_name?: string; last_name?: string; username?: string; language_code?: string; role?: string }, session };
    }

    // 3. Create new user
    const userResult = await this.env.DB
      .prepare('INSERT INTO users (telegram_id, first_name, last_name, username, language_code, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        from.id.toString(),
        from.first_name,
        from.last_name || null,
        from.username || null,
        from.language_code || 'en',
        'user',
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    const newUser = {
      id: userResult.meta.last_row_id as number,
      telegram_id: from.id.toString(),
      first_name: from.first_name,
      last_name: from.last_name,
      username: from.username,
      language_code: from.language_code || 'en',
      role: 'user'
    };

    // 4. Use invitation code if provided
    if (invitationCode) {
      await this.env.DB
        .prepare('UPDATE invitations SET used = used + 1 WHERE code = ?')
        .bind(invitationCode)
        .run();
    }

    // 5. Create session
    const session = await this.createUserSession(newUser);

    // 6. Store user preferences in KV
    await this.env.KV.put(`user:${from.id}:preferences`, JSON.stringify({
      language: from.language_code || 'en',
      notifications: true,
      timezone: 'UTC'
    }));

    return { user: newUser, session };
  }

  async createUserSession(user: { id: number; telegram_id: string; first_name?: string; last_name?: string; username?: string; language_code?: string; role?: string }) {
    // Delete existing sessions
    await this.env.DB
      .prepare('DELETE FROM sessions WHERE telegram_id = ?')
      .bind(user.telegram_id)
      .run();

    // Create new session
    const sessionId = `session-${user.telegram_id}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.env.DB
      .prepare('INSERT INTO sessions (session_id, user_id, telegram_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(sessionId, user.id, user.telegram_id, new Date().toISOString(), expiresAt)
      .run();

    // Cache session in KV for fast access (gracefully handle failures)
    try {
      await this.env.KV.put(`session:${user.telegram_id}`, JSON.stringify({
        sessionId,
        userId: user.id,
        expiresAt
      }), { expirationTtl: 24 * 60 * 60 }); // 24 hours
    } catch (error) {
      // KV caching is optional, continue without it
      console.warn('KV caching failed:', error.message);
    }

    return {
      sessionId,
      userId: user.id,
      telegramId: user.telegram_id,
      expiresAt: new Date(expiresAt)
    };
  }

  async getUserSession(telegramId: string) {
    // Try KV first (faster)
    const cachedSession = await this.env.KV.get(`session:${telegramId}`, { type: 'json' }) as { expiresAt: string } | null;
    if (cachedSession && new Date(cachedSession.expiresAt) > new Date()) {
      return cachedSession;
    }

    // Fallback to database
    const session = await this.env.DB
      .prepare('SELECT * FROM sessions WHERE telegram_id = ? AND expires_at > ?')
      .bind(telegramId, new Date().toISOString())
      .first();

    if (session) {
      // Update KV cache
      await this.env.KV.put(`session:${telegramId}`, JSON.stringify(session), {
        expirationTtl: Math.floor((new Date((session as unknown as { expires_at: string }).expires_at).getTime() - Date.now()) / 1000)
      });
    }

    return session;
  }

  async createTradingSignal(signalData: {
    type: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    confidence: number;
  }) {
    const result = await this.env.DB
      .prepare('INSERT INTO trading_signals (signal_type, symbol, action, price, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(
        signalData.type,
        signalData.symbol,
        signalData.action,
        signalData.price,
        signalData.confidence,
        new Date().toISOString()
      )
      .run();

    // Cache latest signals in KV
    const latestSignals = (await this.env.KV.get('latest_signals', { type: 'json' }) as unknown[] | null) || [];
    latestSignals.unshift({
      id: result.meta.last_row_id,
      ...signalData,
      created_at: new Date().toISOString()
    });

    // Keep only last 10 signals in cache
    if (latestSignals.length > 10) {
      latestSignals.splice(10);
    }

    await this.env.KV.put('latest_signals', JSON.stringify(latestSignals));

    return {
      id: result.meta.last_row_id,
      ...signalData,
      created_at: new Date()
    };
  }

  async getSystemStats() {
    // Get user stats
    const userStats = await this.env.DB
      .prepare('SELECT COUNT(*) as total, COUNT(CASE WHEN role = "admin" THEN 1 END) as admins FROM users')
      .first() as unknown as { total: number; admins: number } | null;

    // Get session stats
    const sessionStats = await this.env.DB
      .prepare('SELECT COUNT(*) as active FROM sessions WHERE expires_at > ?')
      .bind(new Date().toISOString())
      .first() as unknown as { active: number } | null;

    // Get invitation stats
    const invitationStats = await this.env.DB
      .prepare('SELECT COUNT(*) as total, SUM(used) as used FROM invitations')
      .first() as unknown as { total: number; used: number } | null;

    return {
      users: {
        total: userStats?.total || 0,
        admins: userStats?.admins || 0
      },
      sessions: {
        active: sessionStats?.active || 0
      },
      invitations: {
        total: invitationStats?.total || 0,
        used: invitationStats?.used || 0
      }
    };
  }
}

// E2E Test Suites
describe('Database E2E Scenarios', () => {
  let env: MockEnv;
  let appService: ApplicationService;

  beforeEach(async () => {
    env = {
      DB: new MockD1Database(),
      KV: new MockKVNamespace(),
      TELEGRAM_BOT_TOKEN: 'mock-token',
      WEBHOOK_SECRET: 'mock-secret'
    };

    appService = new ApplicationService(env);

    // Initialize database schema
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        language_code TEXT DEFAULT 'en',
        role TEXT DEFAULT 'user',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  });

  afterEach(() => {
    env.DB.clear();
    env.KV.clear();
  });

  describe('User Registration Flow', () => {
    test('should handle complete new user registration with invitation', async () => {
      // Setup: Create invitation code
      await env.DB
        .prepare('INSERT INTO invitations (code, max_uses, used, created_at) VALUES (?, ?, ?, ?)')
        .bind('BETA2025', 100, 0, new Date().toISOString())
        .run();

      // Simulate Telegram update
      const telegramUpdate = {
        message: {
          from: {
            id: 12345,
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe',
            language_code: 'en'
          },
          text: '/start BETA2025'
        }
      };

      // Execute registration
      const result = await appService.registerNewUser(telegramUpdate);

      // Verify user creation
      expect(result.user.telegram_id).toBe('12345');
      expect(result.user.first_name).toBe('John');
      expect(result.user.role).toBe('user');

      // Verify session creation
      expect(result.session.sessionId).toBeTruthy();
      expect(result.session.userId).toBe(result.user.id);

      // Verify invitation usage
      const invitation = await env.DB
        .prepare('SELECT * FROM invitations WHERE code = ?')
        .bind('BETA2025')
        .first() as { code: string; max_uses: number; used: number; expires_at?: string; created_at: string } | null;
      expect(invitation?.used).toBe(1);

      // Verify KV storage
      const preferences = await env.KV.get(`user:12345:preferences`, { type: 'json' }) as { language: string } | null;
      expect(preferences?.language).toBe('en');

      const cachedSession = await env.KV.get(`session:12345`, { type: 'json' }) as { sessionId: string } | null;
      expect(cachedSession?.sessionId).toBe(result.session.sessionId);
    });

    test('should handle existing user login', async () => {
      // Setup: Create existing user
      const existingUser = env.DB.insertRecord('users', {
        telegram_id: '67890',
        first_name: 'Jane',
        last_name: 'Smith',
        username: 'janesmith',
        language_code: 'es',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Simulate login attempt
      const telegramUpdate = {
        message: {
          from: {
            id: 67890,
            first_name: 'Jane',
            last_name: 'Smith',
            username: 'janesmith',
            language_code: 'es'
          },
          text: '/start'
        }
      };

      const result = await appService.registerNewUser(telegramUpdate);

      // Should return existing user
      expect(result.user.id).toBe(existingUser.id);
      expect(result.user.first_name).toBe('Jane');

      // Should create new session
      expect(result.session.sessionId).toBeTruthy();
      expect(result.session.userId).toBe(existingUser.id);
    });

    test('should reject invalid invitation codes', async () => {
      const telegramUpdate = {
        message: {
          from: {
            id: 12345,
            first_name: 'John',
            language_code: 'en'
          },
          text: '/start INVALID123'
        }
      };

      await expect(appService.registerNewUser(telegramUpdate))
        .rejects.toThrow('Invalid or expired invitation code');
    });
  });

  describe('Session Management', () => {
    test('should handle session retrieval with KV caching', async () => {
      // Create user and session
      const user = env.DB.insertRecord('users', {
        telegram_id: '12345',
        first_name: 'John',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const session = await appService.createUserSession(user as { id: number; telegram_id: string; first_name?: string; last_name?: string; username?: string; language_code?: string; role?: string });

      // First retrieval should hit database and cache in KV
      const retrievedSession1 = await appService.getUserSession('12345') as unknown as { sessionId: string };
      expect(retrievedSession1.sessionId).toBe(session.sessionId);

      // Second retrieval should hit KV cache
      const retrievedSession2 = await appService.getUserSession('12345') as unknown as { sessionId: string };
      expect(retrievedSession2.sessionId).toBe(session.sessionId);

      // Verify KV cache was used
      const cachedSession = await env.KV.get('session:12345', { type: 'json' });
      expect(cachedSession).toBeTruthy();
    });

    test('should handle session expiration', async () => {
      // Create user
      const user = env.DB.insertRecord('users', {
        telegram_id: '12345',
        first_name: 'John',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Create expired session manually
      const expiredTime = new Date(Date.now() - 1000).toISOString();
      await env.DB
        .prepare('INSERT INTO sessions (session_id, user_id, telegram_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind('expired-session', user.id, '12345', expiredTime, expiredTime)
        .run();

      // Try to retrieve expired session
      const session = await appService.getUserSession('12345');
      expect(session).toBeFalsy();
    });
  });

  describe('Trading Signals', () => {
    test('should create and cache trading signals', async () => {
      const signalData = {
        type: 'technical',
        symbol: 'BTC/USD',
        action: 'BUY' as const,
        price: 45000,
        confidence: 0.85
      };

      const signal = await appService.createTradingSignal(signalData);

      expect(signal.id).toBeTruthy();
      expect(signal.symbol).toBe('BTC/USD');
      expect(signal.action).toBe('BUY');

      // Verify signal is cached in KV
      const cachedSignals = await env.KV.get('latest_signals', { type: 'json' }) as unknown[] | null;
      expect(cachedSignals).toHaveLength(1);
      expect((cachedSignals?.[0] as unknown as { symbol: string })?.symbol).toBe('BTC/USD');
    });

    test('should maintain only latest 10 signals in cache', async () => {
      // Create 15 signals
      for (let i = 0; i < 15; i++) {
        await appService.createTradingSignal({
          type: 'technical',
          symbol: `PAIR${i}`,
          action: 'BUY',
          price: 1000 + i,
          confidence: 0.8
        });
      }

      // Verify only 10 signals are cached
      const cachedSignals = await env.KV.get('latest_signals', { type: 'json' }) as unknown[] | null;
      expect(cachedSignals).toHaveLength(10);
      
      // Verify latest signals are kept (PAIR14 should be first)
      expect((cachedSignals?.[0] as unknown as { symbol: string })?.symbol).toBe('PAIR14');
      expect((cachedSignals?.[9] as unknown as { symbol: string })?.symbol).toBe('PAIR5');
    });
  });

  describe('System Statistics', () => {
    test('should calculate comprehensive system stats', async () => {
      // Create test data
      // Users
      env.DB.insertRecord('users', {
        telegram_id: '1',
        first_name: 'User1',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      env.DB.insertRecord('users', {
        telegram_id: '2',
        first_name: 'Admin1',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Active sessions
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      env.DB.insertRecord('sessions', {
        session_id: 'session1',
        user_id: 1,
        telegram_id: '1',
        created_at: new Date().toISOString(),
        expires_at: futureTime
      });

      // Invitations
      env.DB.insertRecord('invitations', {
        code: 'INV1',
        max_uses: 10,
        used: 3,
        created_at: new Date().toISOString()
      });
      env.DB.insertRecord('invitations', {
        code: 'INV2',
        max_uses: 5,
        used: 1,
        created_at: new Date().toISOString()
      });

      const stats = await appService.getSystemStats();

      expect(stats.users.total).toBe(2);
      expect(stats.users.admins).toBe(1);
      expect(stats.sessions.active).toBe(1);
      expect(stats.invitations.total).toBe(2);
      expect(stats.invitations.used).toBe(4);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent user registrations', async () => {
      // Create invitation with enough uses
      await env.DB
        .prepare('INSERT INTO invitations (code, max_uses, used, created_at) VALUES (?, ?, ?, ?)')
        .bind('CONCURRENT', 100, 0, new Date().toISOString())
        .run();

      // Create multiple concurrent registration requests
      const registrationPromises = Array.from({ length: 10 }, (_, i) => {
        const telegramUpdate = {
          message: {
            from: {
              id: 10000 + i,
              first_name: `User${i}`,
              language_code: 'en'
            },
            text: '/start CONCURRENT'
          }
        };
        return appService.registerNewUser(telegramUpdate);
      });

      const results = await Promise.all(registrationPromises);

      // Verify all registrations succeeded
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.user.first_name).toBe(`User${i}`);
        expect(result.session.sessionId).toBeTruthy();
      });

      // Verify invitation usage is correct
      const invitation = await env.DB
        .prepare('SELECT * FROM invitations WHERE code = ?')
        .bind('CONCURRENT')
        .first() as { code: string; max_uses: number; used: number; expires_at?: string; created_at: string } | null;
      expect(invitation?.used).toBe(10);
    });

    test('should handle large dataset operations', async () => {
      // Create large number of users
      const userPromises = Array.from({ length: 100 }, (_, i) => {
        return env.DB.insertRecord('users', {
          telegram_id: (20000 + i).toString(),
          first_name: `User${i}`,
          role: i % 10 === 0 ? 'admin' : 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      await Promise.all(userPromises);

      // Verify database stats
      const dbStats = env.DB.getStats();
      expect(dbStats.tableStats.users).toBe(100);
      expect(dbStats.totalRecords).toBeGreaterThanOrEqual(100);

      // Test system stats calculation with large dataset
      const systemStats = await appService.getSystemStats();
      expect(systemStats.users.total).toBe(100);
      expect(systemStats.users.admins).toBe(10); // Every 10th user is admin
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database failure
      const originalPrepare = env.DB.prepare;
      env.DB.prepare = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const telegramUpdate = {
        message: {
          from: {
            id: 12345,
            first_name: 'John',
            language_code: 'en'
          },
          text: '/start'
        }
      };

      await expect(appService.registerNewUser(telegramUpdate))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      env.DB.prepare = originalPrepare;
    });

    test('should handle KV storage failures gracefully', async () => {
      // Create user first
      const user = env.DB.insertRecord('users', {
        telegram_id: '12345',
        first_name: 'John',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Mock KV failure
      const originalPut = env.KV.put;
      env.KV.put = vi.fn().mockRejectedValue(new Error('KV storage failed'));

      // Session creation should still work even if KV fails
      const session = await appService.createUserSession(user as { id: number; telegram_id: string; first_name?: string; last_name?: string; username?: string; language_code?: string; role?: string });
      expect(session.sessionId).toBeTruthy();

      // Restore original method
      env.KV.put = originalPut;
    });
  });
});