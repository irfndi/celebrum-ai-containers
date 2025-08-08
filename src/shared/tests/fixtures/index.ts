/**
 * Test data fixtures for consistent testing across the application
 */

import type {
  MarketData,
  OrderBook,
  Trade,
  Candle,
  ExchangeInfo,
  MarketStats,
  TradingPair,
  Order,
  TradingSignal,
  BacktestResult,
  Portfolio,
  User,
  UserProfile,
  UserSubscription
} from '../../src/types';

import { getTestDb, createMockEnv, createMockD1Database, createMockKVNamespace, cleanupDb, createMockContext, createMockRequest, createMockUser, createMockResponse, createScenarioBasedTelegramApiMock } from '../utils/test-helpers';

// =============================================================================
// MARKET DATA FIXTURES
// =============================================================================

export const mockMarketData: MarketData = {
  symbol: 'BTCUSDT',
  exchange: 'binance',
  price: 45000,
  volume: 1234567890,
  timestamp: '2024-01-27T10:00:00.000Z',
  bid: 44999.99,
  ask: 45000.01,
  high24h: 46000,
  low24h: 44000,
  change24h: 1000,
  changePercent24h: 2.28
};

export const mockOrderBook: OrderBook = {
  symbol: 'BTCUSDT',
  exchange: 'binance',
  bids: [
    [44950, 1.5],
    [44940, 2.0],
    [44930, 0.8]
  ],
  asks: [
    [45050, 1.2],
    [45060, 1.8],
    [45070, 2.5]
  ],
  timestamp: '2024-01-27T10:00:00.000Z'
};

export const mockTrade: Trade = {
  id: 'trade_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  price: 45000,
  quantity: 0.1,
  side: 'buy',
  timestamp: '2024-01-27T10:00:00.000Z'
};

export const mockCandle: Candle = {
  symbol: 'BTCUSDT',
  exchange: 'binance',
  timestamp: '2024-01-27T10:00:00.000Z',
  open: 44800,
  high: 45200,
  low: 44700,
  close: 45000,
  volume: 123.45,
  interval: '1h'
};

export const mockExchangeInfo: ExchangeInfo = {
  id: 'binance',
  name: 'Binance',
  status: 'active',
  tradingFees: {
    maker: 0.001,
    taker: 0.001
  },
  withdrawalFees: {
    'BTC': 0.0005,
    'ETH': 0.005,
    'USDT': 1.0
  },
  minTradeAmounts: {
    'BTCUSDT': 0.00001,
    'ETHUSDT': 0.0001
  },
  maxTradeAmounts: {
    'BTCUSDT': 1000,
    'ETHUSDT': 10000
  },
  supportedPairs: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
  apiEndpoints: {
    rest: 'https://api.binance.com',
    websocket: 'wss://stream.binance.com:9443'
  },
  rateLimit: {
    requests: 1200,
    interval: 'minute'
  }
};

export const mockMarketStats: MarketStats = {
  symbol: 'BTCUSDT',
  exchange: 'binance',
  volume24h: 12345.67,
  volumeUsd24h: 555000000.00,
  trades24h: 98765,
  high24h: 46000,
  low24h: 44000,
  open24h: 44500,
  close24h: 45000,
  change24h: 500,
  changePercent24h: 1.12,
  vwap24h: 45250,
  marketCap: 850000000000,
  circulatingSupply: 19000000,
  totalSupply: 21000000,
  timestamp: '2024-01-27T10:00:00.000Z'
};

export const mockTradingPair: TradingPair = {
  symbol: 'BTCUSDT',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  exchange: 'binance',
  status: 'active',
  minQuantity: 0.00001,
  maxQuantity: 9000,
  stepSize: 0.00001,
  minPrice: 0.01,
  maxPrice: 1000000,
  tickSize: 0.01,
  minNotional: 10,
  tradingFees: {
    maker: 0.001,
    taker: 0.001
  }
};

// =============================================================================
// TRADING FIXTURES
// =============================================================================

export const mockOrder: Order = {
  id: 'order_123',
  portfolioId: 'portfolio_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  type: 'market',
  side: 'buy',
  quantity: 0.1,
  price: 45000,
  status: 'filled',
  filledQuantity: 0.1,
  averageFillPrice: 45000,
  timeInForce: 'GTC',
  createdAt: '2024-01-27T09:00:00.000Z',
  updatedAt: '2024-01-27T09:05:00.000Z'
};

