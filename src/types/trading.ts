// Trading and strategy related types

export interface Order {
  id: string;
  portfolioId: string;
  symbol: string;
  exchange: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  averageFillPrice: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  createdAt: string;
  updatedAt: string;
  filledAt?: string;
  cancelledAt?: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  exchange: string;
  type: 'buy' | 'sell' | 'hold';
  strength: number; // 0 to 1
  confidence: number; // 0 to 1
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  strategy: string;
  reasoning: string[];
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt: string;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  trades: BacktestTrade[];
  equity: EquityPoint[];
  createdAt: string;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  reason: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  type: 'arbitrage' | 'momentum' | 'mean_reversion' | 'breakout' | 'scalping';
  parameters: Record<string, any>;
  riskManagement: {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
  };
  filters: {
    minVolume?: number;
    maxSpread?: number;
    minLiquidity?: number;
    excludeSymbols?: string[];
    includeSymbols?: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceMetrics {
  portfolioId: string;
  period: string; // '1d', '7d', '30d', '1y', 'all'
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageHoldingPeriod: number;
  turnoverRate: number;
  timestamp: string;
}

export interface RiskMetrics {
  portfolioId: string;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  cvar95: number; // Conditional Value at Risk 95%
  beta: number;
  alpha: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  jensenAlpha: number;
  timestamp: string;
}

export interface TradingSession {
  id: string;
  userId: string;
  portfolioId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'stopped';
  strategies: string[]; // Strategy IDs
  performance: {
    startingBalance: number;
    currentBalance: number;
    pnl: number;
    pnlPercent: number;
    trades: number;
    wins: number;
    losses: number;
  };
  settings: {
    maxRiskPerTrade: number;
    maxDailyLoss: number;
    autoStop: boolean;
    notifications: boolean;
  };
}

export interface ExecutionReport {
  orderId: string;
  executionId: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  timestamp: string;
  liquidity: 'maker' | 'taker';
}

export interface SlippageAnalysis {
  symbol: string;
  exchange: string;
  expectedPrice: number;
  actualPrice: number;
  slippage: number;
  slippagePercent: number;
  marketImpact: number;
  orderSize: number;
  timestamp: string;
}

export interface LatencyMetrics {
  exchange: string;
  orderLatency: number; // ms
  marketDataLatency: number; // ms
  executionLatency: number; // ms
  timestamp: string;
}