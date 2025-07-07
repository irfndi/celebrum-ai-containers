import { describe, it, expect, vi } from 'vitest';
import {
  UserQueries,
  UserUsernameHistoryQueries,
  PositionQueries,
  OpportunityQueries,
  TradingStrategyQueries,
} from '../../src/utils/queries.js';
import type {
  User,
  UserUsernameHistory,
  Position,
  Opportunity,
  TradingStrategy,
} from '../../src/schema/index.js';

// Simple mock database that returns predefined data
function createSimpleMockDb(returnData: any) {
  const mockQueryResult = Array.isArray(returnData) ? returnData : [returnData];
  
  // Create a chainable mock that resolves to the expected data
  const createChainableMock = () => {
    const chainable: any = {
      then: (resolve: any) => resolve(mockQueryResult),
      catch: () => chainable,
    };
    
    // All chainable methods return the chainable object
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.from = vi.fn().mockReturnValue(chainable);
    chainable.where = vi.fn().mockReturnValue(chainable);
    chainable.orderBy = vi.fn().mockReturnValue(chainable);
    chainable.limit = vi.fn().mockReturnValue(chainable);
    chainable.insert = vi.fn().mockReturnValue(chainable);
    chainable.values = vi.fn().mockReturnValue(chainable);
    chainable.returning = vi.fn().mockReturnValue({
      then: (resolve: any) => resolve([returnData]),
      catch: () => chainable,
    });
    chainable.update = vi.fn().mockReturnValue(chainable);
    chainable.set = vi.fn().mockReturnValue(chainable);
    chainable.delete = vi.fn().mockReturnValue(chainable);
    
    return chainable;
  };
  
  return createChainableMock();
}

// Mock data
const mockUser: User = {
  id: 1,
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  languageCode: 'en',
  email: null,
  role: 'free',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastActiveAt: null,
  settings: {},
  apiLimits: {},
  accountBalance: '1000.00',
  betaExpiresAt: null,
  tradingPreferences: {},
};

const mockUsernameHistory: UserUsernameHistory = {
  id: 1,
  userId: 1,
  telegramId: '123456789',
  username: 'testuser',
  changedAt: new Date('2024-01-01'),
  changeSource: 'telegram_update',
};

const mockPosition: Position = {
  id: 1,
  userId: 1,
  exchangeId: 'binance',
  symbol: 'BTCUSDT',
  type: 'long',
  strategy: 'technical',
  entryPrice: 50000,
  exitPrice: null,
  quantity: 1.0,
  leverage: 1,
  stopLoss: null,
  takeProfit: null,
  status: 'open',
  pnl: 0,
  fees: 0,
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  closedAt: null,
};

const mockOpportunity: Opportunity = {
  id: 1,
  type: 'arbitrage',
  symbol: 'BTCUSDT',
  exchange1: 'binance',
  exchange2: 'coinbase',
  price1: 50000,
  price2: 50500,
  profitPercentage: 1.0,
  confidence: 0.95,
  expiresAt: new Date('2024-01-02'),
  isActive: true,
  createdAt: new Date('2024-01-01'),
};

