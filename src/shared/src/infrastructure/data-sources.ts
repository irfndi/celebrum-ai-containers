/**
 * Market data sources and data source management
 */

export interface MarketDataPoint {
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

export interface OrderBookData {
  symbol: string;
  exchange: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: string;
}

export interface TradeData {
  id: string;
  symbol: string;
  exchange: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface CandleData {
  symbol: string;
  exchange: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  trades?: number;
}

export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  endpoints: {
    ticker: string;
    orderbook: string;
    trades: string;
    candles: string;
    symbols: string;
  };
  websocket?: {
    url: string;
    channels: Record<string, string>;
  };
  isActive: boolean;
}

export abstract class MarketDataSource {
  protected config: DataSourceConfig;
  protected lastRequest: number = 0;
  protected requestCount: number = 0;
  protected windowStart: number = 0;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  protected canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart >= this.config.rateLimit.window) {
      this.windowStart = now;
      this.requestCount = 0;
    }

    return this.requestCount < this.config.rateLimit.requests;
  }

  /**
   * Record a request for rate limiting
   */
  protected recordRequest(): void {
    this.requestCount++;
    this.lastRequest = Date.now();
  }

  /**
   * Make an authenticated HTTP request
   */
  protected async makeRequest(endpoint: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.canMakeRequest()) {
      throw new Error(`Rate limit exceeded for ${this.config.name}`);
    }

    const url = new URL(endpoint, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if available
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    this.recordRequest();

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Abstract methods that must be implemented by concrete data sources
  abstract getTicker(symbol: string): Promise<MarketDataPoint>;
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
  abstract getTrades(symbol: string, limit?: number): Promise<TradeData[]>;
  abstract getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
  abstract getSymbols(): Promise<string[]>;
  abstract getName(): string;
}

/**
 * Binance data source implementation
 */
export class BinanceDataSource extends MarketDataSource {
  constructor(apiKey?: string) {
    super({
      name: 'Binance',
      baseUrl: 'https://api.binance.com',
      apiKey,
      rateLimit: {
        requests: 1200,
        window: 60000, // 1 minute
      },
      endpoints: {
        ticker: '/api/v3/ticker/24hr',
        orderbook: '/api/v3/depth',
        trades: '/api/v3/trades',
        candles: '/api/v3/klines',
        symbols: '/api/v3/exchangeInfo',
      },
      websocket: {
        url: 'wss://stream.binance.com:9443/ws',
        channels: {
          ticker: '@ticker',
          orderbook: '@depth',
          trades: '@trade',
        },
      },
      isActive: true,
    });
  }

