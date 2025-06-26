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
  protected async makeRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
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
    const data = await this.makeRequest(this.config.endpoints.ticker, { symbol });
    
    return {
      symbol: data.symbol,
      exchange: 'binance',
      price: parseFloat(data.lastPrice),
      volume: parseFloat(data.volume),
      timestamp: new Date().toISOString(),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
    };
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<OrderBookData> {
    const data = await this.makeRequest(this.config.endpoints.orderbook, { symbol, limit: depth });
    
    return {
      symbol,
      exchange: 'binance',
      bids: data.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 500): Promise<TradeData[]> {
    const data = await this.makeRequest(this.config.endpoints.trades, { symbol, limit });
    
    return data.map((trade: any) => ({
      id: trade.id.toString(),
      symbol,
      exchange: 'binance',
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      side: trade.isBuyerMaker ? 'sell' : 'buy',
      timestamp: new Date(trade.time).toISOString(),
    }));
  }

  async getCandles(symbol: string, interval: string, limit: number = 500): Promise<CandleData[]> {
    const data = await this.makeRequest(this.config.endpoints.candles, { symbol, interval, limit });
    
    return data.map((candle: any[]) => ({
      symbol,
      exchange: 'binance',
      interval,
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      timestamp: new Date(candle[0]).toISOString(),
      trades: candle[8],
    }));
  }

  async getSymbols(): Promise<string[]> {
    const data = await this.makeRequest(this.config.endpoints.symbols);
    return data.symbols
      .filter((symbol: any) => symbol.status === 'TRADING')
      .map((symbol: any) => symbol.symbol);
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
    const data = await this.makeRequest(endpoint);
    
    return {
      symbol,
      exchange: 'coinbase',
      price: parseFloat(data.price),
      volume: parseFloat(data.volume),
      timestamp: data.time,
      bid: parseFloat(data.bid),
      ask: parseFloat(data.ask),
    };
  }

  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBookData> {
    const endpoint = this.config.endpoints.orderbook.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint, { level: 2 });
    
    return {
      symbol,
      exchange: 'coinbase',
      bids: data.bids.slice(0, depth).map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: data.asks.slice(0, depth).map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 100): Promise<TradeData[]> {
    const endpoint = this.config.endpoints.trades.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint);
    
    return data.slice(0, limit).map((trade: any) => ({
      id: trade.trade_id.toString(),
      symbol,
      exchange: 'coinbase',
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.size),
      side: trade.side,
      timestamp: trade.time,
    }));
  }

  async getCandles(symbol: string, interval: string, limit: number = 300): Promise<CandleData[]> {
    const endpoint = this.config.endpoints.candles.replace('{symbol}', symbol);
    const data = await this.makeRequest(endpoint, { granularity: this.mapInterval(interval) });
    
    return data.slice(0, limit).map((candle: number[]) => ({
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
    const data = await this.makeRequest(this.config.endpoints.symbols);
    return data
      .filter((product: any) => product.status === 'online')
      .map((product: any) => product.id);
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
    const data = await this.makeRequest(this.config.endpoints.ticker, { pair: symbol });
    const tickerData = data.result[symbol];
    
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
    const data = await this.makeRequest(this.config.endpoints.orderbook, { pair: symbol, count: depth });
    const bookData = data.result[symbol];
    
    return {
      symbol,
      exchange: 'kraken',
      bids: bookData.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: bookData.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString(),
    };
  }

  async getTrades(symbol: string, limit: number = 1000): Promise<TradeData[]> {
    const data = await this.makeRequest(this.config.endpoints.trades, { pair: symbol });
    const trades = data.result[symbol];
    
    return trades.slice(0, limit).map((trade: any[], index: number) => ({
      id: `${symbol}-${index}`,
      symbol,
      exchange: 'kraken',
      price: parseFloat(trade[0]),
      quantity: parseFloat(trade[1]),
      side: trade[3] === 'b' ? 'buy' : 'sell',
      timestamp: new Date(trade[2] * 1000).toISOString(),
    }));
  }

  async getCandles(symbol: string, interval: string, limit: number = 720): Promise<CandleData[]> {
    const data = await this.makeRequest(this.config.endpoints.candles, { 
      pair: symbol, 
      interval: this.mapInterval(interval) 
    });
    const candles = data.result[symbol];
    
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
    const data = await this.makeRequest(this.config.endpoints.symbols);
    return Object.keys(data.result);
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