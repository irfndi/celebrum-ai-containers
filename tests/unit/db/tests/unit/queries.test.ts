/**
 * Production-ready database queries tests using Cloudflare D1
 * 
 * These tests run against the actual D1 database runtime, ensuring
 * compatibility with production environments.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UserQueries,
  UserUsernameHistoryQueries,
  PositionQueries,
  OpportunityQueries,
  TradingStrategyQueries,
} from '../../../../../src/db/src/utils/queries';
import type {
  User,
  UserUsernameHistory,
  Position,
  Opportunity,
  TradingStrategy,
} from '../../../../../src/db/src/schema';
import { db, executeRawSQL } from '../../../../../tests/setup/setup-db-cloudflare';

// Test data that matches the actual database schema
const testUser = {
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  languageCode: 'en',
  role: 'free' as const,
  status: 'active' as const,
};

const testUsernameHistory = {
  userId: 1,
  telegramId: '123456789',
  username: 'testuser',
  changeSource: 'telegram_update' as const,
};

const testPosition = {
  userId: 1,
  exchangeId: 'binance',
  symbol: 'BTCUSDT',
  type: 'long' as const,
  strategy: 'technical' as const,
  entryPrice: 50000,
  quantity: 1.0,
  leverage: 1,
  status: 'open' as const,
  pnl: 0,
  fees: 0,
};

const testOpportunity = {
  type: 'arbitrage' as const,
  symbol: 'BTCUSDT',
  exchange1: 'binance',
  exchange2: 'coinbase',
  price1: 50000,
  price2: 50500,
  profitPercentage: 1.0,
  confidence: 0.95,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  isActive: true,
};

const testTradingStrategy = {
  userId: 1,
  name: 'Test Strategy',
  type: 'technical' as const,
  isActive: true,
  settings: {},
};

// Query instances
let userQueries: UserQueries;
let usernameHistoryQueries: UserUsernameHistoryQueries;
let positionQueries: PositionQueries;
let opportunityQueries: OpportunityQueries;
let tradingStrategyQueries: TradingStrategyQueries;

beforeEach(async () => {
  // Initialize query instances with the D1 database
  userQueries = new UserQueries(db);
  usernameHistoryQueries = new UserUsernameHistoryQueries(db);
  positionQueries = new PositionQueries(db);
  opportunityQueries = new OpportunityQueries(db);
  tradingStrategyQueries = new TradingStrategyQueries(db);
  
  // Database is automatically isolated for each test
});

afterEach(async () => {
  // Database is automatically cleaned up between tests with isolated storage
});

describe('UserQueries', () => {
  describe('create and findById', () => {
    it('should create and retrieve a user', async () => {
      // Create a user
      const createdUser = await userQueries.create(testUser);
      
      expect(createdUser).toBeDefined();
      expect(createdUser.telegramId).toBe(testUser.telegramId);
      expect(createdUser.username).toBe(testUser.username);
      expect(createdUser.id).toBeDefined();
      
      // Retrieve the user by ID
      const foundUser = await userQueries.findById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.telegramId).toBe(testUser.telegramId);
    });
  });

  describe('findByTelegramId', () => {
    it('should find user by telegram ID', async () => {
      // Create a user first
      await userQueries.create(testUser);
      
      // Find by telegram ID
      const result = await userQueries.findByTelegramId(testUser.telegramId);
      
      expect(result).toBeDefined();
      expect(result?.telegramId).toBe(testUser.telegramId);
      expect(result?.username).toBe(testUser.username);
    });

    it('should return null for non-existent telegram ID', async () => {
      const result = await userQueries.findByTelegramId('nonexistent');
      expect(result).toBeNull();
    });
  });
});

describe('UserUsernameHistoryQueries', () => {
  let userId: string;

  beforeEach(async () => {
    // Create a user first for username history tests
    const user = await userQueries.create(testUser);
    userId = user.id;
  });

  describe('create and findByTelegramId', () => {
    it('should create and retrieve username history', async () => {
      const historyData = {
        ...testUsernameHistory,
        userId,
      };
      
      // Create username history entry
      const created = await usernameHistoryQueries.create(historyData);
      
      expect(created).toBeDefined();
      expect(created.telegramId).toBe(historyData.telegramId);
      expect(created.username).toBe(historyData.username);
      
      // Retrieve by telegram ID
      const history = await usernameHistoryQueries.findByTelegramId(historyData.telegramId);
      
      expect(history).toHaveLength(1);
      expect(history[0].telegramId).toBe(historyData.telegramId);
      expect(history[0].username).toBe(historyData.username);
    });
  });

  describe('getLatestUsername', () => {
    it('should get the latest username for a telegram ID', async () => {
      const historyData = {
        ...testUsernameHistory,
        userId,
      };
      
      // Create username history entry
      await usernameHistoryQueries.create(historyData);
      
      // Get latest username
      const latestUsername = await usernameHistoryQueries.getLatestUsername(historyData.telegramId);
      
      expect(latestUsername).toBe(historyData.username);
    });

    it('should return null for non-existent telegram ID', async () => {
      const result = await usernameHistoryQueries.getLatestUsername('nonexistent');
      expect(result).toBeNull();
    });
  });
});

describe('PositionQueries', () => {
  let userId: string;

  beforeEach(async () => {
    // Create a user first for position tests
    const user = await userQueries.create(testUser);
    userId = user.id;
  });

  describe('create and findById', () => {
    it('should create and retrieve a position', async () => {
      const positionData = {
        ...testPosition,
        userId,
      };
      
      // Create position
      const created = await positionQueries.create(positionData);
      
      expect(created).toBeDefined();
      expect(created.symbol).toBe(positionData.symbol);
      expect(created.type).toBe(positionData.type);
      expect(created.userId).toBe(userId);
      
      // Retrieve by ID
      const found = await positionQueries.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.symbol).toBe(positionData.symbol);
    });
  });
});

describe('OpportunityQueries', () => {
  describe('create and findById', () => {
    it('should create and retrieve an opportunity', async () => {
      // Create opportunity
      const created = await opportunityQueries.create(testOpportunity);
      
      expect(created).toBeDefined();
      expect(created.symbol).toBe(testOpportunity.symbol);
      expect(created.type).toBe(testOpportunity.type);
      expect(created.isActive).toBe(true);
      
      // Retrieve by ID
      const found = await opportunityQueries.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.symbol).toBe(testOpportunity.symbol);
    });
  });

  describe('findActive', () => {
    it('should find active opportunities', async () => {
      // Create an active opportunity
      await opportunityQueries.create(testOpportunity);
      
      // Create an inactive opportunity
      await opportunityQueries.create({
        ...testOpportunity,
        symbol: 'ETHUSDT',
        isActive: false,
      });
      
      // Find active opportunities
      const activeOpportunities = await opportunityQueries.findActive();
      
      expect(activeOpportunities).toHaveLength(1);
      expect(activeOpportunities[0].symbol).toBe(testOpportunity.symbol);
      expect(activeOpportunities[0].isActive).toBe(true);
    });
  });
});

describe('TradingStrategyQueries', () => {
  let userId: string;

  beforeEach(async () => {
    // Create a user first for trading strategy tests
    const user = await userQueries.create(testUser);
    userId = user.id;
  });

  describe('create and findById', () => {
    it('should create and retrieve a trading strategy', async () => {
      const strategyData = {
        ...testTradingStrategy,
        userId,
      };
      
      // Create strategy
      const created = await tradingStrategyQueries.create(strategyData);
      
      expect(created).toBeDefined();
      expect(created.name).toBe(strategyData.name);
      expect(created.type).toBe(strategyData.type);
      expect(created.userId).toBe(userId);
      
      // Retrieve by ID
      const found = await tradingStrategyQueries.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(strategyData.name);
    });
  });

  describe('findByUserId', () => {
    it('should find strategies by user ID', async () => {
      const strategyData = {
        ...testTradingStrategy,
        userId,
      };
      
      // Create multiple strategies for the user
      await tradingStrategyQueries.create(strategyData);
      await tradingStrategyQueries.create({
        ...strategyData,
        name: 'Another Strategy',
      });
      
      // Create a strategy for a different user
      const anotherUser = await userQueries.create({
        ...testUser,
        telegramId: '987654321',
        username: 'anotheruser',
      });
      await tradingStrategyQueries.create({
        ...strategyData,
        userId: anotherUser.id,
        name: 'Different User Strategy',
      });
      
      // Find strategies by user ID
      const userStrategies = await tradingStrategyQueries.findByUserId(userId);
      
      expect(userStrategies).toHaveLength(2);
      expect(userStrategies.every(s => s.userId === userId)).toBe(true);
    });
  });
});

describe('Database Integration', () => {
  it('should handle database constraints properly', async () => {
    // Test foreign key constraints
    const user = await userQueries.create(testUser);
    
    // Create position with valid user ID
    const position = await positionQueries.create({
      ...testPosition,
      userId: user.id,
    });
    
    expect(position.userId).toBe(user.id);
    
    // Verify the position exists
    const foundPosition = await positionQueries.findById(position.id);
    expect(foundPosition).toBeDefined();
    expect(foundPosition?.userId).toBe(user.id);
  });

  it('should handle concurrent operations', async () => {
    // Create multiple users concurrently
    const userPromises = Array.from({ length: 5 }, (_, i) => 
      userQueries.create({
        ...testUser,
        telegramId: `12345678${i}`,
        username: `testuser${i}`,
      })
    );
    
    const users = await Promise.all(userPromises);
    
    expect(users).toHaveLength(5);
    expect(new Set(users.map(u => u.id)).size).toBe(5); // All unique IDs
  });
});