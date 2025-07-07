// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  UserQueries, 
  UserUsernameHistoryQueries, 
  PositionQueries, 
  OpportunityQueries, 
  TradingStrategyQueries,
  DatabaseQueries 
} from '../../src/utils/queries.js';
import type { Database } from '../../src/utils/connection.js';
import type { NewPosition, NewOpportunity, NewTradingStrategy } from '../../src/schema';
import { 
  mockDbUser, 
  mockDbUsernameHistory, 
  mockDbPosition, 
  createMockDbUser,
  createMockDbPosition,
  mockDbOpportunity,
  mockDbTradingStrategy,
} from '../../../shared/tests/fixtures/database.js';
import * as schema from '../../src/schema';
import { eq } from 'drizzle-orm';

// Additional mock objects for tests
const mockUser = mockDbUser;
const mockUserUsernameHistory = mockDbUsernameHistory;
const mockPosition = mockDbPosition;
const mockOpportunity = mockDbOpportunity;
const mockTradingStrategy = mockDbTradingStrategy;
const createMockUser = createMockDbUser;

// Mock database interface
const createMockDatabase = () => {
  const mockQueryBuilder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };
  
  const mockDb = {
    select: vi.fn().mockReturnValue(mockQueryBuilder),
    insert: vi.fn().mockReturnValue(mockQueryBuilder),
    update: vi.fn().mockReturnValue(mockQueryBuilder),
    delete: vi.fn().mockReturnValue(mockQueryBuilder),
  };
  
  // Store reference to mock query builder for easy access in tests
  (mockDb as any)._mockQueryBuilder = mockQueryBuilder;
  
  return mockDb as unknown as Database;
};

describe('UserQueries', () => {
  let userQueries: UserQueries;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    userQueries = new UserQueries(mockDb);
  });

  describe('findByTelegramId', () => {
    it('should find user by telegram ID', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([mockUser]);

      const result = await userQueries.findByTelegramId('123456789');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.telegramId, '123456789'));
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when user not found', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([]);

      const result = await userQueries.findByTelegramId('nonexistent');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.telegramId, 'nonexistent'));
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([mockUser]);

      const result = await userQueries.findById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.id, 1));
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const newUser = createMockUser({ telegramId: '987654321' });
      const expectedResult = { ...newUser, id: 2 };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await userQueries.create(newUser);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(newUser);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updates = { firstName: 'Updated' };
      const expectedResult = { ...mockUser, ...updates };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await userQueries.update(1, updates);

      expect(mockDb.update).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.id, 1));
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([{ id: 1 }]);

      const result = await userQueries.delete(1);

      expect(mockDb.delete).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.id, 1));
      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([]);

      const result = await userQueries.delete(1);

      expect(mockDb.delete).toHaveBeenCalledWith(schema.users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.users.id, 1));
      expect(result).toBe(false);
    });
  });
});