export const mockTradingSignal: TradingSignal = {
  id: 'signal_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  type: 'buy',
  strength: 0.8,
  confidence: 0.92,
  entryPrice: 45000,
  stopLoss: 43000,
  takeProfit: 48000,
  timeframe: '1h',
  strategy: 'momentum_breakout',
  reasoning: ['Strong bullish momentum with RSI oversold', 'Volume spike detected'],
  metadata: {
    rsi: 35.2,
    volume_ratio: 2.1
  },
  createdAt: '2024-01-27T10:00:00.000Z',
  expiresAt: '2024-01-27T14:00:00.000Z'
};

export const mockBacktestResult: BacktestResult = {
  id: 'backtest_123',
  strategyId: 'strategy_123',
  symbol: 'BTCUSDT',
  timeframe: '1h',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z',
  initialCapital: 10000,
  finalCapital: 12500,
  totalReturn: 2500,
  totalReturnPercent: 25,
  annualizedReturn: 18.2,
  maxDrawdown: 850,
  maxDrawdownPercent: 8.5,
  sharpeRatio: 1.8,
  sortinoRatio: 2.12,
  winRate: 0.682,
  profitFactor: 1.8,
  totalTrades: 45,
  winningTrades: 31,
  losingTrades: 14,
  averageWin: 180,
  averageLoss: 95,
  largestWin: 850,
  largestLoss: 320,
  averageTradeReturn: 55.56,
  trades: [],
  equity: [],
  metrics: {
    calmar_ratio: 4.04,
    recovery_factor: 2.78
  },
  createdAt: '2024-01-27T10:00:00.000Z'
};

export const mockPortfolio: Portfolio = {
  id: 'portfolio_123',
  userId: '123',
  name: 'Main Portfolio',
  description: 'Primary trading portfolio',
  type: 'live',
  exchange: 'binance',
  baseCurrency: 'USDT',
  totalValue: 12500,
  availableBalance: 2500,
  lockedBalance: 0,
  unrealizedPnl: 150.50,
  realizedPnl: 2349.50,
  totalPnl: 2500,
  totalPnlPercent: 25,
  positions: [],
  orders: [],
  trades: [],
  performance: {
    totalReturn: 1500.50,
    totalReturnPercent: 15.5,
    dailyReturn: 50.25,
    dailyReturnPercent: 0.5,
    weeklyReturn: 350.75,
    weeklyReturnPercent: 3.5,
    monthlyReturn: 1500,
    monthlyReturnPercent: 12,
    yearlyReturn: 2500,
    yearlyReturnPercent: 25,
    maxDrawdown: 850,
    maxDrawdownPercent: 8.5,
    sharpeRatio: 1.8,
    sortinoRatio: 2.12,
    winRate: 0.75,
    profitFactor: 2.5,
    totalTrades: 100,
    winningTrades: 75,
    losingTrades: 25,
    averageWin: 120.50,
    averageLoss: -45.25,
    largestWin: 500.00,
    largestLoss: -200.00,
    updatedAt: '2024-01-27T10:00:00.000Z',
  },
  settings: {
    riskManagement: {
      maxPositionSize: 0.1,
      maxDailyLoss: 0.02,
      maxDrawdown: 0.15,
      stopLossDefault: 0.05,
      takeProfitDefault: 0.1,
    },
    trading: {
      allowShortSelling: true,
      allowLeverage: true,
      maxLeverage: 3.0,
      defaultOrderType: 'limit',
      defaultTimeInForce: 'GTC',
    },
    notifications: {
      orderFilled: true,
      positionOpened: true,
      positionClosed: true,
      stopLossTriggered: true,
      takeProfitTriggered: true,
      marginCall: true,
      dailyReport: false,
    },
    automation: {
      enableAutoTrading: false,
      enableSignalTrading: true,
      enableRiskManagement: true,
      enableRebalancing: false,
      rebalanceFrequency: 'weekly',
    },
  },
  createdAt: '2024-01-27T10:00:00.000Z',
  updatedAt: '2024-01-27T10:00:00.000Z'
};

// =============================================================================
// USER FIXTURES
// =============================================================================

