/**
 * Production-ready database query tests using real Cloudflare D1
 * 
 * These tests use the actual D1 database runtime to ensure
 * queries work correctly in production.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../../src/db/src/schema';
import { User } from '../../../../src/shared/src/types';
import {
  UserQueries,
  UserUsernameHistoryQueries,
  PositionQueries,
  OpportunityQueries,
  TradingStrategyQueries,
} from '../../../../src/db/src/utils/queries';

// Test data
const testUser = {
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'John',
  lastName: 'Doe',
  email: 'test@example.com',
  role: 'pro' as const,
  status: 'active' as const,
  languageCode: 'en',
  settings: {
    theme: 'dark',
    language: 'en',
    notifications: true,
    timezone: 'UTC',
  },
  apiLimits: {
    maxDailyRequests: 1000,
    exchangeApis: 5,
    aiApis: 100,
  },
  accountBalance: '1000.00',
  tradingPreferences: {
    riskTolerance: 'medium',
    maxLeverage: 2,
    stopLoss: 5,
    takeProfit: 10,
    autoTrade: false,
    maxConcurrentTrades: 3,
    percentagePerTrade: 5,
  },
};

const testPosition = {
  userId: 1,
  symbol: 'BTC/USDT',
  type: 'long' as const,
  strategy: 'arbitrage' as const,
  status: 'open' as const,
  quantity: 0.1,
  entryPrice: 45000,
  stopLoss: 43000,
  takeProfit: 47000,
  leverage: 1,
  fees: 4.5,
  pnl: 0,
  exchangeId: 'binance',
  metadata: {
    riskScore: 0.3,
    correlatedPositions: [],
    fundingRate: 0.0001,
    autoClose: false,
  },
};

const testOpportunity = {
  type: 'arbitrage' as const,
  symbol: 'BTC/USDT',
  exchange1: 'binance',
  exchange2: 'coinbase',
  price1: 45000,
  price2: 46000,
  profitPercentage: 2.2,
  confidence: 0.85,
  expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  isActive: true,
};

const testStrategy = {
  userId: 1,
  name: 'Test Strategy',
  type: 'arbitrage' as const,
  settings: {},
  performance: {
    totalTrades: 10,
    winRate: 0.7,
    averageReturn: 15.5,
    maxDrawdown: 5.2,
    sharpeRatio: 1.2,
    lastUpdated: Date.now(),
  },
  isActive: true,
};

describe('Database Query Utilities', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userQueries: UserQueries;
  let historyQueries: UserUsernameHistoryQueries;
  let positionQueries: PositionQueries;
  let opportunityQueries: OpportunityQueries;
  let strategyQueries: TradingStrategyQueries;

  beforeEach(async () => {
    // Initialize database connection
    db = drizzle(env.DB, { schema });
    
    // Initialize query classes
    userQueries = new UserQueries(db);
    historyQueries = new UserUsernameHistoryQueries(db);
    positionQueries = new PositionQueries(db);
    opportunityQueries = new OpportunityQueries(db);
    strategyQueries = new TradingStrategyQueries(db);
  });

  describe('UserQueries', () => {
    describe('create', () => {
      it('should create a new user', async () => {
        const result = await userQueries.create(testUser);
        
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.telegramId).toBe(testUser.telegramId);
        expect(result.username).toBe(testUser.username);
        expect(result.firstName).toBe(testUser.firstName);
        expect(result.lastName).toBe(testUser.lastName);
        expect(result.email).toBe(testUser.email);
        expect(result.role).toBe(testUser.role);
        expect(result.status).toBe(testUser.status);
      });
    });

    describe('findByTelegramId', () => {
      it('should find user by telegram ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Find the user
        const result = await userQueries.findByTelegramId(testUser.telegramId);
        
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdUser.id);
        expect(result?.telegramId).toBe(testUser.telegramId);
      });

      it('should return null when user not found', async () => {
        const result = await userQueries.findByTelegramId('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find user by ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Find the user
        const result = await userQueries.findById(createdUser.id);
        
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdUser.id);
        expect(result?.telegramId).toBe(testUser.telegramId);
      });
    });

    describe('update', () => {
      it('should update user', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Update the user
        const updates = { firstName: 'Updated' };
        const result = await userQueries.update(createdUser.id, updates);
        
        expect(result).toBeDefined();
        expect(result?.firstName).toBe('Updated');
        expect(result?.id).toBe(createdUser.id);
      });
    });

    describe('delete', () => {
      it('should delete user successfully', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Delete the user
        const result = await userQueries.delete(createdUser.id);
        expect(result).toBe(true);
        
        // Verify user is deleted
        const deletedUser = await userQueries.findById(createdUser.id);
        expect(deletedUser).toBeNull();
      });

      it('should return false when delete fails', async () => {
        const result = await userQueries.delete('non-existent-user-id'); // Non-existent ID
        expect(result).toBe(false);
      });
    });
  });

  describe('UserUsernameHistoryQueries', () => {
    describe('create', () => {
      it('should create a new username history record', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create username history
        const historyData = {
          userId: createdUser.id,
          telegramId: testUser.telegramId,
          username: testUser.username!,
          changeSource: 'manual_correction' as const,
        };
        
        const result = await historyQueries.create(historyData);
        
        expect(result).toBeDefined();
        expect(result.userId).toBe(createdUser.id);
        expect(result.telegramId).toBe(testUser.telegramId);
        expect(result.username).toBe(testUser.username);
      });
    });

    describe('findByTelegramId', () => {
      it('should find username history by telegram ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create username history
        const historyData = {
          userId: createdUser.id,
          telegramId: testUser.telegramId,
          username: testUser.username!,
          changeSource: 'manual_correction' as const,
        };
        
        await historyQueries.create(historyData);
        
        // Find the history
        const result = await historyQueries.findByTelegramId(testUser.telegramId);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].telegramId).toBe(testUser.telegramId);
      });
    });
  });

  describe('PositionQueries', () => {
    describe('create', () => {
      it('should create a new position', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create position
        const positionData = { ...testPosition, userId: createdUser.id };
        const result = await positionQueries.create(positionData);
        
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.userId).toBe(createdUser.id);
        expect(result.symbol).toBe(testPosition.symbol);
        expect(result.type).toBe(testPosition.type);
      });
    });

    describe('findById', () => {
      it('should find position by ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create position
        const positionData = { ...testPosition, userId: createdUser.id };
        const createdPosition = await positionQueries.create(positionData);
        
        // Find the position
        const result = await positionQueries.findById(createdPosition.id);
        
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdPosition.id);
        expect(result?.symbol).toBe(testPosition.symbol);
      });
    });

    describe('findByUserId', () => {
      it('should find positions by user ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create position
        const positionData = { ...testPosition, userId: createdUser.id };
        await positionQueries.create(positionData);
        
        // Find positions
        const result = await positionQueries.findByUserId(createdUser.id);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].userId).toBe(createdUser.id);
      });
    });

    describe('update', () => {
      it('should update a position', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create position
        const positionData = { ...testPosition, userId: createdUser.id };
        const createdPosition = await positionQueries.create(positionData);
        
        // Update position
        const updates = { status: 'closed' as const };
        const result = await positionQueries.update(createdPosition.id, updates);
        
        expect(result).toBeDefined();
        expect(result.status).toBe('closed');
        expect(result.id).toBe(createdPosition.id);
      });
    });

    describe('closePosition', () => {
      it('should close position with exit price and PnL', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create position
        const positionData = { ...testPosition, userId: createdUser.id };
        const createdPosition = await positionQueries.create(positionData);
        
        // Close position
        const exitPrice = 46000;
        const pnl = 100;
        const result = await positionQueries.closePosition(createdPosition.id, exitPrice, pnl);
        
        expect(result).toBeDefined();
        expect(result.status).toBe('closed');
        expect(result.exitPrice).toBe(exitPrice);
        expect(result.pnl).toBe(pnl);
        expect(result.closedAt).toBeDefined();
      });
    });
  });

  describe('OpportunityQueries', () => {
    describe('create', () => {
      it('should create a new opportunity', async () => {
        const result = await opportunityQueries.create(testOpportunity);
        
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.symbol).toBe(testOpportunity.symbol);
        expect(result.type).toBe(testOpportunity.type);
        expect(result.isActive).toBe(true);
      });
    });

    describe('findById', () => {
      it('should find an opportunity by ID', async () => {
        const createdOpportunity = await opportunityQueries.create(testOpportunity);
        
        const result = await opportunityQueries.findById(createdOpportunity.id);
        
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdOpportunity.id);
        expect(result?.symbol).toBe(testOpportunity.symbol);
      });
    });

    describe('findActive', () => {
      it('should find active opportunities', async () => {
        await opportunityQueries.create(testOpportunity);
        
        const result = await opportunityQueries.findActive();
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].isActive).toBe(true);
      });
    });

    describe('deactivate', () => {
      it('should deactivate an opportunity', async () => {
        const createdOpportunity = await opportunityQueries.create(testOpportunity);
        
        const result = await opportunityQueries.deactivate(createdOpportunity.id);
        expect(result).toBe(true);
        
        // Verify it's deactivated
        const deactivatedOpportunity = await opportunityQueries.findById(createdOpportunity.id);
        expect(deactivatedOpportunity?.isActive).toBe(false);
      });
    });
  });

  describe('TradingStrategyQueries', () => {
    describe('create', () => {
      it('should create a new strategy', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create strategy
        const strategyData = { ...testStrategy, userId: createdUser.id };
        const result = await strategyQueries.create(strategyData);
        
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.userId).toBe(createdUser.id);
        expect(result.name).toBe(testStrategy.name);
        expect(result.type).toBe(testStrategy.type);
      });
    });

    describe('findById', () => {
      it('should find a strategy by ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create strategy
        const strategyData = { ...testStrategy, userId: createdUser.id };
        const createdStrategy = await strategyQueries.create(strategyData);
        
        // Find the strategy
        const result = await strategyQueries.findById(createdStrategy.id);
        
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdStrategy.id);
        expect(result?.name).toBe(testStrategy.name);
      });
    });

    describe('findByUserId', () => {
      it('should find strategies by user ID', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create strategy
        const strategyData = { ...testStrategy, userId: createdUser.id };
        await strategyQueries.create(strategyData);
        
        // Find strategies
        const result = await strategyQueries.findByUserId(createdUser.id);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].userId).toBe(createdUser.id);
      });
    });

    describe('update', () => {
      it('should update a strategy', async () => {
        // Create a user first
        const createdUser = await userQueries.create(testUser);
        
        // Create strategy
        const strategyData = { ...testStrategy, userId: createdUser.id };
        const createdStrategy = await strategyQueries.create(strategyData);
        
        // Update strategy
        const updates = { isActive: false };
        const result = await strategyQueries.update(createdStrategy.id, updates);
        
        expect(result).toBeDefined();
        expect(result?.isActive).toBe(false);
        expect(result?.id).toBe(createdStrategy.id);
      });
    });
  });
});