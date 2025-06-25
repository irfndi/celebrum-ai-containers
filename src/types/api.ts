// API request/response types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // seconds
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

// Request types
export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initialBalance: number;
  currency: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
}

export interface CreateOrderRequest {
  portfolioId: string;
  symbol: string;
  exchange: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'DAY';
}

export interface CreateStrategyRequest {
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
  filters?: {
    minVolume?: number;
    maxSpread?: number;
    minLiquidity?: number;
    excludeSymbols?: string[];
    includeSymbols?: string[];
  };
}

export interface BacktestRequest {
  strategyId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  commission?: number;
  slippage?: number;
}

export interface MarketDataRequest {
  symbols: string[];
  exchanges?: string[];
  interval?: string;
  limit?: number;
  startTime?: string;
  endTime?: string;
}

export interface PriceAlertRequest {
  symbol: string;
  exchange?: string;
  condition: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  targetPrice: number;
  message?: string;
}

// Response types
export interface PortfolioResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  totalValue: number;
  availableBalance: number;
  currency: string;
  riskProfile: string;
  performance: {
    totalReturn: number;
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
  };
  positions: PositionResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PositionResponse {
  id: string;
  symbol: string;
  exchange: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  openTime: string;
  lastUpdated: string;
}

export interface OrderResponse {
  id: string;
  portfolioId: string;
  symbol: string;
  exchange: string;
  type: string;
  side: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: string;
  filledQuantity: number;
  averageFillPrice: number;
  timeInForce: string;
  createdAt: string;
  updatedAt: string;
  filledAt?: string;
  cancelledAt?: string;
}

export interface StrategyResponse {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: Record<string, any>;
  riskManagement: Record<string, any>;
  filters: Record<string, any>;
  isActive: boolean;
  performance?: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketDataResponse {
  symbol: string;
  exchange: string;
  price: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  bid?: number;
  ask?: number;
  timestamp: string;
}

export interface CandleDataResponse {
  symbol: string;
  exchange: string;
  interval: string;
  candles: {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface ArbitrageOpportunityResponse {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  volume: number;
  estimatedProfit: number;
  confidence: number;
  timestamp: string;
  expiresAt: string;
}

export interface AnalysisResponse {
  symbol: string;
  timeframe: string;
  trend: string;
  strength: number;
  signals: {
    buy: number;
    sell: number;
    hold: number;
  };
  indicators: Record<string, any>;
  support: number[];
  resistance: number[];
  timestamp: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface PriceUpdateMessage extends WebSocketMessage {
  type: 'price_update';
  data: {
    symbol: string;
    exchange: string;
    price: number;
    volume: number;
    timestamp: string;
  };
}

export interface OrderUpdateMessage extends WebSocketMessage {
  type: 'order_update';
  data: {
    orderId: string;
    status: string;
    filledQuantity: number;
    averageFillPrice: number;
    timestamp: string;
  };
}

export interface PositionUpdateMessage extends WebSocketMessage {
  type: 'position_update';
  data: {
    positionId: string;
    currentPrice: number;
    unrealizedPnL: number;
    timestamp: string;
  };
}

export interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  data: {
    alertId: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    timestamp: string;
  };
}