  async getTicker(symbol: string): Promise<MarketDataPoint> {
    const data = await this.makeRequest(this.config.endpoints.ticker, { symbol }) as unknown;
    
    return {
      symbol: (data as any).symbol,
      exchange: 'binance',
      price: parseFloat((data as any).lastPrice),
      volume: parseFloat((data as any).volume),
      timestamp: new Date().toISOString(),
      bid: parseFloat((data as any).bidPrice),
      ask: parseFloat((data as any).askPrice),
      high24h: parseFloat((data as any).highPrice),
      low24h: parseFloat((data as any).lowPrice),
      change24h: parseFloat((data as any).priceChange),
      changePercent24h: parseFloat((data as any).priceChangePercent),
    };
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<OrderBookData> {
    const data = await this.makeRequest(this.config.endpoints.orderbook, { symbol, limit: depth }) as unknown;
    
    return {
      symbol,
      exchange: 'binance',
      bids: (data as any).bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: (data as any).asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 500): Promise<TradeData[]> {
    const data = await this.makeRequest(this.config.endpoints.trades, { symbol, limit });
    
    return (data as unknown[]).map((trade: unknown) => {
      const tradeObj = trade as { id: number; price: string; qty: string; isBuyerMaker: boolean; time: number };
      return {
        id: tradeObj.id.toString(),
        symbol,
        exchange: 'binance',
        price: parseFloat(tradeObj.price),
        quantity: parseFloat(tradeObj.qty),
        side: tradeObj.isBuyerMaker ? 'sell' : 'buy',
        timestamp: new Date(tradeObj.time).toISOString(),
      };
    });
  }

  async getCandles(symbol: string, interval: string, limit: number = 500): Promise<CandleData[]> {
    const data = await this.makeRequest(this.config.endpoints.candles, { symbol, interval, limit }) as unknown;
    
    return (data as any).map((candle: unknown[]) => ({
      symbol,
      exchange: 'binance',
      interval,
      open: parseFloat((candle as string[])[1]),
      high: parseFloat((candle as string[])[2]),
      low: parseFloat((candle as string[])[3]),
      close: parseFloat((candle as string[])[4]),
      volume: parseFloat((candle as string[])[5]),
      timestamp: new Date((candle as string[])[0]).toISOString(),
      trades: (candle as string[])[8],
    }));
  }

  async getSymbols(): Promise<string[]> {
    const data = await this.makeRequest(this.config.endpoints.symbols) as unknown;
    return (data as any).symbols
      .filter((symbol: unknown) => (symbol as { status: string }).status === 'TRADING')
      .map((symbol: unknown) => (symbol as { symbol: string }).symbol);
  }

  getName(): string {
    return 'Binance';
  }
}

/**
 * Coinbase data source implementation
 */
export class CoinbaseDataSource extends MarketDataSource {
  constructor(apiKey?: string, apiSecret?: string) {
    super({
      name: 'Coinbase',
      baseUrl: 'https://api.exchange.coinbase.com',
      apiKey,
      apiSecret,
      rateLimit: {
        requests: 10,
        window: 1000, // 1 second
      },
      endpoints: {
        ticker: '/products/{symbol}/ticker',
        orderbook: '/products/{symbol}/book',
        trades: '/products/{symbol}/trades',
        candles: '/products/{symbol}/candles',
        symbols: '/products',
      },
      websocket: {
        url: 'wss://ws-feed.exchange.coinbase.com',
        channels: {
          ticker: 'ticker',
          orderbook: 'level2',
          trades: 'matches',
        },
      },
      isActive: true,
    });
  }

  async getTicker(symbol: string): Promise<MarketDataPoint> {
    const endpoint = this.config.endpoints.ticker.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint) as unknown;
    
    return {
      symbol,
      exchange: 'coinbase',
      price: parseFloat((data as any).price),
      volume: parseFloat((data as any).volume),
      timestamp: (data as any).time,
      bid: parseFloat((data as any).bid),
      ask: parseFloat((data as any).ask),
    };
  }

  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBookData> {
    const endpoint = this.config.endpoints.orderbook.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint, { level: 2 }) as unknown;
    
    return {
      symbol,
      exchange: 'coinbase',
      bids: (data as any).bids.slice(0, depth).map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: (data as any).asks.slice(0, depth).map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 100): Promise<TradeData[]> {
    const endpoint = this.config.endpoints.trades.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint) as unknown;
    
    return (data as any).slice(0, limit).map((trade: unknown) => ({
      id: (trade as { trade_id: string }).trade_id.toString(),
      symbol,
      exchange: 'coinbase',
      price: parseFloat((trade as { price: string }).price),
      quantity: parseFloat((trade as { size: string }).size),
      side: (trade as { side: string }).side,
      timestamp: (trade as { time: string }).time,
    }));
  }

  async getCandles(symbol: string, interval: string, limit: number = 300): Promise<CandleData[]> {
    const endpoint = this.config.endpoints.candles.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint, { granularity: this.mapInterval(interval) }) as unknown;
    
    return (data as any).slice(0, limit).map((candle: number[]) => ({
      symbol,
      exchange: 'coinbase',
      interval,
      open: candle[3],
      high: candle[2],
      low: candle[1],
      close: candle[4],
      volume: candle[5],
      timestamp: new Date(candle[0] * 1000).toISOString(),
    }));
  }

  async getSymbols(): Promise<string[]> {
    const data = await this.makeRequest(this.config.endpoints.symbols) as unknown;
    return (data as any)
      .filter((product: unknown) => (product as { status: string }).status === 'online')
      .map((product: unknown) => (product as { id: string }).id);
  }

  getName(): string {
    return 'Coinbase';
  }

  private mapInterval(interval: string): number {
    const mapping: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return mapping[interval] || 3600;
  }
}

/**
 * Kraken data source implementation
 */
export class KrakenDataSource extends MarketDataSource {
  constructor(apiKey?: string, apiSecret?: string) {
    super({
      name: 'Kraken',
      baseUrl: 'https://api.kraken.com',
      apiKey,
      apiSecret,
      rateLimit: {
        requests: 1,
        window: 1000, // 1 second
      },
      endpoints: {
        ticker: '/0/public/Ticker',
        orderbook: '/0/public/Depth',
        trades: '/0/public/Trades',
        candles: '/0/public/OHLC',
        symbols: '/0/public/AssetPairs',
      },
      isActive: true,
    });
  }

