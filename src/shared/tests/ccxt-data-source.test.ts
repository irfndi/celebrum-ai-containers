import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CCXTDataSource, CCXTDataSourceManager } from '../src/infrastructure/ccxt-data-source';
import * as ccxt from 'ccxt';

// Mock CCXT
vi.mock('ccxt', () => {
  const createMockExchange = (id: string, name: string) => ({
    id,
    name,
    urls: {
      api: {
        public: `https://api.${id}.com`
      }
    },
    rateLimit: 1200,
    has: {
      fetchTicker: true,
      fetchOrderBook: true,
      fetchTrades: true,
      fetchOHLCV: true,
      fetchStatus: true,
      close: true
    },
    markets: {},
    loadMarkets: vi.fn().mockResolvedValue({}),
    fetchTicker: vi.fn(),
    fetchOrderBook: vi.fn(),
    fetchTrades: vi.fn(),
    fetchOHLCV: vi.fn(),
    fetchStatus: vi.fn().mockResolvedValue({ status: 'ok', updated: Date.now() }),
    close: vi.fn().mockResolvedValue(undefined)
  });

  const createMockExchangeClass = (id: string, name: string) => {
    return class {
      constructor(config?: any) {
        return createMockExchange(id, name);
      }
    };
  };

  return {
    binance: createMockExchangeClass('binance', 'Binance'),
    coinbase: createMockExchangeClass('coinbase', 'Coinbase'),
    kraken: createMockExchangeClass('kraken', 'Kraken'),
    bitfinex: createMockExchangeClass('bitfinex', 'Bitfinex'),
    huobi: createMockExchangeClass('huobi', 'Huobi'),
    okx: createMockExchangeClass('okx', 'OKX'),
    bybit: createMockExchangeClass('bybit', 'Bybit'),
    exchanges: ['binance', 'coinbase', 'kraken', 'bitfinex', 'huobi', 'okx', 'bybit']
  };
});

describe('CCXTDataSource', () => {
  let dataSource: CCXTDataSource;
  let mockExchange: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExchange = {
      id: 'binance',
      name: 'Binance',
      has: {
        fetchTicker: true,
        fetchOrderBook: true,
        fetchTrades: true,
        fetchOHLCV: true
      },
      loadMarkets: vi.fn().mockResolvedValue({}),
      fetchTicker: vi.fn(),
      fetchOrderBook: vi.fn(),
      fetchTrades: vi.fn(),
      fetchOHLCV: vi.fn(),
      fetchStatus: vi.fn().mockResolvedValue({ status: 'ok', updated: Date.now() }),
      close: vi.fn().mockResolvedValue(undefined)
    };
    
    dataSource = new CCXTDataSource('binance', {
      apiKey: 'test-key',
      apiSecret: 'test-secret'
    });
    
    // Replace the internal exchange with our mock
    (dataSource as any).exchange = mockExchange;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(dataSource.getName()).toBe('binance');
      expect(dataSource.getStatus()).toBe('healthy');
    });

    it('should handle initialization errors gracefully', async () => {
      mockExchange.loadMarkets.mockRejectedValue(new Error('Network error'));
      
      await dataSource.initialize();
      expect(dataSource.getStatus()).toBe('error');
    });
  });

  describe('fetchTicker', () => {
    it('should fetch ticker data successfully', async () => {
      const mockTicker = {
        symbol: 'BTC/USDT',
        last: 45000,
        bid: 44999,
        ask: 45001,
        baseVolume: 1000,
        quoteVolume: 45000000,
        timestamp: Date.now()
      };
      
      mockExchange.fetchTicker.mockResolvedValue(mockTicker);
      
      const result = await dataSource.fetchTicker('BTC/USDT');
      
      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        price: 45000,
        volume: 1000,
        timestamp: expect.any(String),
        bid: 44999,
        ask: 45001,
        high24h: 0,
        low24h: 0
      });
      
      expect(mockExchange.fetchTicker).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should handle ticker fetch errors', async () => {
      mockExchange.fetchTicker.mockRejectedValue(new Error('API Error'));
      
      await expect(dataSource.fetchTicker('BTC/USDT')).rejects.toThrow('API Error');
    });
  });

  describe('fetchOrderBook', () => {
    it('should fetch order book data successfully', async () => {
      const mockOrderBook = {
        symbol: 'BTC/USDT',
        bids: [[44999, 1.5], [44998, 2.0]],
        asks: [[45001, 1.2], [45002, 1.8]],
        timestamp: Date.now()
      };
      
      mockExchange.fetchOrderBook.mockResolvedValue(mockOrderBook);
      
      const result = await dataSource.fetchOrderBook('BTC/USDT');
      
      expect(result).toEqual({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        bids: [
          [44999, 1.5],
          [44998, 2.0]
        ],
        asks: [
          [45001, 1.2],
          [45002, 1.8]
        ],
        timestamp: expect.any(String)
      });
    });
  });

  describe('fetchTrades', () => {
    it('should fetch trades data successfully', async () => {
      const mockTrades = [
        {
          id: '1',
          timestamp: Date.now(),
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 1.0,
          price: 45000
        }
      ];
      
      mockExchange.fetchTrades.mockResolvedValue(mockTrades);
      
      const result = await dataSource.fetchTrades('BTC/USDT');
      
      expect(result).toEqual([
        {
          id: '1',
          symbol: 'BTC/USDT',
          exchange: 'binance',
          price: 45000,
          quantity: 1.0,
          side: 'buy',
          timestamp: expect.any(String)
        }
      ]);
    });
  });

  describe('capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = dataSource.getCapabilities();
      expect(capabilities).toEqual(mockExchange.has);
    });

    it('should check feature support correctly', () => {
      expect(dataSource.supports('fetchTicker')).toBe(true);
      expect(dataSource.supports('fetchOrderBook')).toBe(true);
      expect(dataSource.supports('nonExistentFeature')).toBe(false);
    });
  });
});

