// Trading Test Fixtures
import type { TradingSignal, MarketData, Order } from '../../../shared/src/types';

// Mock Trading Signal Fixtures
export const mockBuySignal: TradingSignal = {
  id: 'signal_buy_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  type: 'buy',
  strength: 0.8,
  confidence: 0.85,
  entryPrice: 45000,
  stopLoss: 43000,
  takeProfit: 47000,
  strategy: 'momentum',
  timeframe: '1h',
  reasoning: ['RSI oversold', 'Volume spike', 'Bullish divergence'],
  metadata: {
    rsi: 65,
    macd: 0.5,
    bollinger: 'upper',
    volume: 'high',
    source: 'technical_analysis',
    backtestScore: 0.78,
    riskLevel: 'medium'
  },
  createdAt: '2024-01-01T10:00:00Z',
  expiresAt: '2024-01-01T11:00:00Z'
};

export const mockSellSignal: TradingSignal = {
  id: 'signal_sell_456',
  symbol: 'ETHUSDT',
  exchange: 'binance',
  type: 'sell',
  strength: 0.9,
  confidence: 0.92,
  entryPrice: 3200,
  stopLoss: 3300,
  takeProfit: 3100,
  strategy: 'reversal',
  timeframe: '4h',
  reasoning: ['RSI overbought', 'Bearish pattern', 'Volume confirmation'],
  metadata: {
    rsi: 75,
    macd: -0.3,
    bollinger: 'upper',
    volume: 'medium',
    source: 'pattern_recognition',
    backtestScore: 0.89,
    riskLevel: 'low'
  },
  createdAt: '2024-01-01T14:00:00Z',
  expiresAt: '2024-01-01T18:00:00Z'
};

export const mockHoldSignal: TradingSignal = {
  id: 'signal_hold_789',
  symbol: 'ADAUSDT',
  exchange: 'binance',
  type: 'hold',
  strength: 0.5,
  confidence: 0.65,
  entryPrice: 0.45,
  strategy: 'consolidation',
  timeframe: '1d',
  reasoning: ['Sideways movement', 'Low volume', 'Neutral indicators'],
  metadata: {
    rsi: 50,
    macd: 0.01,
    bollinger: 'middle',
    volume: 'low',
    source: 'market_analysis',
    backtestScore: 0.55,
    riskLevel: 'low'
  },
  createdAt: '2024-01-01T08:00:00Z',
  expiresAt: '2024-01-02T08:00:00Z'
};

// Mock Order Fixtures
export const mockMarketOrder: Order = {
  id: 'order_market_123',
  portfolioId: 'portfolio_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  type: 'market',
  side: 'buy',
  quantity: 0.1,
  status: 'filled',
  timeInForce: 'IOC',
  filledQuantity: 0.1,
  averageFillPrice: 45050,
  createdAt: '2024-01-01T10:05:00Z',
  updatedAt: '2024-01-01T10:05:30Z',
  filledAt: '2024-01-01T10:05:30Z'
};

export const mockLimitOrder: Order = {
  id: 'order_limit_456',
  portfolioId: 'portfolio_456',
  symbol: 'ETHUSDT',
  exchange: 'binance',
  type: 'limit',
  side: 'sell',
  quantity: 1,
  price: 3250,
  status: 'pending',
  timeInForce: 'GTC',
  filledQuantity: 0,
  averageFillPrice: 0,
  createdAt: '2024-01-01T14:05:00Z',
  updatedAt: '2024-01-01T14:05:00Z'
};

export const mockStopLossOrder: Order = {
  id: 'order_stop_789',
  portfolioId: 'portfolio_123',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  type: 'stop',
  side: 'sell',
  quantity: 0.1,
  price: 42000,
  stopPrice: 42500,
  status: 'pending',
  timeInForce: 'GTC',
  filledQuantity: 0,
  averageFillPrice: 0,
  createdAt: '2024-01-01T10:06:00Z',
  updatedAt: '2024-01-01T10:06:00Z'
};

