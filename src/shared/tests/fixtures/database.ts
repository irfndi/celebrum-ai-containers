/**
 * Database-specific test fixtures for testing database operations
 * These fixtures match the actual database schema structure
 */

import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { users, positions, userUsernameHistory, invitationCodes, opportunities, tradingStrategies } from '@celebrum-ai/db/schema';
import type { NewUser, NewPosition, NewOpportunity, NewTradingStrategy } from '@celebrum-ai/db/schema';
import type { NewUserUsernameHistory } from '@celebrum-ai/db/schema/user-username-history';
import type { NewInvitationCode } from '@celebrum-ai/db/schema/invitations';

// Database User Fixtures (matching the actual schema)
export const mockDbUser: InferSelectModel<typeof users> = {
  id: 1,
  telegramId: '123456789',
  firstName: 'John',
  lastName: 'Doe',
  username: 'testuser',
  languageCode: 'en',
  email: 'test@example.com',
  role: 'pro',
  status: 'active',
  lastActiveAt: new Date(),
  settings: {
    notifications: true,
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  },
  apiLimits: {
    exchangeApis: 5,
    aiApis: 100,
    maxDailyRequests: 1000
  },
  accountBalance: '1000.00',
  betaExpiresAt: null,
  tradingPreferences: {
    percentagePerTrade: 5,
    maxConcurrentTrades: 3,
    maxLeverage: 2,
    stopLoss: 5,
    takeProfit: 10,
    riskTolerance: 'medium',
    autoTrade: false
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDbUserFree: InferSelectModel<typeof users> = {
  id: 2,
  telegramId: '987654321',
  firstName: 'Jane',
  lastName: 'Smith',
  username: 'freeuser',
  languageCode: 'en',
  email: 'free@example.com',
  role: 'free',
  status: 'active',
  lastActiveAt: new Date(),
  settings: {
    notifications: false,
    theme: 'light',
    language: 'en',
    timezone: 'UTC'
  },
  apiLimits: {
    exchangeApis: 1,
    aiApis: 10,
    maxDailyRequests: 100
  },
  accountBalance: '0.00',
  betaExpiresAt: null,
  tradingPreferences: {
    percentagePerTrade: 2,
    maxConcurrentTrades: 1,
    maxLeverage: 1,
    stopLoss: 10,
    takeProfit: 5,
    riskTolerance: 'low',
    autoTrade: false
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDbUserAdmin: InferSelectModel<typeof users> = {
  id: 3,
  telegramId: '111222333',
  firstName: 'Admin',
  lastName: 'User',
  username: 'admin',
  languageCode: 'en',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  lastActiveAt: new Date(),
  settings: {
    notifications: true,
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  },
  apiLimits: {
    exchangeApis: 999,
    aiApis: 999,
    maxDailyRequests: 999999
  },
  accountBalance: '0.00',
  betaExpiresAt: null,
  tradingPreferences: {
    percentagePerTrade: 10,
    maxConcurrentTrades: 10,
    maxLeverage: 5,
    stopLoss: 3,
    takeProfit: 15,
    riskTolerance: 'high',
    autoTrade: true
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Database Position Fixtures
export const mockDbPosition: InferSelectModel<typeof positions> = {
  id: 1,
  userId: 1,
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  type: 'long',
  strategy: 'arbitrage',
  entryPrice: 45000.00,
  exitPrice: null,
  quantity: 0.1,
  leverage: 1,
  stopLoss: 43000.00,
  takeProfit: 47000.00,
  status: 'open',
  pnl: 0,
  fees: 4.50,
  metadata: {
    fundingRate: 0.0001,
    correlatedPositions: [],
    riskScore: 0.3,
    autoClose: false
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
};

export const mockDbPositionClosed: InferSelectModel<typeof positions> = {
  id: 2,
  userId: 1,
  exchangeId: 'binance',
  symbol: 'ETH/USDT',
  type: 'long',
  strategy: 'technical',
  entryPrice: 2500.00,
  exitPrice: 2600.00,
  quantity: 1.0,
  leverage: 2,
  stopLoss: 2400.00,
  takeProfit: 2700.00,
  status: 'closed',
  pnl: 100.00,
  fees: 10.00,
  metadata: {
    fundingRate: 0.0002,
    correlatedPositions: [],
    riskScore: 0.5,
    autoClose: true
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: new Date(),
};

export const mockDbPositionShort: InferSelectModel<typeof positions> = {
  id: 3,
  userId: 1,
  exchangeId: 'bybit',
  symbol: 'BTC/USDT',
  type: 'short',
  strategy: 'manual',
  entryPrice: 46000.00,
  exitPrice: null,
  quantity: 0.05,
  leverage: 3,
  stopLoss: 47000.00,
  takeProfit: 44000.00,
  status: 'open',
  pnl: -50.00,
  fees: 6.90,
  metadata: {
    fundingRate: -0.0001,
    correlatedPositions: ['pos_123'],
    riskScore: 0.7,
    autoClose: false
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
};

// Database Username History Fixtures
export const mockDbUsernameHistory: InferSelectModel<typeof userUsernameHistory> = {
  id: 1,
  userId: 1,
  telegramId: '123456789',
  username: 'testuser',
  changeSource: 'manual_correction',
  changedAt: new Date(),
};

// Database Invitation Fixtures
export const mockDbInvitation: InferSelectModel<typeof invitationCodes> = {
  code: 'INVITE123',
  createdBy: 'admin',
  maxUses: 10,
  currentUses: 3,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  isActive: true,
  purpose: 'referral_program',
  createdAt: new Date(),
};

export const mockDbInvitationUsed: InferSelectModel<typeof invitationCodes> = {
  code: 'USED123',
  createdBy: 'user_123',
  maxUses: 1,
  currentUses: 1,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  isActive: false,
  purpose: 'direct_invite',
  createdAt: new Date(),
};

// Database Opportunity Fixtures
export const mockDbOpportunity: InferSelectModel<typeof opportunities> = {
  id: 1,
  symbol: 'BTC/USDT',
  type: 'arbitrage',
  exchange1: 'binance',
  exchange2: 'coinbase',
  price1: 45000,
  price2: 46000,
  profitPercentage: 2.2,
  confidence: 0.85,
  isActive: true,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 3600000),
};

// Database Trading Strategy Fixtures
export const mockDbTradingStrategy: InferSelectModel<typeof tradingStrategies> = {
  id: 1,
  userId: 1,
  name: 'Test Strategy',
  type: 'arbitrage',
  settings: {},
  isActive: true,
  performance: {
    totalTrades: 10,
    winRate: 0.7,
    averageReturn: 15.5,
    maxDrawdown: 5.2,
    sharpeRatio: 1.2,
    lastUpdated: Date.now(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper functions for creating database test data
export const createMockDbUser = (overrides: Partial<InferInsertModel<typeof users>> = {}) => ({
  ...mockDbUser,
  ...overrides
});

export const createMockDbPosition = (overrides: Partial<InferInsertModel<typeof positions>> = {}) => ({
  ...mockDbPosition,
  ...overrides
});

export const createMockDbInvitation = (overrides: Partial<InferInsertModel<typeof invitationCodes>> = {}) => ({
  ...mockDbInvitation,
  ...overrides
});

// Arrays of database fixtures for testing multiple records
export const mockDbUsersArray = [
  mockDbUser,
  mockDbUserFree,
  mockDbUserAdmin
];

export const mockDbPositionsArray = [
  mockDbPosition,
  mockDbPositionClosed,
  mockDbPositionShort
];

// Test data generators for database records
export const generateMockDbUsers = (count: number): NewUser[] => {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    users.push({
      telegramId: `${100000000 + i}`,
      firstName: `User${i}`,
      lastName: `Test${i}`,
      username: `user${i}`,
      languageCode: 'en',
      email: `user${i}@example.com`,
      role: (i % 3 === 0 ? 'pro' : 'free') as 'free' | 'pro' | 'ultra' | 'admin' | 'superadmin',
      status: 'active' as 'active' | 'suspended' | 'banned',
      settings: {
          notifications: i % 2 === 0,
          theme: (i % 2 === 0 ? 'dark' : 'light') as 'light' | 'dark',
          language: 'en',
          timezone: 'UTC'
        },
      apiLimits: {
        exchangeApis: i % 3 === 0 ? 5 : 1,
        aiApis: i % 3 === 0 ? 100 : 10,
        maxDailyRequests: i % 3 === 0 ? 1000 : 100
      },
      accountBalance: `${(i * 100).toFixed(2)}`,
      tradingPreferences: {
        percentagePerTrade: 2 + (i % 8),
        maxConcurrentTrades: 1 + (i % 5),
        maxLeverage: 1 + (i % 3),
        stopLoss: 3 + (i % 7),
        takeProfit: 5 + (i % 10),
        riskTolerance: (['low', 'medium', 'high'] as const)[i % 3],
        autoTrade: i % 4 === 0
      }
    });
  }
  
  return users;
};

export const generateMockDbPositions = (userId: number, count: number): NewPosition[] => {
  const positions = [];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
  const exchanges = ['binance', 'bybit', 'okx'];
  const strategies = ['arbitrage', 'technical', 'manual'] as const;
  const types = ['long', 'short'] as const;
  const statuses = ['open', 'closed', 'partially_filled'] as const;
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 350;
    const entryPrice = basePrice * (0.95 + Math.random() * 0.1); // ±5% variation
    
    positions.push({
      userId,
      exchangeId: exchanges[i % exchanges.length],
      symbol,
      type: types[i % types.length],
      strategy: strategies[i % strategies.length],
      entryPrice,
      exitPrice: i % 3 === 0 ? entryPrice * (0.98 + Math.random() * 0.04) : undefined,
      quantity: Math.random() * 2,
      leverage: 1 + Math.floor(Math.random() * 5),
      stopLoss: entryPrice * 0.95,
      takeProfit: entryPrice * 1.1,
      status: statuses[i % statuses.length],
      pnl: (Math.random() - 0.5) * 200,
      fees: Math.random() * 20,
      metadata: {
        fundingRate: (Math.random() - 0.5) * 0.001,
        correlatedPositions: [],
        riskScore: Math.random(),
        autoClose: Math.random() > 0.5
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    });
  }
  
  return positions;
};