describe('CCXTDataSourceManager', () => {
  let manager: CCXTDataSourceManager;
  let mockSources: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSources = [
      {
        getName: () => 'binance',
        getStatus: vi.fn().mockReturnValue('healthy'),
        getDetailedStatus: vi.fn().mockResolvedValue({ status: 'ok', updated: Date.now() }),
        getTicker: vi.fn(),
        getOrderBook: vi.fn(),
        supports: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined)
      },
      {
        getName: () => 'coinbase',
        getStatus: vi.fn().mockReturnValue('healthy'),
        getDetailedStatus: vi.fn().mockResolvedValue({ status: 'ok', updated: Date.now() }),
        getTicker: vi.fn(),
        getOrderBook: vi.fn(),
        supports: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined)
      }
    ];
    
    manager = new CCXTDataSourceManager();
    
    // Replace internal sources with mocks
    (manager as any).sources = new Map([
      ['binance', mockSources[0]],
      ['coinbase', mockSources[1]]
    ]);
    
    // Set up health check state
    (manager as any).healthCheck = new Map([
      ['binance', { lastCheck: Date.now(), isHealthy: true }],
      ['coinbase', { lastCheck: Date.now(), isHealthy: true }]
    ]);
  });

  describe('initialization', () => {
    it('should initialize with multiple sources', () => {
      expect(manager.getHealthySources().length).toBe(2);
    });

    it('should handle source initialization failures', () => {
      mockSources[0].getStatus.mockReturnValue('error');
      expect(manager.getHealthySources().length).toBe(1);
    });
  });

  describe('getTicker', () => {
    it('should fetch ticker from primary source', async () => {
      const mockTicker = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        timestamp: Date.now(),
        exchange: 'binance'
      };
      
      mockSources[0].getTicker.mockResolvedValue(mockTicker);
      
      const result = await manager.getTicker('BTC/USDT');
      
      expect(result).toEqual(mockTicker);
      expect(mockSources[0].getTicker).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should fallback to secondary source on primary failure', async () => {
      const mockTicker = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        timestamp: Date.now(),
        exchange: 'coinbase'
      };
      
      mockSources[0].getTicker.mockRejectedValue(new Error('Primary failed'));
      mockSources[1].getTicker.mockResolvedValue(mockTicker);
      
      const result = await manager.getTicker('BTC/USDT');
      
      expect(result).toEqual(mockTicker);
      expect(mockSources[0].getTicker).toHaveBeenCalled();
      expect(mockSources[1].getTicker).toHaveBeenCalled();
    });

    it('should throw error when all sources fail', async () => {
    mockSources[0].getTicker.mockRejectedValue(new Error('Source 1 failed'));
    mockSources[1].getTicker.mockRejectedValue(new Error('Source 2 failed'));
    
    await expect(manager.getTicker('BTC/USDT')).rejects.toThrow('Failed to get ticker for BTC/USDT from all sources');
  });
  });

  describe('getMultipleTickers', () => {
    it('should fetch multiple tickers successfully', async () => {
      const symbols = ['BTC/USDT', 'ETH/USDT'];
      const mockTickers = [
        { symbol: 'BTC/USDT', price: 45000, volume: 1000, timestamp: Date.now(), exchange: 'binance' },
        { symbol: 'ETH/USDT', price: 3000, volume: 500, timestamp: Date.now(), exchange: 'binance' }
      ];
      
      mockSources[0].getTicker
        .mockResolvedValueOnce(mockTickers[0])
        .mockResolvedValueOnce(mockTickers[1]);
      
      const results = await manager.getMultipleTickers(symbols);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockTickers[0]);
      expect(results[1]).toEqual(mockTickers[1]);
    });

    it('should handle partial failures in multiple ticker fetch', async () => {
      const symbols = ['BTC/USDT', 'ETH/USDT'];
      const mockTicker = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        timestamp: Date.now(),
        exchange: 'binance'
      };
      // Explicitly mock both sources for each symbol
      mockSources[0].getTicker.mockImplementation(async (symbol) => {
        if (symbol === 'BTC/USDT') return mockTicker;
        throw new Error('ETH fetch failed');
      });
      mockSources[1].getTicker.mockRejectedValue(new Error('All fetches fail'));
      const results = await manager.getMultipleTickers(symbols);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockTicker);
    });
  });

  describe('health monitoring', () => {
    it('should return healthy sources only', () => {
      mockSources[0].getStatus.mockReturnValue('error');

      const healthySources = manager.getHealthySources();

      expect(healthySources).toHaveLength(1);
      expect(healthySources[0].getName()).toBe('coinbase');
    });

    it('should handle all sources being unhealthy', () => {
      mockSources.forEach(s => s.getStatus.mockReturnValue('error'));

      const healthySources = manager.getHealthySources();

      expect(healthySources).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    it('should close all sources properly', async () => {
      await manager.close();
      for (const source of mockSources) {
        expect(source.close).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('getAvailableExchanges', () => {
    it('should return a list of available exchange IDs', () => {
      const exchangeIds = manager.getAvailableExchanges();
      expect(exchangeIds).toEqual(['binance', 'coinbase']);
    });
  });
});