export const mockUser: User = {
  id: 123,
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  languageCode: 'en',
  role: 'free',
  status: 'active',
  accountBalance: '1000.00',
  createdAt: new Date('2024-01-27T10:00:00.000Z'),
  updatedAt: new Date('2024-01-27T10:00:00.000Z')
};

export const mockUserProfile: UserProfile = {
  id: 'profile_123',
  userId: '123',
  displayName: 'Test User',
  bio: 'A test user profile',
  location: 'Test City',
  website: 'https://example.com',
  avatar: 'https://example.com/avatar.png',
  socialLinks: {
    twitter: '@testuser',
    linkedin: 'testuser'
  },
  stats: {
    totalReturn: 1500.50,
    totalReturnPercent: 15.5,
    winRate: 0.75,
    totalTrades: 100,
    followersCount: 50,
    followingCount: 25,
    strategiesCount: 5,
    portfoliosCount: 3
  },
  achievements: [],
  isPublic: true,
  isVerified: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

export const mockUserSubscription: UserSubscription = {
  id: 'sub_123',
  plan: 'pro',
  status: 'active',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2025-01-01T00:00:00.000Z',
  trialEndDate: undefined,
  features: ['advanced_analytics', 'priority_support'],
  limits: {
    portfolios: 10,
    strategies: 5,
    alerts: 100,
    apiCalls: 1000,
    dataRetention: 365
  },
  billing: {
    amount: 29.99,
    currency: 'USD',
    interval: 'monthly',
    nextBillingDate: '2024-02-01T00:00:00.000Z',
    paymentMethod: 'stripe'
  }
};

// =============================================================================
// DATA CREATION UTILITIES
// =============================================================================

export function createMockMarketData(overrides: Partial<MarketData> = {}): MarketData {
  return {
    ...mockMarketData,
    ...overrides
  };
}

export function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    ...mockOrder,
    ...overrides
  };
}

export function createMockTradingSignal(overrides: Partial<TradingSignal> = {}): TradingSignal {
  return {
    ...mockTradingSignal,
    ...overrides
  };
}

export function createMockPortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    ...mockPortfolio,
    ...overrides
  };
}

export function createMockUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...mockUserProfile,
    ...overrides
  };
}

export function createMockUserSubscription(overrides: Partial<UserSubscription> = {}): UserSubscription {
  return {
    ...mockUserSubscription,
    ...overrides
  };
}

export function createMockOrderBook(overrides: Partial<OrderBook> = {}): OrderBook {
  return {
    ...mockOrderBook,
    ...overrides
  };
}

export function createMockTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    ...mockTrade,
    ...overrides
  };
}

export function createMockCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    ...mockCandle,
    ...overrides
  };
}

export function createMockBacktestResult(overrides: Partial<BacktestResult> = {}): BacktestResult {
  return {
    ...mockBacktestResult,
    ...overrides
  };
}

// =============================================================================
// DATA GENERATION UTILITIES
// =============================================================================

// Generate arrays of mock data
export function generateMockMarketData(count: number): MarketData[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockMarketData,
    price: mockMarketData.price + i * 10 - 5,
    volume: mockMarketData.volume + i * 1000 - 500,
    timestamp: new Date(new Date(mockMarketData.timestamp).getTime() + i * 1000).toISOString()
  }));
}

export function generateMockOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockOrder,
    id: `order_${i}`,
    quantity: mockOrder.quantity + i * 0.01 - 0.005,
    price: (mockOrder.price || 45000) + i * 10 - 5,
    status: i % 3 === 0 ? 'filled' : (i % 3 === 1 ? 'partially_filled' : 'pending')
  }));
}

export function generateMockTradingSignals(count: number): TradingSignal[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTradingSignal,
    id: `signal_${i}`,
    strength: Math.random(),
    confidence: Math.random(),
    entryPrice: mockTradingSignal.entryPrice + i * 10 - 5
  }));
}

// Explicitly re-export all test helpers to ensure named exports are available
export {
  getTestDb,
  createMockEnv,
  createMockD1Database,
  createMockKVNamespace,
  cleanupDb,
  createMockContext,
  createMockRequest,
  createMockUser,
  createMockResponse,
  createScenarioBasedTelegramApiMock
} from '../utils/test-helpers';