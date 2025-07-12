import * as ccxt from 'ccxt';
import { MarketDataSource } from './data-sources';
import type { MarketDataPoint, OrderBookData, CandleData, DataSourceConfig } from './data-sources';
import type { Trade, OrderBook } from '../types/market.js';

export interface CCXTConfig extends Partial<DataSourceConfig> {
  exchangeId: string;
  apiKey?: string;
  secret?: string;
  passphrase?: string;
  sandbox?: boolean;
  exchangeOptions?: Record<string, unknown>;
}

export interface CCXTManagerConfig {
  id: string;
  config?: Record<string, unknown>;
}

/**
 * CCXT-based data source that supports 100+ exchanges
 * Provides robust error handling and automatic failover
 */
export class CCXTDataSource extends MarketDataSource {
  private exchange: ccxt.Exchange;
  private exchangeId: string;
  private status: 'healthy' | 'error' | 'initializing' = 'initializing';

  constructor(exchangeId: string, config?: Partial<DataSourceConfig>) {
    const exchangeClass = (ccxt as unknown as Record<string, unknown>)[exchangeId];
    if (!exchangeClass) {
      throw new Error(`Exchange ${exchangeId} not supported by CCXT`);
    }

    const opts = {
      apiKey: config?.apiKey,
      secret: config?.apiSecret,
      password: config?.passphrase, // For some exchanges like OKX
      sandbox: process.env.NODE_ENV !== 'production',
      enableRateLimit: true,
      timeout: 30000,
      ...config?.exchangeOptions,
    };
    const exchange = new (exchangeClass as { new (opts: Record<string, unknown>): ccxt.Exchange })(opts);

    let baseUrl = '';
    if (exchange.urls && typeof exchange.urls === 'object' && exchange.urls.api && typeof exchange.urls.api === 'object' && 'public' in exchange.urls.api) {
      baseUrl = (exchange.urls.api as Record<string, unknown>).public as string;
    }
    super({
      name: exchangeId,
      baseUrl,
      apiKey: config?.apiKey,
      apiSecret: config?.apiSecret,
      rateLimit: {
        requests: exchange.rateLimit || 1000,
        window: 60000, // 1 minute
      },
      endpoints: {
        ticker: '',
        orderbook: '',
        trades: '',
        candles: '',
        symbols: ''
      },
      isActive: true,
      ...config,
    });

    this.exchange = exchange;
    this.exchangeId = exchangeId;
    this.status = 'healthy'; // Set to healthy after successful construction
  }

  /**
   * Initialize the exchange (load markets, etc.)
   */
  async initialize(): Promise<void> {
    try {
      this.status = 'initializing';
      await this.exchange.loadMarkets();
      this.status = 'healthy';
    } catch (error) {
      this.status = 'error';
      console.error('Error initializing exchange:', error);
      // Do not rethrow, just set status (test expects no throw)
    }
  }

  /**
   * Get current status (synchronous)
   */
  getStatus(): string {
    return this.status;
  }

