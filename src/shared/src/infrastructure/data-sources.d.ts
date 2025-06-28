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
    bids: [number, number][];
    asks: [number, number][];
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
        window: number;
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
export declare abstract class MarketDataSource {
    protected config: DataSourceConfig;
    protected lastRequest: number;
    protected requestCount: number;
    protected windowStart: number;
    constructor(config: DataSourceConfig);
    /**
     * Check if we can make a request without hitting rate limits
     */
    protected canMakeRequest(): boolean;
    /**
     * Record a request for rate limiting
     */
    protected recordRequest(): void;
    /**
     * Make an authenticated HTTP request
     */
    protected makeRequest(endpoint: string, params?: Record<string, unknown>): Promise<unknown>;
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
export declare class BinanceDataSource extends MarketDataSource {
    constructor(apiKey?: string);
    getTicker(symbol: string): Promise<MarketDataPoint>;
    getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
    getTrades(symbol: string, limit?: number): Promise<TradeData[]>;
    getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
    getSymbols(): Promise<string[]>;
    getName(): string;
}
/**
 * Coinbase data source implementation
 */
export declare class CoinbaseDataSource extends MarketDataSource {
    constructor(apiKey?: string, apiSecret?: string);
    getTicker(symbol: string): Promise<MarketDataPoint>;
    getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
    getTrades(symbol: string, limit?: number): Promise<TradeData[]>;
    getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
    getSymbols(): Promise<string[]>;
    getName(): string;
    private mapInterval;
}
/**
 * Kraken data source implementation
 */
export declare class KrakenDataSource extends MarketDataSource {
    constructor(apiKey?: string, apiSecret?: string);
    getTicker(symbol: string): Promise<MarketDataPoint>;
    getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
    getTrades(symbol: string, limit?: number): Promise<TradeData[]>;
    getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
    getSymbols(): Promise<string[]>;
    getName(): string;
    private mapInterval;
}
/**
 * Data source manager for handling multiple market data sources
 */
export declare class DataSourceManager {
    private sources;
    private primarySource;
    private fallbackSources;
    constructor();
    /**
     * Add a data source
     */
    addSource(name: string, source: MarketDataSource): void;
    /**
     * Remove a data source
     */
    removeSource(name: string): boolean;
    /**
     * Get data with automatic fallback
     */
    getTicker(symbol: string, exchange?: string): Promise<MarketDataPoint>;
    /**
     * Get available data sources
     */
    getAvailableSources(): string[];
    /**
     * Set primary data source
     */
    setPrimarySource(name: string): boolean;
    /**
     * Get data source by name
     */
    getSource(name: string): MarketDataSource | undefined;
}
export declare const dataSourceManager: DataSourceManager;
//# sourceMappingURL=data-sources.d.ts.map