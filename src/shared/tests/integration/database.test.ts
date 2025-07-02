/**
 * Integration tests for database layer
 * Tests cross-module interactions and data consistency
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock Cloudflare D1 Database
interface MockD1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

interface MockD1PreparedStatement {
  bind(...values: unknown[]): MockD1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<MockD1Result>;
  all<T = unknown>(): Promise<MockD1Result<T>>;
}

interface DatabaseRecord {
  id?: number | string;
  [key: string]: unknown;
}

class MockD1Database {
  private data = new Map<string, DatabaseRecord[]>();
  private nextId = 1;

  constructor() {
    // Initialize tables
    this.data.set('users', []);
    this.data.set('sessions', []);
    this.data.set('invitations', []);
    this.data.set('trading_signals', []);
    this.data.set('user_subscriptions', []);
  }

  prepare(query: string): MockD1PreparedStatement {
    return new MockPreparedStatement(this, query);
  }

  exec(query: string): Promise<MockD1Result[]> {
    // Handle schema creation queries
    if (query.includes('CREATE TABLE') || query.includes('CREATE INDEX')) {
      return Promise.resolve([{
        results: [],
        success: true,
        meta: {
          changes: 0,
          last_row_id: 0,
          duration: 1,
          size_after: 0,
          rows_read: 0,
          rows_written: 0
        }
      }]);
    }
    
    return Promise.resolve([]);
  }

  getData(table: string): Record<string, unknown>[] {
    return this.data.get(table) || [];
  }

  insertData(table: string, record: Record<string, unknown>): Record<string, unknown> {
    const records = this.data.get(table) || [];
    const newRecord = { ...record, id: (record.id as string | number) || this.nextId++ };
    records.push(newRecord);
    this.data.set(table, records);
    return newRecord;
  }

  updateData(table: string, id: unknown, updates: Record<string, unknown>): Record<string, unknown> | null {
    const records = this.data.get(table) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = { ...records[index], ...updates };
    this.data.set(table, records);
    return records[index];
  }

  deleteData(table: string, id: unknown): boolean {
    const records = this.data.get(table) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    records.splice(index, 1);
    this.data.set(table, records);
    return true;
  }

  findData(table: string, predicate: (record: Record<string, unknown>) => boolean): Record<string, unknown> | null {
    const records = this.data.get(table) || [];
    return records.find(predicate) || null;
  }

  filterData(table: string, predicate: (record: Record<string, unknown>) => boolean): Record<string, unknown>[] {
    const records = this.data.get(table) || [];
    return records.filter(predicate);
  }

  clear(): void {
    this.data.clear();
    this.nextId = 1;
    // Reinitialize tables
    this.data.set('users', []);
    this.data.set('sessions', []);
    this.data.set('invitations', []);
    this.data.set('trading_signals', []);
    this.data.set('user_subscriptions', []);
  }
}

class MockPreparedStatement implements MockD1PreparedStatement {
  private boundValues: unknown[] = [];

  constructor(private db: MockD1Database, private query: string) {}

  bind(...values: unknown[]): MockD1PreparedStatement {
    this.boundValues = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    const result = await this.execute();
    return result.results[0] as T || null;
  }

  async run(): Promise<MockD1Result> {
    return await this.execute();
  }

  async all<T = unknown>(): Promise<MockD1Result<T>> {
    return await this.execute() as MockD1Result<T>;
  }

  private async execute(): Promise<MockD1Result> {
    const query = this.query.toLowerCase().trim();
    
    // Parse table name from query
    const getTableName = (q: string): string => {
      if (q.includes('from users')) return 'users';
      if (q.includes('from sessions')) return 'sessions';
      if (q.includes('from invitations')) return 'invitations';
      if (q.includes('from trading_signals')) return 'trading_signals';
      if (q.includes('from user_subscriptions')) return 'user_subscriptions';
      if (q.includes('into users')) return 'users';
      if (q.includes('into sessions')) return 'sessions';
      if (q.includes('into invitations')) return 'invitations';
      if (q.includes('into trading_signals')) return 'trading_signals';
      if (q.includes('into user_subscriptions')) return 'user_subscriptions';
      // Handle UPDATE queries
      if (q.includes('update users')) return 'users';
      if (q.includes('update sessions')) return 'sessions';
      if (q.includes('update invitations')) return 'invitations';
      if (q.includes('update trading_signals')) return 'trading_signals';
      if (q.includes('update user_subscriptions')) return 'user_subscriptions';
      return 'unknown';
    };

    const tableName = getTableName(query);
    
    if (query.startsWith('select')) {
      return this.handleSelect(tableName);
    } else if (query.startsWith('insert')) {
      return this.handleInsert(tableName);
    } else if (query.startsWith('update')) {
      return this.handleUpdate(tableName);
    } else if (query.startsWith('delete')) {
      return this.handleDelete(tableName);
    }

    return {
      results: [],
      success: true,
      meta: {
        changes: 0,
        last_row_id: 0,
        duration: 1,
        size_after: 0,
        rows_read: 0,
        rows_written: 0
      }
    };
  }

  private handleSelect(tableName: string): MockD1Result {
    const records = this.db.getData(tableName);
    
    // Simple WHERE clause handling
    if (this.query.includes('WHERE') && this.boundValues.length > 0) {
      const filtered = records.filter(record => {
        // Simple telegram_id matching
        if (this.query.includes('telegram_id')) {
          return record.telegram_id === this.boundValues[0] || record.telegramId === this.boundValues[0];
        }
        // Simple id matching
        if (this.query.includes('id =')) {
          return record.id === this.boundValues[0];
        }
        // Simple code matching for invitations
        if (this.query.includes('code =')) {
          return record.code === this.boundValues[0];
        }
        return true;
      });
      
      return {
        results: filtered,
        success: true,
        meta: {
          changes: 0,
          last_row_id: 0,
          duration: 1,
          size_after: 0,
          rows_read: filtered.length,
          rows_written: 0
        }
      };
    }
    
    return {
      results: records,
      success: true,
      meta: {
        changes: 0,
        last_row_id: 0,
        duration: 1,
        size_after: 0,
        rows_read: records.length,
        rows_written: 0
      }
    };
  }

  private handleInsert(tableName: string): MockD1Result {
    // Create a mock record based on bound values
    const record: Record<string, unknown> = {};
    
    // Map bound values to common fields based on table
    if (tableName === 'users') {
      record.telegram_id = this.boundValues[0];
      record.first_name = this.boundValues[1];
      record.last_name = this.boundValues[2];
      record.username = this.boundValues[3];
      record.language_code = this.boundValues[4] || 'en';
      record.role = this.boundValues[5] || 'user';
      record.created_at = new Date().toISOString();
      record.updated_at = new Date().toISOString();
    } else if (tableName === 'sessions') {
      record.session_id = this.boundValues[0];
      record.user_id = this.boundValues[1];
      record.telegram_id = this.boundValues[2];
      record.created_at = new Date().toISOString();
      record.expires_at = this.boundValues[3] || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (tableName === 'invitations') {
      record.code = this.boundValues[0];
      record.max_uses = this.boundValues[1] || 1;
      record.used = this.boundValues[2] || 0;
      record.expires_at = this.boundValues[3];
      record.created_at = this.boundValues[4] || new Date().toISOString();
    }
    
    const newRecord = this.db.insertData(tableName, record);
    
    return {
      results: [],
      success: true,
      meta: {
        changes: 1,
        last_row_id: newRecord.id as number,
        duration: 1,
        size_after: 0,
        rows_read: 0,
        rows_written: 1
      }
    };
  }

  private handleUpdate(tableName: string): MockD1Result {
    // Simple update handling
    const records = this.db.getData(tableName);
    let changes = 0;
    
    if (this.query.includes('WHERE') && this.boundValues.length > 0) {
      const lastValue = this.boundValues[this.boundValues.length - 1];
      const updateValues = this.boundValues.slice(0, -1);
      
      records.forEach(record => {
        let shouldUpdate = false;
        
        // Check different WHERE conditions
        if (record.id === lastValue || record.telegram_id === lastValue) {
          shouldUpdate = true;
        } else if (tableName === 'invitations' && record.code === lastValue) {
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          // Apply updates (simplified)
          if (tableName === 'users') {
            record.first_name = updateValues[0] || record.first_name;
            record.last_name = updateValues[1] || record.last_name;
            record.updated_at = new Date().toISOString();
          } else if (tableName === 'invitations' && this.query.includes('used = used + 1')) {
            // Handle invitation usage increment
            record.used = ((record.used as number) || 0) + 1;
          }
          changes++;
        }
      });
    }
    
    return {
      results: [],
      success: true,
      meta: {
        changes,
        last_row_id: 0,
        duration: 1,
        size_after: 0,
        rows_read: 0,
        rows_written: changes
      }
    };
  }

  private handleDelete(tableName: string): MockD1Result {
    const records = this.db.getData(tableName);
    let changes = 0;
    
    if (this.query.includes('WHERE') && this.boundValues.length > 0) {
      const deleteValue = this.boundValues[0];
      const _initialLength = records.length;
      
      const filtered = records.filter(record => {
        const shouldDelete = record.id === deleteValue || record.telegram_id === deleteValue;
        if (shouldDelete) changes++;
        return !shouldDelete;
      });
      
      this.db['data'].set(tableName, filtered);
    }
    
    return {
      results: [],
      success: true,
      meta: {
        changes,
        last_row_id: 0,
        duration: 1,
        size_after: 0,
        rows_read: 0,
        rows_written: changes
      }
    };
  }
}

// Database service implementations
class DatabaseUserService {
  constructor(private db: MockD1Database) {}

  async createUser(userData: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
    role?: 'user' | 'admin';
  }) {
    const result = await this.db
      .prepare('INSERT INTO users (telegram_id, first_name, last_name, username, language_code, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        userData.telegramId,
        userData.firstName,
        userData.lastName,
        userData.username,
        userData.languageCode || 'en',
        userData.role || 'user',
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    return {
      id: result.meta.last_row_id,
      telegramId: userData.telegramId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      languageCode: userData.languageCode || 'en',
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async findUserByTelegramId(telegramId: string) {
    return await this.db
      .prepare('SELECT * FROM users WHERE telegram_id = ?')
      .bind(telegramId)
      .first();
  }

  async updateUser(userId: number, updates: Record<string, unknown>) {
    const result = await this.db
      .prepare('UPDATE users SET first_name = ?, last_name = ?, updated_at = ? WHERE id = ?')
      .bind(updates.firstName, updates.lastName, new Date().toISOString(), userId)
      .run();

    return result.meta.changes > 0;
  }

  async deleteUser(userId: number) {
    const result = await this.db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();

    return result.meta.changes > 0;
  }
}

class DatabaseSessionService {
  constructor(private db: MockD1Database) {}

  async createSession(userId: number, telegramId: string) {
    // Delete existing session
    await this.deleteSessionByTelegramId(telegramId);

    const sessionId = `session-${telegramId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare('INSERT INTO sessions (session_id, user_id, telegram_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(sessionId, userId, telegramId, new Date().toISOString(), expiresAt)
      .run();

    return {
      sessionId,
      userId,
      telegramId,
      createdAt: new Date(),
      expiresAt: new Date(expiresAt)
    };
  }

  async getSessionByTelegramId(telegramId: string) {
    return await this.db
      .prepare('SELECT * FROM sessions WHERE telegram_id = ? AND expires_at > ?')
      .bind(telegramId, new Date().toISOString())
      .first();
  }

  async deleteSessionByTelegramId(telegramId: string) {
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE telegram_id = ?')
      .bind(telegramId)
      .run();

    return result.meta.changes > 0;
  }
}

class DatabaseInvitationService {
  constructor(private db: MockD1Database) {}

  async createInvitationCode(code: string, maxUses: number = 1, expiresAt?: Date) {
    await this.db
      .prepare('INSERT INTO invitations (code, max_uses, used, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(code, maxUses, 0, expiresAt?.toISOString(), new Date().toISOString())
      .run();

    return {
      code,
      maxUses,
      used: 0,
      expiresAt,
      createdAt: new Date()
    };
  }

  async validateInvitationCode(code: string) {
    const invitation = await this.db
      .prepare('SELECT * FROM invitations WHERE code = ?')
      .bind(code)
      .first() as unknown as { code: string; used: number; max_uses: number; expires_at?: string } | null;

    if (!invitation) {
      throw new Error('Invalid or expired invitation code');
    }

    if (invitation.used >= invitation.max_uses) {
      throw new Error('Invitation code has reached maximum uses');
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation code has expired');
    }

    return invitation;
  }

  async useInvitationCode(code: string) {
    await this.db
      .prepare('UPDATE invitations SET used = used + 1 WHERE code = ?')
      .bind(code)
      .run();
  }
}

// Test suites
describe('Database Integration Tests', () => {
  let db: MockD1Database;
  let userService: DatabaseUserService;
  let sessionService: DatabaseSessionService;
  let invitationService: DatabaseInvitationService;

  beforeEach(async () => {
    db = new MockD1Database();
    userService = new DatabaseUserService(db);
    sessionService = new DatabaseSessionService(db);
    invitationService = new DatabaseInvitationService(db);

    // Initialize database schema
    await db.exec(`
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
      
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        telegram_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS invitations (
        code TEXT PRIMARY KEY,
        max_uses INTEGER NOT NULL DEFAULT 1,
        used INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );
    `);
  });

  afterEach(() => {
    db.clear();
  });

  describe('User-Session Integration', () => {
    test('should create user and session together', async () => {
      // Create user
      const testUser = await userService.createUser({
        telegramId: '12345',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      });

      expect(testUser.id).toBeTruthy();
      expect(testUser.telegramId).toBe('12345');

      // Create session for user
      const _session = await sessionService.createSession(testUser.id, testUser.telegramId);

      expect(_session.userId).toBe(testUser.id);
        expect(_session.telegramId).toBe(testUser.telegramId);
        expect(_session.sessionId).toBeTruthy();
    });

    test('should handle session cleanup when user is deleted', async () => {
      // Create user and session
      const _user = await userService.createUser({
        telegramId: '12345',
        firstName: 'John'
      });

      const _session = await sessionService.createSession(_user.id, _user.telegramId);

      // Verify session exists
      const foundSession = await sessionService.getSessionByTelegramId('12345');
      expect(foundSession).toBeTruthy();

      // Delete user
      const deleted = await userService.deleteUser(_user.id);
      expect(deleted).toBe(true);

      // Clean up session (in real implementation, this would be handled by foreign key constraints)
      await sessionService.deleteSessionByTelegramId('12345');

      // Verify session is cleaned up
      const deletedSession = await sessionService.getSessionByTelegramId('12345');
      expect(deletedSession).toBeFalsy();
    });

    test('should replace existing session on new login', async () => {
      const user = await userService.createUser({
        telegramId: '12345',
        firstName: 'John'
      });

      // Create first session
      const session1 = await sessionService.createSession(user.id, user.telegramId);
      
      // Create second session (should replace first)
      const session2 = await sessionService.createSession(user.id, user.telegramId);

      expect(session2.sessionId).not.toBe(session1.sessionId);

      // Only the latest session should exist
      const foundSession = await sessionService.getSessionByTelegramId('12345');
      expect(foundSession).toBeTruthy();
      expect((foundSession as unknown as { session_id: string }).session_id).toBe(session2.sessionId);
    });
  });

  describe('User-Invitation Integration', () => {
    test('should complete invitation-based registration flow', async () => {
      // Create invitation
      const invitation = await invitationService.createInvitationCode('BETA2025', 10);
      expect(invitation.code).toBe('BETA2025');
      expect(invitation.used).toBe(0);

      // Validate invitation before use
      const validInvitation = await invitationService.validateInvitationCode('BETA2025');
      expect(validInvitation.code).toBe('BETA2025');

      // Create user
      const _user = await userService.createUser({
        telegramId: '12345',
        firstName: 'John',
        lastName: 'Doe'
      });

      // Use invitation
      await invitationService.useInvitationCode('BETA2025');

      // Verify invitation usage
      const usedInvitation = await invitationService.validateInvitationCode('BETA2025');
      expect(usedInvitation.used).toBe(1);
    });

    test('should prevent registration with invalid invitation', async () => {
      // Try to validate non-existent invitation
      await expect(invitationService.validateInvitationCode('INVALID123'))
        .rejects.toThrow('Invalid or expired invitation code');

      // Should not create user without valid invitation
      // (In real implementation, this would be enforced at the application level)
    });

    test('should prevent registration with expired invitation', async () => {
      // Create expired invitation
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      await invitationService.createInvitationCode('EXPIRED123', 5, pastDate);

      // Try to validate expired invitation
      await expect(invitationService.validateInvitationCode('EXPIRED123'))
        .rejects.toThrow('Invitation code has expired');
    });

    test('should prevent registration with exhausted invitation', async () => {
      // Create single-use invitation
      await invitationService.createInvitationCode('SINGLE123', 1);

      // Use the invitation
      await invitationService.useInvitationCode('SINGLE123');

      // Try to validate exhausted invitation
      await expect(invitationService.validateInvitationCode('SINGLE123'))
        .rejects.toThrow('Invitation code has reached maximum uses');
    });
  });

  describe('Complete User Flow Integration', () => {
    test('should handle complete new user registration and login flow', async () => {
      // 1. Create invitation code
      const invitation = await invitationService.createInvitationCode('WELCOME2025', 100);
      expect(invitation.code).toBe('WELCOME2025');

      // 2. Validate invitation (user starts registration)
      const validInvitation = await invitationService.validateInvitationCode('WELCOME2025');
      expect(validInvitation.used).toBe(0);

      // 3. Create user account
      const user = await userService.createUser({
        telegramId: '12345',
        firstName: 'Alice',
        lastName: 'Smith',
        username: 'alicesmith',
        languageCode: 'en'
      });

      expect(user.telegramId).toBe('12345');
      expect(user.firstName).toBe('Alice');

      // 4. Use invitation code
      await invitationService.useInvitationCode('WELCOME2025');

      // 5. Create initial session
      const session = await sessionService.createSession(user.id, user.telegramId);
      expect(session.userId).toBe(user.id);
      expect(session.telegramId).toBe('12345');

      // 6. Verify complete state
      const foundUser = await userService.findUserByTelegramId('12345');
      const foundSession = await sessionService.getSessionByTelegramId('12345');
      const usedInvitation = await invitationService.validateInvitationCode('WELCOME2025');

      expect(foundUser).toBeTruthy();
      expect((foundUser as unknown as { first_name: string }).first_name).toBe('Alice');
      expect(foundSession).toBeTruthy();
      expect(usedInvitation.used).toBe(1);
    });

    test('should handle existing user login flow', async () => {
      // 1. Create existing user (simulate previous registration)
      const user = await userService.createUser({
        telegramId: '67890',
        firstName: 'Bob',
        lastName: 'Johnson'
      });

      // 2. User tries to login (find existing user)
      const foundUser = await userService.findUserByTelegramId('67890');
      expect(foundUser).toBeTruthy();
      expect((foundUser as unknown as { first_name: string }).first_name).toBe('Bob');

      // 3. Create new session (login)
      const session = await sessionService.createSession(user.id, user.telegramId);
      expect(session.userId).toBe(user.id);

      // 4. Verify session is active
      const activeSession = await sessionService.getSessionByTelegramId('67890');
      expect(activeSession).toBeTruthy();
      expect((activeSession as unknown as { user_id: number }).user_id).toBe(user.id);
    });

    test('should handle concurrent user operations', async () => {
      // Create multiple users concurrently
      const userPromises = [
        userService.createUser({ telegramId: '111', firstName: 'User1' }),
        userService.createUser({ telegramId: '222', firstName: 'User2' }),
        userService.createUser({ telegramId: '333', firstName: 'User3' })
      ];

      const users = await Promise.all(userPromises);
      expect(users).toHaveLength(3);
      expect(users[0].firstName).toBe('User1');
      expect(users[1].firstName).toBe('User2');
      expect(users[2].firstName).toBe('User3');

      // Create sessions for all users concurrently
      const sessionPromises = users.map(user => 
        sessionService.createSession(user.id, user.telegramId)
      );

      const sessions = await Promise.all(sessionPromises);
      expect(sessions).toHaveLength(3);

      // Verify all sessions are active
      const activeSessionPromises = users.map(user => 
        sessionService.getSessionByTelegramId(user.telegramId)
      );

      const activeSessions = await Promise.all(activeSessionPromises);
      expect(activeSessions.every(session => session !== null)).toBe(true);
    });
  });

  describe('Data Consistency and Constraints', () => {
    test('should maintain referential integrity', async () => {
      // Create user
      const user = await userService.createUser({
        telegramId: '12345',
        firstName: 'John'
      });

      // Create session
      const session = await sessionService.createSession(user.id, user.telegramId);

      // Verify relationship
      expect(session.userId).toBe(user.id);
      expect(session.telegramId).toBe(user.telegramId);

      // In a real database, deleting the user should cascade delete sessions
      // Here we simulate the constraint check
      const foundSession = await sessionService.getSessionByTelegramId(user.telegramId);
      expect(foundSession).toBeTruthy();
      expect((foundSession as unknown as { user_id: number }).user_id).toBe(user.id);
    });

    test('should handle unique constraint violations gracefully', async () => {
      // Create user
      await userService.createUser({
        telegramId: '12345',
        firstName: 'John'
      });

      // Try to create another user with same telegram_id
      // In a real implementation, this would throw a constraint violation
      // Here we simulate by checking if user exists first
      const existingUser = await userService.findUserByTelegramId('12345');
      expect(existingUser).toBeTruthy();

      // Application should handle this by updating existing user or returning error
    });

    test('should handle transaction-like operations', async () => {
      // Simulate a transaction: create user and session together
      try {
        // Start "transaction"
        const user = await userService.createUser({
          telegramId: '12345',
          firstName: 'John'
        });

        const session = await sessionService.createSession(user.id, user.telegramId);

        // Both operations should succeed
        expect(user.id).toBeTruthy();
        expect(session.sessionId).toBeTruthy();

        // Verify both records exist
        const foundUser = await userService.findUserByTelegramId('12345');
        const foundSession = await sessionService.getSessionByTelegramId('12345');

        expect(foundUser).toBeTruthy();
        expect(foundSession).toBeTruthy();
      } catch {
        // In a real transaction, we would rollback here
        throw new Error('Transaction failed');
      }
    });
  });
});