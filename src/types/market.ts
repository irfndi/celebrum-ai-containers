// Market data and exchange related types

export interface MarketData {
  symbol: string;
  exchange: string;
  price: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  changePercent24h?: number;
}

export interface OrderBook {
  symbol: string;
  exchange: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: string;
}

export interface Trade {
  id: string;
  symbol: string;
  exchange: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface Candle {
  symbol: string;
  exchange: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: string; // '1m', '5m', '1h', '1d', etc.
}

export interface ExchangeInfo {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  tradingFees: {
    maker: number;
    taker: number;
  };
  withdrawalFees: Record<string, number>;
  minTradeAmounts: Record<string, number>;
  supportedSymbols: string[];
  apiLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}

export interface MarketSentiment {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  factors: {
    technical: number;
    fundamental: number;
    social: number;
    news: number;
  };
  timestamp: string;
}

export interface ArbitrageOpportunity {
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

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  exchange?: string;
  condition: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface MarketAnalysis {
  symbol: string;
  timeframe: string;
  trend: 'uptrend' | 'downtrend' | 'sideways';
  strength: number; // 0 to 1
  support: number[];
  resistance: number[];
  indicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    sma: Record<string, number>; // '20', '50', '200'
    ema: Record<string, number>; // '12', '26'
  };
  signals: {
    buy: number; // 0 to 1
    sell: number; // 0 to 1
    hold: number; // 0 to 1
  };
  timestamp: string;
}

export interface VolatilityData {
  symbol: string;
  period: string; // '1d', '7d', '30d'
  volatility: number;
  averageVolatility: number;
  percentile: number; // Current volatility percentile
  timestamp: string;
}

export interface LiquidityData {
  symbol: string;
  exchange: string;
  bidLiquidity: number;
  askLiquidity: number;
  spread: number;
  spreadPercent: number;
  depth: {
    bids1Percent: number; // Liquidity within 1% of mid price
    asks1Percent: number;
    bids5Percent: number; // Liquidity within 5% of mid price
    asks5Percent: number;
  };
  timestamp: string;
}