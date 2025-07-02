/**
 * Global test setup file
 * Provides common utilities and mocks for all tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Global test environment setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Set up default environment variables
  process.env.NODE_ENV = 'test';
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.WEBHOOK_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'test-db';
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
});

// Global fetch mock
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

// Type definitions for test utilities
interface MockTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface MockTelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

interface MockTelegramMessage {
  message_id: number;
  from: MockTelegramUser;
  chat: MockTelegramChat;
  date: number;
  text?: string;
}

// Common test utilities
export const TestUtils = {
  /**
   * Create a mock Telegram user
   */
  createMockTelegramUser: (overrides: Partial<MockTelegramUser> = {}): MockTelegramUser => ({
    id: 12345,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
    ...overrides
  }),

  /**
   * Create a mock Telegram message
   */
  createMockTelegramMessage: (overrides: Partial<MockTelegramMessage> = {}): MockTelegramMessage => ({
    message_id: 1,
    from: TestUtils.createMockTelegramUser(),
    chat: {
      id: 12345,
      type: 'private' as const
    },
    date: Math.floor(Date.now() / 1000),
    text: '/start',
    ...overrides
  }),

  /**
   * Create a mock Telegram update
   */
  createMockTelegramUpdate: (overrides: Partial<{
    update_id: number;
    message?: unknown;
    callback_query?: unknown;
  }> = {}) => ({
    update_id: 1,
    message: TestUtils.createMockTelegramMessage(),
    ...overrides
  }),

  /**
   * Create a mock database user
   */
  createMockUser: (overrides: Partial<{
    id: number;
    telegram_id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    role: string;
    created_at: string;
    updated_at: string;
  }> = {}) => ({
    id: 1,
    telegram_id: '12345',
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a mock session
   */
  createMockSession: (overrides: Partial<{
    id: number;
    session_id: string;
    user_id: number;
    telegram_id: string;
    created_at: string;
    expires_at: string;
  }> = {}) => ({
    id: 1,
    session_id: 'test-session-id',
    user_id: 1,
    telegram_id: '12345',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  }),

  /**
   * Create a mock invitation
   */
  createMockInvitation: (overrides: Partial<{
    id: number;
    code: string;
    max_uses: number;
    used: number;
    expires_at?: string;
    created_at: string;
  }> = {}) => ({
    id: 1,
    code: 'TEST123',
    max_uses: 10,
    used: 0,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a mock trading signal
   */
  createMockTradingSignal: (overrides: Partial<{
    id: number;
    signal_type: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    confidence: number;
    created_at: string;
  }> = {}) => ({
    id: 1,
    signal_type: 'technical',
    symbol: 'BTC/USD',
    action: 'BUY' as const,
    price: 45000,
    confidence: 0.85,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a mock fetch response
   */
  createMockFetchResponse: (data: unknown, options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}) => {
    const response = {
      ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      headers: new Map(Object.entries(options.headers || {})),
      json: vi.fn().mockResolvedValue(data),
      text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
      blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
    };
    return response;
  },

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random string
   */
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a random number within range
   */
  randomNumber: (min: number = 0, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Create a mock environment object
   */
  createMockEnv: (overrides: Record<string, unknown> = {}) => ({
    TELEGRAM_BOT_TOKEN: 'test-token',
    WEBHOOK_SECRET: 'test-secret',
    DATABASE_URL: 'test-db',
    ...overrides
  })
};

// Export common mock implementations
export const MockImplementations = {
  /**
   * Mock KV Namespace implementation
   */
  KVNamespace: class MockKVNamespace {
    private data = new Map<string, string>();
    private metadata = new Map<string, unknown>();

    async get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<unknown> {
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
        this.metadata.set(key, options.metadata);
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
  },

  /**
   * Mock D1 Database implementation
   */
  D1Database: class MockD1Database {
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

    prepare(_query: string) {
      return {
        bind: (..._values: unknown[]) => ({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1, last_row_id: this.nextId++ } }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      };
    }

    async exec(_query: string) {
      return [{ success: true, meta: { changes: 0 } }];
    }

    clear(): void {
      this.data.clear();
      this.nextId = 1;
      this.initializeTables();
    }
  }
};

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});