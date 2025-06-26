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
  maxTradeAmounts: Record<string, number>;
  supportedPairs: string[];
  apiEndpoints: {
    rest: string;
    websocket?: string;
  };
  rateLimit: {
    requests: number;
    interval: string; // 'second', 'minute', 'hour'
  };
}

export interface MarketStats {
  symbol: string;
  exchange: string;
  volume24h: number;
  volumeUsd24h: number;
  trades24h: number;
  high24h: number;
  low24h: number;
  open24h: number;
  close24h: number;
  change24h: number;
  changePercent24h: number;
  vwap24h: number; // Volume Weighted Average Price
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  timestamp: string;
}

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: string;
  status: 'active' | 'inactive' | 'delisted';
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  minNotional: number;
  tradingFees: {
    maker: number;
    taker: number;
  };
}

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  exchange: string;
  condition: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string;
  notificationMethod: 'telegram' | 'email' | 'webhook';
  metadata?: Record<string, any>;
}

export interface MarketIndicator {
  symbol: string;
  exchange: string;
  indicator: string; // 'RSI', 'MACD', 'SMA', 'EMA', etc.
  timeframe: string;
  value: number | Record<string, number>;
  signal?: 'buy' | 'sell' | 'neutral';
  timestamp: string;
  parameters: Record<string, any>;
}

export interface MarketSentiment {
  symbol: string;
  exchange?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  sources: {
    social: number;
    news: number;
    technical: number;
    onchain?: number;
  };
  timestamp: string;
  metadata?: {
    mentions: number;
    positiveRatio: number;
    negativeRatio: number;
    neutralRatio: number;
  };
}

export interface MarketEvent {
  id: string;
  type: 'listing' | 'delisting' | 'fork' | 'upgrade' | 'announcement' | 'partnership';
  symbol: string;
  exchange?: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
  scheduledAt?: string;
  occurredAt?: string;
  source: string;
  sourceUrl?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface LiquidityData {
  symbol: string;
  exchange: string;
  totalLiquidity: number;
  bidLiquidity: number;
  askLiquidity: number;
  spread: number;
  spreadPercent: number;
  depth: {
    bids: { price: number; quantity: number; total: number }[];
    asks: { price: number; quantity: number; total: number }[];
  };
  timestamp: string;
}