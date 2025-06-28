"use strict";
/**
 * Market data sources and data source management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceManager = exports.DataSourceManager = exports.KrakenDataSource = exports.CoinbaseDataSource = exports.BinanceDataSource = exports.MarketDataSource = void 0;
class MarketDataSource {
    config;
    lastRequest = 0;
    requestCount = 0;
    windowStart = 0;
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if we can make a request without hitting rate limits
     */
    canMakeRequest() {
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
    recordRequest() {
        this.requestCount++;
        this.lastRequest = Date.now();
    }
    /**
     * Make an authenticated HTTP request
     */
    async makeRequest(endpoint, params) {
        if (!this.canMakeRequest()) {
            throw new Error(`Rate limit exceeded for ${this.config.name}`);
        }
        const url = new URL(endpoint, this.config.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }
        const headers = {
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
}
exports.MarketDataSource = MarketDataSource;
/**
 * Binance data source implementation
 */
class BinanceDataSource extends MarketDataSource {
    constructor(apiKey) {
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
    async getTicker(symbol) {
        const data = await this.makeRequest(this.config.endpoints.ticker, { symbol });
        const tickerData = data;
        return {
            symbol: tickerData.symbol,
            exchange: 'binance',
            price: parseFloat(tickerData.lastPrice),
            volume: parseFloat(tickerData.volume),
            timestamp: new Date().toISOString(),
            bid: parseFloat(tickerData.bidPrice),
            ask: parseFloat(tickerData.askPrice),
            high24h: parseFloat(tickerData.highPrice),
            low24h: parseFloat(tickerData.lowPrice),
            change24h: parseFloat(tickerData.priceChange),
            changePercent24h: parseFloat(tickerData.priceChangePercent),
        };
    }
    async getOrderBook(symbol, depth = 100) {
        const data = await this.makeRequest(this.config.endpoints.orderbook, { symbol, limit: depth });
        return {
            symbol,
            exchange: 'binance',
            bids: data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
            asks: data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
            timestamp: new Date().toISOString(),
        };
    }
    async getTrades(symbol, limit = 500) {
        const data = await this.makeRequest(this.config.endpoints.trades, { symbol, limit });
        return data.map((trade) => {
            const tradeObj = trade;
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
    async getCandles(symbol, interval, limit = 500) {
        const data = await this.makeRequest(this.config.endpoints.candles, { symbol, interval, limit });
        return data.map((candle) => ({
            symbol,
            exchange: 'binance',
            interval,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            timestamp: new Date(candle[0]).toISOString(),
            trades: parseInt(candle[8], 10),
        }));
    }
    async getSymbols() {
        const data = await this.makeRequest(this.config.endpoints.symbols);
        return data.symbols
            .filter((symbol) => symbol.status === 'TRADING')
            .map((symbol) => symbol.symbol);
    }
    getName() {
        return 'Binance';
    }
}
exports.BinanceDataSource = BinanceDataSource;
/**
 * Coinbase data source implementation
 */
class CoinbaseDataSource extends MarketDataSource {
    constructor(apiKey, apiSecret) {
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
    async getTicker(symbol) {
        const endpoint = this.config.endpoints.ticker.replace('{symbol}', symbol);
        const data = await this.makeRequest(endpoint);
        const tickerData = data;
        return {
            symbol,
            exchange: 'coinbase',
            price: parseFloat(tickerData.price),
            volume: parseFloat(tickerData.volume),
            timestamp: tickerData.time,
            bid: parseFloat(tickerData.bid),
            ask: parseFloat(tickerData.ask),
        };
    }
    async getOrderBook(symbol, depth = 50) {
        const endpoint = this.config.endpoints.orderbook.replace('{symbol}', symbol);
        const data = await this.makeRequest(endpoint, { level: 2 });
        return {
            symbol,
            exchange: 'coinbase',
            bids: data.bids.slice(0, depth).map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
            asks: data.asks.slice(0, depth).map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
            timestamp: new Date().toISOString(),
        };
    }
    async getTrades(symbol, limit = 100) {
        const endpoint = this.config.endpoints.trades.replace('{symbol}', symbol);
        const data = await this.makeRequest(endpoint);
        return data.slice(0, limit).map((trade) => ({
            id: trade.trade_id.toString(),
            symbol,
            exchange: 'coinbase',
            price: parseFloat(trade.price),
            quantity: parseFloat(trade.size),
            side: trade.side,
            timestamp: trade.time,
        }));
    }
    async getCandles(symbol, interval, limit = 300) {
        const endpoint = this.config.endpoints.candles.replace('{symbol}', symbol);
        const data = await this.makeRequest(endpoint, { granularity: this.mapInterval(interval) });
        return data.slice(0, limit).map((candle) => ({
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
    async getSymbols() {
        const data = await this.makeRequest(this.config.endpoints.symbols);
        return data
            .filter((product) => product.status === 'online')
            .map((product) => product.id);
    }
    getName() {
        return 'Coinbase';
    }
    mapInterval(interval) {
        const mapping = {
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
exports.CoinbaseDataSource = CoinbaseDataSource;
/**
 * Kraken data source implementation
 */
class KrakenDataSource extends MarketDataSource {
    constructor(apiKey, apiSecret) {
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
    async getTicker(symbol) {
        const data = await this.makeRequest(this.config.endpoints.ticker, { pair: symbol });
        const tickerData = data.result[symbol];
        const ticker = tickerData;
        return {
            symbol,
            exchange: 'kraken',
            price: parseFloat(ticker.c[0]),
            volume: parseFloat(ticker.v[1]),
            timestamp: new Date().toISOString(),
            bid: parseFloat(ticker.b[0]),
            ask: parseFloat(ticker.a[0]),
            high24h: parseFloat(ticker.h[1]),
            low24h: parseFloat(ticker.l[1]),
        };
    }
    async getOrderBook(symbol, depth = 100) {
        const data = await this.makeRequest(this.config.endpoints.orderbook, { pair: symbol, count: depth });
        const bookData = data.result[symbol];
        const book = bookData;
        return {
            symbol,
            exchange: 'kraken',
            bids: book.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
            asks: book.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
            timestamp: new Date().toISOString(),
        };
    }
    async getTrades(symbol, limit = 1000) {
        const data = await this.makeRequest(this.config.endpoints.trades, { pair: symbol });
        const trades = data.result[symbol];
        return trades.slice(0, limit).map((trade, index) => ({
            id: `${symbol}-${index}`,
            symbol,
            exchange: 'kraken',
            price: parseFloat(trade[0]),
            quantity: parseFloat(trade[1]),
            side: trade[3] === 'b' ? 'buy' : 'sell',
            timestamp: new Date(parseFloat(trade[2]) * 1000).toISOString(),
        }));
    }
    async getCandles(symbol, interval, limit = 720) {
        const data = await this.makeRequest(this.config.endpoints.candles, {
            pair: symbol,
            interval: this.mapInterval(interval)
        });
        const candles = data.result[symbol];
        return candles.slice(0, limit).map((candle) => ({
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
    async getSymbols() {
        const data = await this.makeRequest(this.config.endpoints.symbols);
        return Object.keys(data.result);
    }
    getName() {
        return 'Kraken';
    }
    mapInterval(interval) {
        const mapping = {
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
exports.KrakenDataSource = KrakenDataSource;
/**
 * Data source manager for handling multiple market data sources
 */
class DataSourceManager {
    sources = new Map();
    primarySource = 'binance';
    fallbackSources = ['coinbase', 'kraken'];
    constructor() {
        // Initialize default data sources
        this.addSource('binance', new BinanceDataSource());
        this.addSource('coinbase', new CoinbaseDataSource());
        this.addSource('kraken', new KrakenDataSource());
    }
    /**
     * Add a data source
     */
    addSource(name, source) {
        this.sources.set(name, source);
    }
    /**
     * Remove a data source
     */
    removeSource(name) {
        return this.sources.delete(name);
    }
    /**
     * Get data with automatic fallback
     */
    async getTicker(symbol, exchange) {
        const sourceName = exchange || this.primarySource;
        const source = this.sources.get(sourceName);
        if (source) {
            try {
                return await source.getTicker(symbol);
            }
            catch (error) {
                console.warn(`Failed to get ticker from ${sourceName}:`, error);
            }
        }
        // Try fallback sources
        for (const fallbackName of this.fallbackSources) {
            if (fallbackName === sourceName)
                continue;
            const fallbackSource = this.sources.get(fallbackName);
            if (fallbackSource) {
                try {
                    return await fallbackSource.getTicker(symbol);
                }
                catch (error) {
                    console.warn(`Failed to get ticker from fallback ${fallbackName}:`, error);
                }
            }
        }
        throw new Error(`Failed to get ticker for ${symbol} from all sources`);
    }
    /**
     * Get available data sources
     */
    getAvailableSources() {
        return Array.from(this.sources.keys());
    }
    /**
     * Set primary data source
     */
    setPrimarySource(name) {
        if (this.sources.has(name)) {
            this.primarySource = name;
            return true;
        }
        return false;
    }
    /**
     * Get data source by name
     */
    getSource(name) {
        return this.sources.get(name);
    }
}
exports.DataSourceManager = DataSourceManager;
// Export singleton instance
exports.dataSourceManager = new DataSourceManager();
//# sourceMappingURL=data-sources.js.map