  async getTicker(symbol: string): Promise<MarketDataPoint> {
    const data = await this.makeRequest(this.config.endpoints.ticker, { pair: symbol }) as unknown;
    const tickerData = (data as any).result[symbol];
    
    return {
      symbol,
      exchange: 'kraken',
      price: parseFloat(tickerData.c[0]),
      volume: parseFloat(tickerData.v[1]),
      timestamp: new Date().toISOString(),
      bid: parseFloat(tickerData.b[0]),
      ask: parseFloat(tickerData.a[0]),
      high24h: parseFloat(tickerData.h[1]),
      low24h: parseFloat(tickerData.l[1]),
    };
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<OrderBookData> {
    const data = await this.makeRequest(this.config.endpoints.orderbook, { pair: symbol, count: depth }) as unknown;
    const bookData = (data as any).result[symbol];
    
    return {
      symbol,
      exchange: 'kraken',
      bids: bookData.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: bookData.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 1000): Promise<TradeData[]> {
    const data = await this.makeRequest(this.config.endpoints.trades, { pair: symbol }) as unknown;
    const trades = (data as any).result[symbol];
    
    return trades.slice(0, limit).map((trade: unknown[], index: number) => ({
      id: `${symbol}-${index}`,
      symbol,
      exchange: 'kraken',
      price: parseFloat((trade as unknown as string[])[0]),
      quantity: parseFloat((trade as unknown as string[])[1]),
      side: (trade as unknown as string[])[3] === 'b' ? 'buy' : 'sell',
      timestamp: new Date(parseFloat((trade as unknown as string[])[2]) * 1000).toISOString(),
    }));
  }

  async getCandles(symbol: string, interval: string, limit: number = 720): Promise<CandleData[]> {
    const data = await this.makeRequest(this.config.endpoints.candles, { 
      pair: symbol, 
      interval: this.mapInterval(interval) 
    }) as unknown;
    const candles = (data as any).result[symbol];
    
    return candles.slice(0, limit).map((candle: number[]) => ({
      symbol,
      exchange: 'kraken',
      interval,
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[6],
      timestamp: new Date(candle[0] * 1000).toISOString(),
      trades: candle[7],
    }));
  }

  async getSymbols(): Promise<string[]> {
    const data = await this.makeRequest(this.config.endpoints.symbols) as unknown;
    return Object.keys((data as any).result);
  }

  getName(): string {
    return 'Kraken';
  }

  private mapInterval(interval: string): number {
    const mapping: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };
    return mapping[interval] || 60;
  }
}

/**
 * Data source manager for handling multiple market data sources
 */
export class DataSourceManager {
  private sources: Map<string, MarketDataSource> = new Map();
  private primarySource: string = 'binance';
  private fallbackSources: string[] = ['coinbase', 'kraken'];

  constructor() {
    // Initialize default data sources
    this.addSource('binance', new BinanceDataSource());
    this.addSource('coinbase', new CoinbaseDataSource());
    this.addSource('kraken', new KrakenDataSource());
  }

  /**
   * Add a data source
   */
  addSource(name: string, source: MarketDataSource): void {
    this.sources.set(name, source);
  }

  /**
   * Remove a data source
   */
  removeSource(name: string): boolean {
    return this.sources.delete(name);
  }

  /**
   * Get data with automatic fallback
   */
  async getTicker(symbol: string, exchange?: string): Promise<MarketDataPoint> {
    const sourceName = exchange || this.primarySource;
    const source = this.sources.get(sourceName);
    
    if (source) {
      try {
        return await source.getTicker(symbol);
      } catch (error) {
        console.warn(`Failed to get ticker from ${sourceName}:`, error);
      }
    }

    // Try fallback sources
    for (const fallbackName of this.fallbackSources) {
      if (fallbackName === sourceName) continue;
      
      const fallbackSource = this.sources.get(fallbackName);
      if (fallbackSource) {
        try {
          return await fallbackSource.getTicker(symbol);
        } catch (error) {
          console.warn(`Failed to get ticker from fallback ${fallbackName}:`, error);
        }
      }
    }

    throw new Error(`Failed to get ticker for ${symbol} from all sources`);
  }

  /**
   * Get available data sources
   */
  getAvailableSources(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Set primary data source
   */
  setPrimarySource(name: string): boolean {
    if (this.sources.has(name)) {
      this.primarySource = name;
      return true;
    }
    return false;
  }

  /**
   * Get data source by name
   */
  getSource(name: string): MarketDataSource | undefined {
    return this.sources.get(name);
  }
}

// Export singleton instance
export const dataSourceManager = new DataSourceManager();