describe('UserUsernameHistoryQueries', () => {
  let historyQueries: UserUsernameHistoryQueries;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    historyQueries = new UserUsernameHistoryQueries(mockDb);
  });

  describe('findByTelegramId', () => {
    it('should find username history by telegram ID', async () => {
      const mockResult = [mockUserUsernameHistory];
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await historyQueries.findByTelegramId('123456789');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.userUsernameHistory);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.userUsernameHistory.telegramId, '123456789'));
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create a new username history record', async () => {
      const newHistory = { ...mockUserUsernameHistory, id: 2, username: 'newusername' };
      const expectedResult = { ...newHistory, id: 2 };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await historyQueries.create(newHistory);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.userUsernameHistory);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(newHistory);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('PositionQueries', () => {
  let positionQueries: PositionQueries;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    positionQueries = new PositionQueries(mockDb);
  });

  describe('findById', () => {
    it('should find position by ID', async () => {
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([mockPosition]);

      const result = await positionQueries.findById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.positions);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.positions.id, 1));
      expect(result).toEqual(mockPosition);
    });
  });

  describe('findByUserId', () => {
    it('should find positions by user ID', async () => {
      const mockResult = [mockPosition];
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await positionQueries.findByUserId(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.positions);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.positions.userId, 1));
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create a new position', async () => {
      const newPosition: NewPosition = createMockDbPosition({ symbol: 'ETH/USDT' });
      const expectedResult = { ...newPosition, id: 2, createdAt: new Date(), updatedAt: new Date(), closedAt: null };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await positionQueries.create(newPosition);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.positions);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(newPosition);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a position', async () => {
      const updates = { status: 'closed' as const };
      const expectedResult = { ...mockPosition, ...updates };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await positionQueries.update(1, updates);

      expect(mockDb.update).toHaveBeenCalledWith(schema.positions);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.positions.id, 1));
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('closePosition', () => {
    it('should close position with exit price and PnL', async () => {
      const exitPrice = 46000;
      const pnl = 1000;
      const expectedResult = { ...mockPosition, status: 'closed' as const, exitPrice, pnl };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await positionQueries.closePosition(1, exitPrice, pnl);

      expect(mockDb.update).toHaveBeenCalledWith(schema.positions);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ status: 'closed', exitPrice, pnl, closedAt: expect.any(Date) });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.positions.id, 1));
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('OpportunityQueries', () => {
  let opportunityQueries: OpportunityQueries;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    opportunityQueries = new OpportunityQueries(mockDb);
  });

  describe('findById', () => {
    it('should find an opportunity by ID', async () => {
      const mockResult = mockOpportunity;
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([mockResult]);

      const result = await opportunityQueries.findById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.opportunities);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.opportunities.id, 1));
      expect(result).toEqual(mockResult);
    });
  });

  describe('findActive', () => {
    it('should find active opportunities', async () => {
      const mockResult = [mockOpportunity];
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await opportunityQueries.findActive();

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.opportunities);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.opportunities.isActive, true));
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create a new opportunity', async () => {
      // @ts-expect-error TS2740 // allow partial NewOpportunity assignment in test
      const newOpportunity: NewOpportunity = { ...mockOpportunity, id: undefined, createdAt: undefined };
      const expectedResult = { ...newOpportunity, id: 2, createdAt: new Date() };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const { id, createdAt, ...rest } = newOpportunity;
      // @ts-expect-error TS2345 // allow casting rest to NewOpportunity
      const result = await opportunityQueries.create(rest as NewOpportunity);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.opportunities);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(rest);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an opportunity', async () => {
      const updates = { isActive: false };
      const expectedResult = { ...mockOpportunity, ...updates };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await opportunityQueries.deactivate(1);

      expect(mockDb.update).toHaveBeenCalledWith(schema.opportunities);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.opportunities.id, 1));
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});

describe('TradingStrategyQueries', () => {
  let strategyQueries: TradingStrategyQueries;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    strategyQueries = new TradingStrategyQueries(mockDb);
  });

  describe('findById', () => {
    it('should find a strategy by ID', async () => {
      const mockResult = mockTradingStrategy;
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([mockResult]);

      const result = await strategyQueries.findById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.tradingStrategies);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.tradingStrategies.id, 1));
      expect(result).toEqual(mockResult);
    });
  });

  describe('findByUserId', () => {
    it('should find strategies by user ID', async () => {
      const mockResult = [mockTradingStrategy];
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await strategyQueries.findByUserId(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(schema.tradingStrategies);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.tradingStrategies.userId, 1));
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create a new strategy', async () => {
      // @ts-expect-error TS2740 // allow partial NewTradingStrategy assignment in test
      const newStrategy: NewTradingStrategy = { ...mockTradingStrategy, id: undefined, createdAt: undefined, updatedAt: undefined };
      const expectedResult = { ...newStrategy, id: 2, createdAt: new Date(), updatedAt: new Date() };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const { id, createdAt, updatedAt, ...rest } = newStrategy;
      // @ts-expect-error TS2345 // allow casting rest to NewTradingStrategy
      const result = await strategyQueries.create(rest as NewTradingStrategy);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.tradingStrategies);
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(rest);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update a strategy', async () => {
      const updates = { isActive: false };
      const expectedResult = { ...mockTradingStrategy, ...updates };
      const mockQueryBuilder = (mockDb as any)._mockQueryBuilder;
      mockQueryBuilder.execute.mockResolvedValue([expectedResult]);

      const result = await strategyQueries.update(1, updates);

      expect(mockDb.update).toHaveBeenCalledWith(schema.tradingStrategies);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(eq(schema.tradingStrategies.id, 1));
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});