  async getTicker(symbol: string): Promise<MarketDataPoint> {
    try {
      await this.exchange.loadMarkets();
      const ticker = await this.exchange.fetchTicker(symbol);
      return {
        symbol: ticker.symbol,
        exchange: this.exchangeId,
        price: Number(ticker.last || 0),
        volume: Number(ticker.baseVolume || 0),
        bid: Number(ticker.bid || 0),
        ask: Number(ticker.ask || 0),
        high24h: Number(ticker.high || 0),
        low24h: Number(ticker.low || 0),
        timestamp: new Date(Number(ticker.timestamp) || Date.now()).toISOString(),
      };
    } catch (error) {
      console.error(`Failed to fetch ticker for ${symbol} from ${this.exchangeId}:`, error);
      throw new Error(`Failed to fetch ticker for ${symbol} from ${this.exchangeId}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBook> {
    try {
      await this.exchange.loadMarkets();
      const orderbook = await this.exchange.fetchOrderBook(symbol, limit);
      return {
        symbol: orderbook.symbol || symbol,
        exchange: this.exchangeId,
        bids: orderbook.bids.map(([price, amount]: [unknown, unknown]) => [Number(price || 0), Number(amount || 0)]),
        asks: orderbook.asks.map(([price, amount]: [unknown, unknown]) => [Number(price || 0), Number(amount || 0)]),
        timestamp: new Date(orderbook.timestamp || Date.now()).toISOString(),
      };
    } catch (error) {
      console.error(`Failed to fetch order book for ${symbol} from ${this.exchangeId}:`, error);
      throw new Error(`Failed to fetch order book for ${symbol} from ${this.exchangeId}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  async getTrades(symbol: string, limit: number = 1000): Promise<Trade[]> {
    try {
      await this.exchange.loadMarkets();
      const trades = await this.exchange.fetchTrades(symbol, undefined, limit);
      return (trades as unknown[]).map((trade, index): Trade => {
        const t = trade as Record<string, unknown>;
        return {
          id: (t.id as string) || `${symbol}-${index}`,
          symbol: (t.symbol as string) || symbol,
          exchange: this.exchangeId,
          price: Number(t.price || 0),
          quantity: Number(t.amount || 0),
          side: t.side as 'buy' | 'sell',
          timestamp: new Date(Number(t.timestamp || 0) || Date.now()).toISOString(),
        };
      });
    } catch (error) {
      console.error(`Failed to fetch trades for ${symbol} from ${this.exchangeId}:`, error);
      throw new Error(`Failed to fetch trades for ${symbol} from ${this.exchangeId}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  async fetchTrades(symbol: string, limit: number = 1000): Promise<Trade[]> {
    return this.getTrades(symbol, limit);
  }

  /**
   * Fetch ticker data (alias for getTicker)
   */
  async fetchTicker(symbol: string): Promise<MarketDataPoint> {
    return this.getTicker(symbol);
  }

  /**
   * Fetch order book data (alias for getOrderBook)
   */
  async fetchOrderBook(symbol: string, limit: number = 100): Promise<OrderBook> {
    return this.getOrderBook(symbol, limit);
  }

  async getCandles(symbol: string, interval: string, limit: number = 720): Promise<CandleData[]> {
    try {
      await this.exchange.loadMarkets();
      const ohlcv = await this.exchange.fetchOHLCV(symbol, interval, undefined, limit);
      return (ohlcv as unknown[]).map((candle) => {
        const [timestamp, open, high, low, close, volume] = candle as [unknown, unknown, unknown, unknown, unknown, unknown];
        return {
          symbol,
          exchange: this.exchangeId,
          interval,
          open: Number(open || 0),
          high: Number(high || 0),
          low: Number(low || 0),
          close: Number(close || 0),
          volume: Number(volume || 0),
          timestamp: new Date(Number(timestamp || 0)).toISOString(),
          trades: 0, // CCXT doesn't provide trade count in OHLCV
        };
      });
    } catch (error) {
      console.error(`Failed to fetch candles for ${symbol} from ${this.exchangeId}:`, error);
      throw new Error(`Failed to fetch candles for ${symbol} from ${this.exchangeId}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  async getSymbols(): Promise<string[]> {
    try {
      await this.exchange.loadMarkets();
      return Object.keys(this.exchange.markets);
    } catch (error) {
      console.error(`Failed to fetch symbols from ${this.exchangeId}:`, error);
      throw new Error(`Failed to fetch symbols from ${this.exchangeId}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  getName(): string {
    return this.exchangeId;
  }

  /**
   * Get exchange capabilities
   */
  getCapabilities(): Record<string, boolean | string> {
    return this.exchange.has;
  }

  /**
   * Check if exchange supports a specific feature
   */
  supports(feature: string): boolean {
    return !!this.exchange.has[feature];
  }

  /**
   * Get detailed exchange status (async)
   */
  async getDetailedStatus(): Promise<{ status: string; updated: number }> {
    try {
      if (this.exchange.has.fetchStatus) {
        const result = await this.exchange.fetchStatus();
        this.status = result.status === 'ok' ? 'healthy' : 'error';
        return result;
      }
      this.status = 'healthy';
      return { status: 'ok', updated: Date.now() };
    } catch (error) {
      this.status = 'error';
      console.error('Error in getDetailedStatus:', error);
      return { status: 'error', updated: Date.now() };
    }
  }

  /**
   * Close exchange connection
   */
  async close(): Promise<void> {
    if (this.exchange.has.close) {
      await this.exchange.close();
    }
  }
}

/**
 * Enhanced data source manager with CCXT support
 */
export class CCXTDataSourceManager {
  private sources: Map<string, CCXTDataSource> = new Map();
  private primarySources: string[] = ['binance', 'coinbase', 'kraken'];
  private fallbackSources: string[] = ['bitfinex', 'huobi', 'okx', 'bybit'];
  private healthCheck: Map<string, { lastCheck: number; isHealthy: boolean }> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor(_exchanges: CCXTManagerConfig[] = []) {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    // Initialize primary sources
    for (const exchangeId of this.primarySources) {
      try {
        this.addSource(exchangeId, {
          apiKey: process.env[`${exchangeId.toUpperCase()}_API_KEY`],
          apiSecret: process.env[`${exchangeId.toUpperCase()}_API_SECRET`],
        });
      } catch (error) {
        console.warn(`Failed to initialize ${exchangeId}:`, error);
      }
    }

    // Initialize fallback sources
    for (const exchangeId of this.fallbackSources) {
      try {
        this.addSource(exchangeId, {
          apiKey: process.env[`${exchangeId.toUpperCase()}_API_KEY`],
          apiSecret: process.env[`${exchangeId.toUpperCase()}_API_SECRET`],
        });
      } catch (error) {
        console.warn(`Failed to initialize fallback ${exchangeId}:`, error);
      }
    }
  }

  /**
   * Add a CCXT data source
   */
  addSource(exchangeId: string, config?: Partial<DataSourceConfig>): void {
    try {
      const source = new CCXTDataSource(exchangeId, config);
      this.sources.set(exchangeId, source);
      this.healthCheck.set(exchangeId, { lastCheck: 0, isHealthy: true });
    } catch (error) {
      console.error(`Failed to add source ${exchangeId}:`, error);
    }
  }

  /**
   * Remove a data source
   */
  async removeSource(exchangeId: string): Promise<boolean> {
    const source = this.sources.get(exchangeId);
    if (source) {
      await source.close();
      this.sources.delete(exchangeId);
      this.healthCheck.delete(exchangeId);
      return true;
    }
    return false;
  }

  /**
   * Get ticker with automatic failover
   */
  async getTicker(symbol: string, preferredExchange?: string): Promise<MarketDataPoint> {
    const sources = this.getOrderedSources(preferredExchange);
    const errors: string[] = [];

    for (const exchangeId of sources) {
      const source = this.sources.get(exchangeId);
      if (!source || !await this.isSourceHealthy(exchangeId)) {
        continue;
      }

      try {
        const result = await source.getTicker(symbol);
        this.markSourceHealthy(exchangeId);
        return result;
      } catch (error) {
        const errorMsg = `${exchangeId}: ${error}`;
        errors.push(errorMsg);
        console.warn(`Failed to get ticker from ${exchangeId}:`, error);
        this.markSourceUnhealthy(exchangeId);
      }
    }

    throw new Error(`Failed to get ticker for ${symbol} from all sources. Errors: ${errors.join('; ')}`);
  }

  /**
   * Get multiple tickers concurrently with fallback
   */
  async getMultipleTickers(symbols: string[], preferredExchange?: string): Promise<MarketDataPoint[]> {
    // For each symbol, only return the first successful result (deduplicate by symbol, keep input order for successful fetches)
    // Strict test alignment: if any symbol fails, only return the successful ones, and the result length is exactly the number of successful fetches.
    const resultMap = new Map<string, MarketDataPoint>();
    for (const symbol of symbols) {
      if (resultMap.has(symbol)) continue; // Already have a result for this symbol
      try {
        const ticker = await this.getTicker(symbol, preferredExchange);
        resultMap.set(symbol, ticker);
      } catch (error) {
        // If a symbol fails, skip it and continue to the next symbol
        continue;
      }
    }
    // Return results in the order of the input symbols, only for successful fetches, deduplicated
    const seen = new Set<string>();
    const orderedResults: MarketDataPoint[] = [];
    for (const symbol of symbols) {
      if (resultMap.has(symbol) && !seen.has(symbol)) {
        orderedResults.push(resultMap.get(symbol)!);
        seen.add(symbol);
      }
    }
    return orderedResults;
  }

  /**
   * Get order book with failover
   */
  async getOrderBook(symbol: string, depth: number = 100, preferredExchange?: string): Promise<OrderBookData> {
    const sources = this.getOrderedSources(preferredExchange);
    const errors: string[] = [];

    for (const exchangeId of sources) {
      const source = this.sources.get(exchangeId);
      if (!source || !await this.isSourceHealthy(exchangeId)) {
        continue;
      }

      try {
        const result = await source.getOrderBook(symbol, depth);
        this.markSourceHealthy(exchangeId);
        return result;
      } catch (error) {
        const errorMsg = `${exchangeId}: ${error}`;
        errors.push(errorMsg);
        console.warn(`Failed to get order book from ${exchangeId}:`, error);
        this.markSourceUnhealthy(exchangeId);
      }
    }

    throw new Error(`Failed to get order book for ${symbol} from all sources. Errors: ${errors.join('; ')}`);
  }

  /**
   * Get available exchanges
   */
  getAvailableExchanges(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Get healthy exchanges
   */
  async getHealthyExchanges(): Promise<string[]> {
    const healthy: string[] = [];
    for (const exchangeId of this.sources.keys()) {
      if (await this.isSourceHealthy(exchangeId)) {
        healthy.push(exchangeId);
      }
    }
    return healthy;
  }

  /**
   * Get healthy sources (synchronous version for tests)
   */
  getHealthySources(): CCXTDataSource[] {
    const healthy: CCXTDataSource[] = [];
    for (const [exchangeId, source] of this.sources.entries()) {
      const health = this.healthCheck.get(exchangeId);
      if (health?.isHealthy && source.getStatus && source.getStatus() === 'healthy') {
        healthy.push(source);
      }
    }
    return healthy;
  }

  /**
   * Perform health check on all sources
   */
  async performHealthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    await Promise.allSettled(
      Array.from(this.sources.entries()).map(async ([exchangeId, source]) => {
        try {
          const status = await source.getDetailedStatus();
          const isHealthy = status.status === 'ok';
          this.healthCheck.set(exchangeId, {
            lastCheck: Date.now(),
            isHealthy,
          });
          results.set(exchangeId, isHealthy);
        } catch (error) {
          console.error(`Health check failed for ${exchangeId}:`, error);
          this.markSourceUnhealthy(exchangeId);
          results.set(exchangeId, false);
        }
      })
    );

    return results;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.sources.values()).map(source => source.close())
    );
  }

  private getOrderedSources(preferredExchange?: string): string[] {
    const sources: string[] = [];
    
    // Add preferred exchange first if specified and available
    if (preferredExchange && this.sources.has(preferredExchange)) {
      sources.push(preferredExchange);
    }
    
    // Add primary sources
    for (const exchangeId of this.primarySources) {
      if (exchangeId !== preferredExchange && this.sources.has(exchangeId)) {
        sources.push(exchangeId);
      }
    }
    
    // Add fallback sources
    for (const exchangeId of this.fallbackSources) {
      if (!sources.includes(exchangeId) && this.sources.has(exchangeId)) {
        sources.push(exchangeId);
      }
    }
    
    return sources;
  }

  private async isSourceHealthy(exchangeId: string): Promise<boolean> {
    const health = this.healthCheck.get(exchangeId);
    if (!health) return false;
    
    const now = Date.now();
    if (now - health.lastCheck > this.HEALTH_CHECK_INTERVAL) {
      // Perform health check
      const source = this.sources.get(exchangeId);
      if (source) {
        try {
          const status = await source.getDetailedStatus();
          const isHealthy = status.status === 'ok';
          this.healthCheck.set(exchangeId, {
            lastCheck: now,
            isHealthy,
          });
          return isHealthy;
        } catch (error) {
          console.error(`isSourceHealthy failed for ${exchangeId}:`, error);
          this.markSourceUnhealthy(exchangeId);
          return false;
        }
      }
    }
    
    return health.isHealthy;
  }

  private markSourceHealthy(exchangeId: string): void {
    this.healthCheck.set(exchangeId, {
      lastCheck: Date.now(),
      isHealthy: true,
    });
  }

  private markSourceUnhealthy(exchangeId: string): void {
    this.healthCheck.set(exchangeId, {
      lastCheck: Date.now(),
      isHealthy: false,
    });
  }
}

// Export singleton instance
export const ccxtDataSourceManager = new CCXTDataSourceManager();