// Mock Strategy Fixtures
export const mockMomentumStrategy = {
  id: 'strategy_momentum_1',
  name: 'Momentum Breakout',
  description: 'Identifies momentum breakouts using RSI and volume',
  type: 'momentum',
  timeframes: ['1h', '4h'],
  parameters: {
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    volumeThreshold: 1.5,
    confirmationCandles: 2
  },
  riskManagement: {
    maxPositionSize: 0.1,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.06,
    maxDailyLoss: 0.05
  },
  performance: {
    winRate: 0.65,
    avgReturn: 0.035,
    maxDrawdown: 0.08,
    sharpeRatio: 1.2,
    totalTrades: 150
  },
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

export const mockReversalStrategy = {
  id: 'strategy_reversal_1',
  name: 'Mean Reversion',
  description: 'Identifies overbought/oversold conditions for reversal trades',
  type: 'reversal',
  timeframes: ['4h', '1d'],
  parameters: {
    rsiPeriod: 21,
    rsiOverbought: 80,
    rsiOversold: 20,
    bollingerPeriod: 20,
    bollingerStdDev: 2
  },
  riskManagement: {
    maxPositionSize: 0.15,
    stopLossPercent: 0.03,
    takeProfitPercent: 0.04,
    maxDailyLoss: 0.06
  },
  performance: {
    winRate: 0.72,
    avgReturn: 0.028,
    maxDrawdown: 0.06,
    sharpeRatio: 1.5,
    totalTrades: 89
  },
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

// Mock Backtest Fixtures
export const mockBacktestResult = {
  id: 'backtest_123',
  strategyId: 'strategy_momentum_1',
  symbol: 'BTCUSDT',
  timeframe: '1h',
  startDate: new Date('2023-01-01T00:00:00Z'),
  endDate: new Date('2023-12-31T23:59:59Z'),
  initialCapital: 10000,
  finalCapital: 13500,
  totalReturn: 0.35,
  totalTrades: 245,
  winningTrades: 159,
  losingTrades: 86,
  winRate: 0.649,
  avgWin: 0.045,
  avgLoss: -0.025,
  maxDrawdown: 0.12,
  sharpeRatio: 1.8,
  sortinoRatio: 2.3,
  calmarRatio: 2.9,
  profitFactor: 2.1,
  trades: [
    {
      id: 'bt_trade_1',
      entryDate: new Date('2023-01-15T10:00:00Z'),
      exitDate: new Date('2023-01-15T14:00:00Z'),
      entryPrice: 21000,
      exitPrice: 21500,
      quantity: 0.1,
      side: 'long',
      pnl: 50,
      pnlPercent: 0.024,
      fees: 2.1,
      duration: 4 * 60 * 60 * 1000 // 4 hours in ms
    }
  ],
  equityCurve: [
    { date: new Date('2023-01-01T00:00:00Z'), equity: 10000 },
    { date: new Date('2023-01-15T14:00:00Z'), equity: 10047.9 },
    { date: new Date('2023-12-31T23:59:59Z'), equity: 13500 }
  ],
  createdAt: new Date('2024-01-01T00:00:00Z')
};

// Mock Portfolio Fixtures
export const mockPortfolio = {
  id: 'portfolio_123',
  userId: 'user_123',
  name: 'Main Portfolio',
  totalValue: 15000,
  availableBalance: 5000,
  positions: [
    {
      symbol: 'BTCUSDT',
      quantity: 0.2,
      avgPrice: 45000,
      currentPrice: 46000,
      marketValue: 9200,
      unrealizedPnl: 200,
      unrealizedPnlPercent: 0.022
    },
    {
      symbol: 'ETHUSDT',
      quantity: 2,
      avgPrice: 3200,
      currentPrice: 3100,
      marketValue: 6200,
      unrealizedPnl: -200,
      unrealizedPnlPercent: -0.031
    }
  ],
  performance: {
    totalReturn: 0.15,
    dailyReturn: 0.002,
    weeklyReturn: 0.012,
    monthlyReturn: 0.045,
    yearlyReturn: 0.15,
    maxDrawdown: 0.08,
    sharpeRatio: 1.4,
    volatility: 0.25
  },
  riskMetrics: {
    var95: 750, // Value at Risk 95%
    cvar95: 1200, // Conditional VaR 95%
    beta: 1.1,
    correlation: 0.85
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z')
};

// Mock Risk Management Fixtures
export const mockRiskLimits = {
  maxPositionSize: 0.1, // 10% of portfolio
  maxDailyLoss: 0.02, // 2% daily loss limit
  maxDrawdown: 0.15, // 15% max drawdown
  maxLeverage: 3,
  maxOpenPositions: 5,
  minCashReserve: 0.1, // 10% cash reserve
  correlationLimit: 0.7 // Max correlation between positions
};

export const mockRiskAlert = {
  id: 'risk_alert_123',
  userId: 'user_123',
  type: 'drawdown_warning',
  severity: 'medium',
  message: 'Portfolio drawdown approaching limit (12% of 15% max)',
  currentValue: 0.12,
  limitValue: 0.15,
  triggeredAt: new Date('2024-01-01T15:30:00Z'),
  acknowledged: false
};

// Mock Exchange Fixtures
export const mockExchangeConfig = {
  id: 'binance',
  name: 'Binance',
  apiUrl: 'https://api.binance.com',
  wsUrl: 'wss://stream.binance.com:9443',
  fees: {
    maker: 0.001,
    taker: 0.001
  },
  limits: {
    minOrderSize: 0.001,
    maxOrderSize: 1000,
    priceTickSize: 0.01,
    quantityStepSize: 0.001
  },
  supportedOrderTypes: ['market', 'limit', 'stop_loss', 'take_profit'],
  rateLimits: {
    requests: 1200,
    window: 60000, // 1 minute
    weight: 1200
  }
};

export const mockExchangeStatus = {
  exchangeId: 'binance',
  status: 'operational',
  lastPing: new Date('2024-01-01T12:00:00Z'),
  latency: 45, // milliseconds
  uptime: 0.9995,
  maintenanceScheduled: null,
  issues: []
};

// Helper Functions
export const createMockTradingSignal = (overrides: Partial<TradingSignal> = {}): TradingSignal => ({
  ...mockBuySignal,
  ...overrides
});

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  ...mockMarketOrder,
  ...overrides
});

export const createMockStrategy = (overrides: any = {}) => ({
  ...mockMomentumStrategy,
  ...overrides
});

export const createMockBacktest = (overrides: any = {}) => ({
  ...mockBacktestResult,
  ...overrides
});

export const createMockPortfolio = (overrides: any = {}) => ({
  ...mockPortfolio,
  ...overrides
});

// Trading Signal Arrays
export const mockTradingSignalsArray = [
  mockBuySignal,
  mockSellSignal,
  mockHoldSignal
];

export const mockOrdersArray = [
  mockMarketOrder,
  mockLimitOrder,
  mockStopLossOrder
];

export const mockStrategiesArray = [
  mockMomentumStrategy,
  mockReversalStrategy
];

// Trading Simulation Fixtures
export const mockTradingSession = {
  id: 'session_123',
  userId: 'user_123',
  startTime: new Date('2024-01-01T09:00:00Z'),
  endTime: new Date('2024-01-01T17:00:00Z'),
  initialBalance: 10000,
  finalBalance: 10250,
  totalTrades: 8,
  successfulTrades: 6,
  pnl: 250,
  pnlPercent: 0.025,
  maxDrawdown: 0.03,
  strategies: ['momentum', 'reversal'],
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']
};

export const mockMarketConditions = {
  trend: 'bullish' as const,
  volatility: 'medium' as const,
  volume: 'high' as const,
  sentiment: 'positive' as const,
  fearGreedIndex: 65,
  dominance: {
    btc: 0.52,
    eth: 0.18,
    others: 0.30
  },
  correlations: {
    'BTCUSDT-ETHUSDT': 0.85,
    'BTCUSDT-ADAUSDT': 0.72,
    'ETHUSDT-ADAUSDT': 0.68
  }
};