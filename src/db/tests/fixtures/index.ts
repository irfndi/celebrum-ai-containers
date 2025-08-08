// Database Test Fixtures
import type { User } from '../../../shared/src/types';

// Mock Database Connection Fixtures
export const mockDbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'celebrum_test',
  username: 'test_user',
  password: 'test_password',
  ssl: false,
  pool: {
    min: 1,
    max: 5,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  }
};

export const mockDbConnection = {
  query: async (sql: string, params?: any[]) => ({ rows: [], rowCount: 0 }),
  transaction: async (callback: Function) => callback(mockDbConnection),
  release: () => Promise.resolve(),
  end: () => Promise.resolve()
};

// Mock Query Builder Fixtures
export const mockQueryBuilder = {
  select: (columns?: string | string[]) => mockQueryBuilder,
  from: (table: string) => mockQueryBuilder,
  where: (condition: string | object, value?: any) => mockQueryBuilder,
  whereIn: (column: string, values: any[]) => mockQueryBuilder,
  whereNotIn: (column: string, values: any[]) => mockQueryBuilder,
  whereBetween: (column: string, range: [any, any]) => mockQueryBuilder,
  whereNull: (column: string) => mockQueryBuilder,
  whereNotNull: (column: string) => mockQueryBuilder,
  join: (table: string, condition: string) => mockQueryBuilder,
  leftJoin: (table: string, condition: string) => mockQueryBuilder,
  rightJoin: (table: string, condition: string) => mockQueryBuilder,
  innerJoin: (table: string, condition: string) => mockQueryBuilder,
  groupBy: (columns: string | string[]) => mockQueryBuilder,
  having: (condition: string, value?: any) => mockQueryBuilder,
  orderBy: (column: string, direction?: 'asc' | 'desc') => mockQueryBuilder,
  limit: (count: number) => mockQueryBuilder,
  offset: (count: number) => mockQueryBuilder,
  insert: (data: object | object[]) => mockQueryBuilder,
  update: (data: object) => mockQueryBuilder,
  delete: () => mockQueryBuilder,
  returning: (columns?: string | string[]) => mockQueryBuilder,
  execute: async () => ({ rows: [], rowCount: 0 }),
  first: async () => null,
  then: async (callback: Function) => callback({ rows: [], rowCount: 0 })
};

// Mock Database Transaction Fixtures
export const mockTransaction = {
  ...mockQueryBuilder,
  commit: async () => Promise.resolve(),
  rollback: async () => Promise.resolve(),
  savepoint: async (name: string) => Promise.resolve(),
  rollbackTo: async (name: string) => Promise.resolve()
};

// Database Error Fixtures
export const mockDbError = {
  code: '23505', // Unique violation
  message: 'duplicate key value violates unique constraint',
  detail: 'Key (email)=(test@example.com) already exists.',
  table: 'users',
  constraint: 'users_email_unique'
};

export const mockConnectionError = {
  code: 'ECONNREFUSED',
  message: 'connect ECONNREFUSED 127.0.0.1:5432',
  errno: -61,
  syscall: 'connect',
  address: '127.0.0.1',
  port: 5432
};

export const mockTimeoutError = {
  code: 'ETIMEDOUT',
  message: 'Connection timeout',
  timeout: 30000
};

export const mockValidationError = {
  code: '23514', // Check violation
  message: 'new row for relation "positions" violates check constraint',
  detail: 'Failing row contains (quantity = -1)',
  table: 'positions',
  constraint: 'positions_quantity_positive'
};

// Mock Migration Fixtures
export const mockMigration = {
  id: '20240101000000_create_users_table',
  name: 'create_users_table',
  batch: 1,
  migration_time: new Date('2024-01-01T00:00:00Z')
};

export const mockMigrationList = [
  {
    id: '20240101000000_create_users_table',
    name: 'create_users_table',
    batch: 1,
    migration_time: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: '20240101000001_create_positions_table',
    name: 'create_positions_table',
    batch: 1,
    migration_time: new Date('2024-01-01T00:00:01Z')
  },
  {
    id: '20240101000002_add_indexes',
    name: 'add_indexes',
    batch: 2,
    migration_time: new Date('2024-01-01T00:00:02Z')
  }
];

// Mock Seed Data Fixtures
export const mockSeedUsers = [
  {
    id: 'seed_user_1',
    telegramId: 111111111,
    firstName: 'Seed',
    lastName: 'User1',
    username: 'seeduser1',
    email: 'seed1@example.com',
    role: 'user' as const,
    status: 'active' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: 'seed_user_2',
    telegramId: 222222222,
    firstName: 'Seed',
    lastName: 'User2',
    username: 'seeduser2',
    email: 'seed2@example.com',
    role: 'user' as const,
    status: 'active' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }
];

