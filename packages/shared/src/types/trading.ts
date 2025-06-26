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
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageTradeReturn: number;
  trades: BacktestTrade[];
  equity: EquityPoint[];
  metrics: Record<string, number>;
  createdAt: string;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: string;
  exitTime: string;
  pnl: number;
  pnlPercent: number;
  fees: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'live' | 'paper' | 'backtest';
  exchange: string;
  baseCurrency: string;
  totalValue: number;
  availableBalance: number;
  lockedBalance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  performance: PortfolioPerformance;
  settings: PortfolioSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  exchange: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
  margin?: number;
  leverage?: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Trade {
  id: string;
  portfolioId: string;
  orderId: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  fee: number;
  feeCurrency: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  dailyReturnPercent: number;
  weeklyReturn: number;
  weeklyReturnPercent: number;
  monthlyReturn: number;
  monthlyReturnPercent: number;
  yearlyReturn: number;
  yearlyReturnPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  updatedAt: string;
}

export interface PortfolioSettings {
  riskManagement: {
    maxPositionSize: number; // Percentage of portfolio
    maxDailyLoss: number; // Percentage
    maxDrawdown: number; // Percentage
    stopLossDefault: number; // Percentage
    takeProfitDefault: number; // Percentage
  };
  trading: {
    allowShortSelling: boolean;
    allowLeverage: boolean;
    maxLeverage: number;
    defaultOrderType: 'market' | 'limit';
    defaultTimeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  };
  notifications: {
    orderFilled: boolean;
    positionOpened: boolean;
    positionClosed: boolean;
    stopLossTriggered: boolean;
    takeProfitTriggered: boolean;
    marginCall: boolean;
    dailyReport: boolean;
  };
  automation: {
    enableAutoTrading: boolean;
    enableSignalTrading: boolean;
    enableRiskManagement: boolean;
    enableRebalancing: boolean;
    rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'fundamental' | 'quantitative' | 'hybrid';
  timeframe: string;
  symbols: string[];
  exchanges: string[];
  parameters: Record<string, any>;
  rules: {
    entry: TradingRule[];
    exit: TradingRule[];
    riskManagement: TradingRule[];
  };
  performance: StrategyPerformance;
  isActive: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingRule {
  id: string;
  name: string;
  description: string;
  condition: string; // Expression or code
  action: string;
  priority: number;
  isEnabled: boolean;
  parameters?: Record<string, any>;
}

export interface StrategyPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  averageTradeReturn: number;
  volatility: number;
  beta?: number;
  alpha?: number;
  informationRatio?: number;
  calmarRatio?: number;
  updatedAt: string;
}

export interface RiskMetrics {
  portfolioId: string;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  cvar95: number; // Conditional Value at Risk 95%
  cvar99: number; // Conditional Value at Risk 99%
  beta: number;
  correlation: Record<string, number>;
  concentration: {
    byAsset: Record<string, number>;
    byExchange: Record<string, number>;
    byStrategy: Record<string, number>;
  };
  leverage: number;
  margin: number;
  liquidationRisk: number;
  timestamp: string;
}

export interface MarketMaker {
  id: string;
  portfolioId: string;
  symbol: string;
  exchange: string;
  isActive: boolean;
  spread: number; // Percentage
  orderSize: number;
  maxPosition: number;
  inventoryTarget: number;
  riskLimit: number;
  minProfitMargin: number;
  hedging: {
    enabled: boolean;
    exchange?: string;
    ratio: number;
  };
  performance: {
    totalVolume: number;
    totalTrades: number;
    totalProfit: number;
    averageSpread: number;
    fillRate: number;
    inventoryTurnover: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Arbitrage {
  id: string;
  type: 'spatial' | 'temporal' | 'triangular' | 'statistical';
  symbol: string;
  exchanges: string[];
  opportunity: {
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    spread: number;
    spreadPercent: number;
    volume: number;
    profit: number;
    profitPercent: number;
  };
  execution: {
    status: 'pending' | 'executing' | 'completed' | 'failed';
    buyOrderId?: string;
    sellOrderId?: string;
    actualProfit?: number;
    fees: number;
    slippage: number;
  };
  riskFactors: {
    transferTime: number; // seconds
    transferFee: number;
    priceImpact: number;
    liquidityRisk: number;
  };
  detectedAt: string;
  executedAt?: string;
  completedAt?: string;
}