const mockTradingStrategy: TradingStrategy = {
  id: 1,
  userId: 1,
  name: 'Test Strategy',
  type: 'technical',
  isActive: true,
  settings: {},
  performance: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('UserQueries', () => {
  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockDb = createSimpleMockDb(mockUser);
      const userQueries = new UserQueries(mockDb as any);
      
      const result = await userQueries.findById(1);
      
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('findByTelegramId', () => {
    it('should find user by telegram ID', async () => {
      const mockDb = createSimpleMockDb(mockUser);
      const userQueries = new UserQueries(mockDb as any);
      
      const result = await userQueries.findByTelegramId('123456789');
      
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const newUserData = {
        telegramId: '987654321',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
      };
      
      const mockDb = createSimpleMockDb({ ...mockUser, ...newUserData });
      const userQueries = new UserQueries(mockDb as any);
      
      const result = await userQueries.create(newUserData);
      
      expect(result).toEqual({ ...mockUser, ...newUserData });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });
});

describe('UserUsernameHistoryQueries', () => {
  describe('findByTelegramId', () => {
    it('should find username history by telegram ID', async () => {
      const mockDb = createSimpleMockDb([mockUsernameHistory]);
      const usernameHistoryQueries = new UserUsernameHistoryQueries(mockDb as any);
      
      const result = await usernameHistoryQueries.findByTelegramId('123456789');
      
      expect(result).toEqual([mockUsernameHistory]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create username history entry', async () => {
      const newEntry = {
        userId: 123,
        telegramId: '456789',
        username: 'newusername'
      };
      const mockDb = createSimpleMockDb({ ...mockUsernameHistory, ...newEntry });
      const usernameHistoryQueries = new UserUsernameHistoryQueries(mockDb as any);
      
      const result = await usernameHistoryQueries.create(newEntry);
      
      expect(result).toEqual({ ...mockUsernameHistory, ...newEntry });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('getLatestUsername', () => {
    it('should get latest username for telegram ID', async () => {
      const mockDb = createSimpleMockDb({ username: 'testuser' });
      const usernameHistoryQueries = new UserUsernameHistoryQueries(mockDb as any);
      
      const result = await usernameHistoryQueries.getLatestUsername('123456789');
      
      expect(result).toBe('testuser');
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});

describe('PositionQueries', () => {
  describe('findById', () => {
    it('should find position by ID', async () => {
      const mockDb = createSimpleMockDb(mockPosition);
      const positionQueries = new PositionQueries(mockDb as any);
      
      const result = await positionQueries.findById(1);
      
      expect(result).toEqual(mockPosition);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new position', async () => {
      const newPositionData = {
        userId: 123,
        exchangeId: 'binance',
        symbol: 'ETHUSDT',
        type: 'long' as const,
        strategy: 'technical' as const,
        entryPrice: 3000,
        quantity: 1.0,
      };
      
      const mockDb = createSimpleMockDb({ ...mockPosition, ...newPositionData });
      const positionQueries = new PositionQueries(mockDb as any);
      
      const result = await positionQueries.create(newPositionData);
      
      expect(result).toEqual({ ...mockPosition, ...newPositionData });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });
});

describe('OpportunityQueries', () => {
  describe('findById', () => {
    it('should find opportunity by ID', async () => {
      const mockDb = createSimpleMockDb(mockOpportunity);
      const opportunityQueries = new OpportunityQueries(mockDb as any);
      
      const result = await opportunityQueries.findById(1);
      
      expect(result).toEqual(mockOpportunity);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new opportunity', async () => {
      const newOpportunityData = {
        type: 'arbitrage' as const,
        symbol: 'BTCUSDT',
        exchange1: 'binance',
        exchange2: 'coinbase',
        price1: 50000,
        price2: 50500,
        profitPercentage: 1.0,
        confidence: 0.95,
        expiresAt: new Date('2024-01-02'),
      };
      
      const mockDb = createSimpleMockDb({ ...mockOpportunity, ...newOpportunityData });
      const opportunityQueries = new OpportunityQueries(mockDb as any);
      
      const result = await opportunityQueries.create(newOpportunityData);
      
      expect(result).toEqual({ ...mockOpportunity, ...newOpportunityData });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('should find active opportunities', async () => {
      const mockDb = createSimpleMockDb([mockOpportunity]);
      const opportunityQueries = new OpportunityQueries(mockDb as any);
      
      const result = await opportunityQueries.findActive();
      
      expect(result).toEqual([mockOpportunity]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});

describe('TradingStrategyQueries', () => {
  describe('findById', () => {
    it('should find trading strategy by ID', async () => {
      const mockDb = createSimpleMockDb(mockTradingStrategy);
      const strategyQueries = new TradingStrategyQueries(mockDb as any);
      
      const result = await strategyQueries.findById(1);
      
      expect(result).toEqual(mockTradingStrategy);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new trading strategy', async () => {
      const newStrategyData = {
        userId: 123,
        name: 'MACD Strategy',
        type: 'technical' as const,
        settings: { macd: true },
      };
      
      const mockDb = createSimpleMockDb({ ...mockTradingStrategy, ...newStrategyData });
      const strategyQueries = new TradingStrategyQueries(mockDb as any);
      
      const result = await strategyQueries.create(newStrategyData);
      
      expect(result).toEqual({ ...mockTradingStrategy, ...newStrategyData });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find strategies by user ID', async () => {
      const mockDb = createSimpleMockDb([mockTradingStrategy]);
      const strategyQueries = new TradingStrategyQueries(mockDb as any);
      
      const result = await strategyQueries.findByUserId(123);
      
      expect(result).toEqual([mockTradingStrategy]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});