export const mockSeedPositions = [
  {
    id: 'seed_pos_1',
    userId: 'seed_user_1',
    exchangeId: 'binance',
    symbol: 'BTCUSDT',
    type: 'long' as const,
    strategy: 'momentum',
    entryPrice: 45000,
    quantity: 0.1,
    leverage: 1,
    status: 'open' as const,
    pnl: 0,
    fees: 4.5,
    createdAt: new Date('2024-01-01T01:00:00Z'),
    updatedAt: new Date('2024-01-01T01:00:00Z')
  },
  {
    id: 'seed_pos_2',
    userId: 'seed_user_2',
    exchangeId: 'binance',
    symbol: 'ETHUSDT',
    type: 'short' as const,
    strategy: 'reversal',
    entryPrice: 3200,
    exitPrice: 3150,
    quantity: 1,
    leverage: 2,
    status: 'closed' as const,
    pnl: 50,
    fees: 6.4,
    createdAt: new Date('2024-01-01T02:00:00Z'),
    updatedAt: new Date('2024-01-01T03:00:00Z'),
    closedAt: new Date('2024-01-01T03:00:00Z')
  }
];

// Database Performance Test Fixtures
export const mockPerformanceMetrics = {
  queryTime: 15.5, // milliseconds
  connectionTime: 2.1,
  totalTime: 17.6,
  rowsAffected: 1,
  memoryUsage: {
    rss: 45678912,
    heapTotal: 12345678,
    heapUsed: 8765432,
    external: 1234567
  }
};

export const mockSlowQuery = {
  sql: 'SELECT * FROM positions p JOIN users u ON p.userId = u.id WHERE p.createdAt > $1',
  params: ['2024-01-01'],
  duration: 2500, // milliseconds
  rowCount: 10000
};

// Helper Functions
export const createMockDbConnection = (overrides: Partial<typeof mockDbConnection> = {}) => ({
  ...mockDbConnection,
  ...overrides
});

export const createMockQueryBuilder = (overrides: Partial<typeof mockQueryBuilder> = {}) => ({
  ...mockQueryBuilder,
  ...overrides
});

export const createMockTransaction = (overrides: Partial<typeof mockTransaction> = {}) => ({
  ...mockTransaction,
  ...overrides
});

export const createMockDbError = (code: string, message: string, details?: any) => ({
  code,
  message,
  ...details
});

// Database Test Utilities
export const mockDbUtils = {
  truncateTable: async (tableName: string) => Promise.resolve(),
  seedTable: async (tableName: string, data: any[]) => Promise.resolve(),
  resetSequence: async (tableName: string, sequenceName: string) => Promise.resolve(),
  createTestDatabase: async () => Promise.resolve(),
  dropTestDatabase: async () => Promise.resolve(),
  runMigrations: async () => Promise.resolve(),
  rollbackMigrations: async () => Promise.resolve()
};

// Connection Pool Fixtures
export const mockConnectionPool = {
  totalCount: 5,
  idleCount: 3,
  waitingCount: 0,
  acquire: async () => mockDbConnection,
  release: async (connection: any) => Promise.resolve(),
  destroy: async () => Promise.resolve(),
  clear: async () => Promise.resolve()
};

// Database Schema Fixtures
export const mockTableSchema = {
  tableName: 'users',
  columns: [
    { name: 'id', type: 'varchar', nullable: false, primaryKey: true },
    { name: 'telegramId', type: 'bigint', nullable: false, unique: true },
    { name: 'firstName', type: 'varchar', nullable: false },
    { name: 'lastName', type: 'varchar', nullable: true },
    { name: 'username', type: 'varchar', nullable: true, unique: true },
    { name: 'email', type: 'varchar', nullable: true, unique: true },
    { name: 'role', type: 'varchar', nullable: false, default: 'user' },
    { name: 'status', type: 'varchar', nullable: false, default: 'active' },
    { name: 'createdAt', type: 'timestamp', nullable: false, default: 'CURRENT_TIMESTAMP' },
    { name: 'updatedAt', type: 'timestamp', nullable: false, default: 'CURRENT_TIMESTAMP' }
  ],
  indexes: [
    { name: 'idx_users_telegram_id', columns: ['telegramId'], unique: true },
    { name: 'idx_users_username', columns: ['username'], unique: true },
    { name: 'idx_users_email', columns: ['email'], unique: true },
    { name: 'idx_users_status', columns: ['status'] }
  ]
};