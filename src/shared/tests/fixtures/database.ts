// Database test fixtures for Celebrum AI
// These provide realistic test data for D1 database testing

export const mockDbUser = {
  id: 'user-123',
  telegramId: 123456789,
  username: 'testuser',
  apiKeys: null,
  riskTolerance: 'medium' as const,
  tradingPreferences: JSON.stringify({
    autoTrade: false,
    maxConcurrentTrades: 3,
    maxLeverage: 2,
    percentagePerTrade: 5,
    riskTolerance: 'medium',
    stopLoss: 5,
    takeProfit: 10,
  }),
  notificationSettings: JSON.stringify({
    theme: 'dark',
    language: 'en',
    notifications: true,
    timezone: 'UTC',
  }),
  subscriptionTier: 'pro' as const,
  accountStatus: 'active' as const,
  emailVerificationStatus: 'verified' as const,
  createdAt: '2025-07-15 02:16:11',
  updatedAt: '2025-07-15 02:16:11',
  lastLoginAt: '2025-07-15 02:16:11',
  profileMetadata: JSON.stringify({
    maxDailyRequests: 1000,
    exchangeApis: 5,
    aiApis: 100,
  }),
};

export const mockDbUsernameHistory = {
  id: 1,
  userId: 1,
  telegramId: '123456789',
  username: 'testuser',
  changeSource: 'manual_correction' as const,
  changedAt: new Date('2025-07-15T02:16:11.156Z'),
};

export const mockDbPosition = {
  id: 'pos-123',
  userId: 'user-123',
  opportunityId: 'opp-123',
  exchange: 'binance',
  pair: 'BTC/USDT',
  side: 'Long' as const,
  size: 0.1,
  entryPrice: 45000,
  currentPrice: 45500,
  pnl: 50,
  status: 'Open' as const,
  createdAt: Math.floor(new Date('2025-07-15T02:16:11.156Z').getTime() / 1000),
  updatedAt: Math.floor(new Date('2025-07-15T02:16:11.156Z').getTime() / 1000),
  closedAt: null,
};

export const mockDbOpportunity = {
  id: 'opp-123',
  pair: 'BTC/USDT',
  longExchange: 'binance',
  shortExchange: 'coinbase',
  longRate: 45000,
  shortRate: 46000,
  rateDifference: 1000,
  netRateDifference: 950,
  potentialProfitValue: 95,
  timestamp: Math.floor(new Date('2025-07-15T02:16:11.156Z').getTime() / 1000),
  type: 'FundingRate',
  details: JSON.stringify({ confidence: 0.85 }),
  detectionTimestamp: Math.floor(new Date('2025-07-15T02:16:11.156Z').getTime() / 1000),
  expiryTimestamp: Math.floor(new Date('2025-07-15T03:16:11.156Z').getTime() / 1000),
  priorityScore: 8.5,
  maxParticipants: 10,
  currentParticipants: 0,
  distributionStrategy: 'fair_queue',
  source: 'SystemGenerated',
  sourceUserId: null,
  createdAt: Math.floor(new Date('2025-07-15T02:16:11.156Z').getTime() / 1000) * 1000,
};

export const mockDbTradingStrategy = {
  id: 1,
  userId: 1,
  name: 'Test Strategy',
  type: 'arbitrage' as const,
  isActive: true,
  settings: {},
  performance: {
    totalTrades: 10,
    winRate: 0.7,
    averageReturn: 15.5,
    maxDrawdown: 5.2,
    sharpeRatio: 1.2,
    lastUpdated: Date.now(),
  },
  createdAt: new Date('2025-07-15T02:16:11.156Z'),
  updatedAt: new Date('2025-07-15T02:16:11.156Z'),
};

// Factory functions for creating test data
export function createMockDbUser(overrides: Partial<typeof mockDbUser> = {}) {
  return {
    ...mockDbUser,
    ...overrides,
  };
}

export function createMockDbPosition(overrides: Partial<typeof mockDbPosition> = {}) {
  return {
    ...mockDbPosition,
    ...overrides,
  };
}

export function createMockDbOpportunity(overrides: Partial<typeof mockDbOpportunity> = {}) {
  return {
    ...mockDbOpportunity,
    ...overrides,
  };
}

export function createMockDbTradingStrategy(overrides: Partial<typeof mockDbTradingStrategy> = {}) {
  return {
    ...mockDbTradingStrategy,
    ...overrides,
  };
}

export function createMockDbUsernameHistory(overrides: Partial<typeof mockDbUsernameHistory> = {}) {
  return {
    ...mockDbUsernameHistory,
    ...overrides,
  };
}