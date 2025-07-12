import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import type { MarketDataPoint } from '@celebrum-ai/shared/types/market';
import type { UserRoleType, SubscriptionTierType } from '@celebrum-ai/shared/types/user';
import type { ArbitrageOpportunity } from '@celebrum-ai/shared/types/arbitrage';

// Mock fetch globally to prevent real HTTP requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock CCXT library first
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

// Mock the data source manager
vi.mock('@celebrum-ai/shared/infrastructure/data-sources', () => ({
  dataSourceManager: {
    getTicker: vi.fn()
  }
}));

// Mock the CCXT data source manager
vi.mock('@celebrum-ai/shared/infrastructure/ccxt-data-source', () => {
  const mockCCXTDataSourceManager = {
    getHealthyExchanges: vi.fn().mockResolvedValue(['binance', 'coinbase', 'kraken']),
    getHealthySources: vi.fn().mockReturnValue([
      { exchangeId: 'binance', isHealthy: true },
      { exchangeId: 'coinbase', isHealthy: true },
      { exchangeId: 'kraken', isHealthy: true }
    ]),
    getTicker: vi.fn(),
    getMultipleTickers: vi.fn().mockImplementation((symbols: string[]) => {
      // Mock implementation that returns market data for each symbol
      return Promise.resolve(symbols.map(symbol => {
        const basePrice = symbol === 'BTC/USDT' ? 45000 : 
                         symbol === 'ETH/USDT' ? 3000 :
                         symbol === 'ADA/USDT' ? 0.5 :
                         symbol === 'DOT/USDT' ? 7.5 : 
                         symbol === 'LINK/USDT' ? 25 :
                         symbol === 'SOL/USDT' ? 100 :
                         symbol === 'MATIC/USDT' ? 1.2 : 1000;
        
        return {
          symbol,
          price: basePrice,
          volume: 1000000,
          timestamp: Date.now(),
          exchange: 'binance'
        };
      }));
    }),
    getOrderBook: vi.fn().mockResolvedValue({
      symbol: 'BTC/USDT',
      exchange: 'binance',
      bids: [[45000, 1], [44999, 2]],
      asks: [[45001, 1], [45002, 2]],
      timestamp: Date.now()
    }),
    performHealthCheck: vi.fn().mockResolvedValue(new Map([['binance', true], ['coinbase', true], ['kraken', true]])),
    close: vi.fn().mockResolvedValue(),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    getAvailableExchanges: vi.fn().mockReturnValue(['binance', 'coinbase', 'kraken'])
  };
  
  return {
    ccxtDataSourceManager: mockCCXTDataSourceManager,
    CCXTDataSourceManager: vi.fn(() => mockCCXTDataSourceManager),
    CCXTDataSource: vi.fn()
  };
});

// Mock environment with KV storage
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

const mockEnv = {
  CELEBRUM_KV: mockKV,
  TELEGRAM_BOT_TOKEN: 'test-token',
  OPENAI_API_KEY: 'test-key'
};

// Helper to create mock market data
const createMockMarketData = (price: number, volume: number = 1000000): MarketDataPoint => ({
  symbol: 'BTCUSDT',
  price,
  volume,
  timestamp: Date.now(),
  exchange: 'binance'
});

describe('OpportunityManager', () => {
  let manager: any;
  let OpportunityManager: any;
  let dataSourceManager: any;
  let ccxtDataSourceManager: any;

  beforeAll(async () => {
    // Import modules after mocks are set up
    const opportunityManagerModule = await import('../src/opportunity-manager');
    const dataSourceModule = await import('@celebrum-ai/shared/infrastructure/data-sources');
    const ccxtDataSourceModule = await import('@celebrum-ai/shared/infrastructure/ccxt-data-source');
    
    OpportunityManager = opportunityManagerModule.OpportunityManager;
    dataSourceManager = dataSourceModule.dataSourceManager;
    ccxtDataSourceManager = ccxtDataSourceModule.ccxtDataSourceManager;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configure fetch mock to prevent real HTTP requests
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          symbol: 'BTCUSDT',
          lastPrice: '45000',
          volume: '1000000',
          bidPrice: '44999',
          askPrice: '45001',
          highPrice: '46000',
          lowPrice: '44000',
          priceChange: '500',
          priceChangePercent: '1.12'
        })
      });
    });
    
    // Reset KV mock to return empty cache by default
    // Handle both string and 'json' parameter calls
    mockKV.get.mockImplementation((key: string, type?: string) => {
      if (type === 'json') {
        // Return null for JSON parsing by default
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
    mockKV.put.mockResolvedValue(undefined);
    mockKV.delete.mockResolvedValue(undefined);
    
    // Reset data source manager mock
    (dataSourceManager.getTicker as any).mockReset();
    
    // Reset CCXT data source manager mocks to default state
    (ccxtDataSourceManager.getHealthyExchanges as any).mockResolvedValue(['binance', 'coinbase', 'kraken']);
    (ccxtDataSourceManager.getHealthySources as any).mockReturnValue([
      { exchangeId: 'binance', isHealthy: true },
      { exchangeId: 'coinbase', isHealthy: true },
      { exchangeId: 'kraken', isHealthy: true }
    ]);
    (ccxtDataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
      const basePrice = symbol === 'BTC/USDT' ? 45000 : 
                       symbol === 'ETH/USDT' ? 3000 :
                       symbol === 'ADA/USDT' ? 0.5 :
                       symbol === 'DOT/USDT' ? 7.5 : 
                       symbol === 'LINK/USDT' ? 25 :
                       symbol === 'SOL/USDT' ? 100 :
                       symbol === 'MATIC/USDT' ? 1.2 : 1000;
      
      const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                exchange === 'coinbase' ? 1.005 : 1.003; // kraken - larger differences
      
      return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
    });
    
    // Also mock the legacy dataSourceManager.getTicker with proper price differences
    (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
      const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                       symbol === 'ETHUSDT' ? 3000 :
                       symbol === 'ADAUSDT' ? 0.5 :
                       symbol === 'DOTUSDT' ? 7.5 : 
                       symbol === 'LINKUSDT' ? 25 : 1000;
      
      const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                exchange === 'coinbase' ? 1.005 : 1.003; // kraken - larger differences
      
      return Promise.resolve({
        symbol: symbol,
        price: basePrice * exchangeMultiplier,
        volume: 1000000,
        timestamp: Date.now(),
        exchange: exchange
      });
    });
    (ccxtDataSourceManager.getMultipleTickers as any).mockImplementation((symbols: string[]) => {
      // Mock implementation that returns market data for multiple exchanges with price differences
      const exchanges = ['binance', 'coinbase', 'kraken'];
      const results: any[] = [];
      
      symbols.forEach(symbol => {
        const basePrice = symbol === 'BTC/USDT' ? 45000 : 
                         symbol === 'ETH/USDT' ? 3000 :
                         symbol === 'ADA/USDT' ? 0.5 :
                         symbol === 'DOT/USDT' ? 7.5 : 
                         symbol === 'LINK/USDT' ? 25 :
                         symbol === 'SOL/USDT' ? 100 :
                         symbol === 'MATIC/USDT' ? 1.2 : 1000;
        
        exchanges.forEach(exchange => {
          const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                    exchange === 'coinbase' ? 1.005 : 1.003; // kraken - larger differences
          
          results.push({
            symbol,
            price: basePrice * exchangeMultiplier,
            volume: 1000000,
            timestamp: Date.now(),
            exchange
          });
        });
      });
      
      return Promise.resolve(results);
    });

    
    // Create manager with injected mocked data sources
    manager = new OpportunityManager(mockEnv, ccxtDataSourceManager, dataSourceManager);
  });

  describe('Real Market Data Integration', () => {
    beforeEach(() => {
      // Reset all mocks before each test to prevent interference
      vi.clearAllMocks();
      // Reset the getTicker mock to default implementation
      (dataSourceManager.getTicker as any).mockReset();
    });

    it('should generate opportunities from real market data', async () => {
      // Mock user access validation with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve(null); // No cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock successful market data fetching with price differences
      // The system tries to fetch 5 symbols from 3 exchanges = 15 calls
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001; // kraken
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0]).toMatchObject({
        symbol: expect.stringContaining('BTC'),
        exchange_a: expect.any(String),
        exchange_b: expect.any(String),
        price_a: expect.any(Number),
        price_b: expect.any(Number),
        profit_percentage: expect.any(Number),
        confidence_score: expect.any(Number)
      });
      
      // Verify CCXT data source was called (primary path)
      expect(ccxtDataSourceManager.getMultipleTickers).toHaveBeenCalled();
    });

    it('should handle API failures and fallback to mock data', async () => {
      // Mock user access validation with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve(null); // No cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock CCXT API failures to force fallback to legacy method
      (ccxtDataSourceManager.getMultipleTickers as any).mockRejectedValue(new Error('CCXT API Error'));
      (ccxtDataSourceManager.getHealthyExchanges as any).mockResolvedValue([]); // No healthy exchanges
      
      // Mock legacy API failures for this test only
      (dataSourceManager.getTicker as any).mockImplementation(() => {
        return Promise.reject(new Error('API Error'));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should still return fallback opportunities
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].id).toMatch(/^fallback_/);
    }, 10000);

    it('should calculate profit margins correctly', async () => {
      // Mock user access validation with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // No cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock CCXT data source with 1% price difference
      (ccxtDataSourceManager.getHealthyExchanges as any).mockResolvedValue(['binance', 'coinbase', 'kraken']);
      (ccxtDataSourceManager.getMultipleTickers as any).mockImplementation((symbols: string[]) => {
        const results: any[] = [];
        
        symbols.forEach(symbol => {
          const basePrice = symbol === 'BTC/USDT' ? 45000 : 
                           symbol === 'ETH/USDT' ? 3000 :
                           symbol === 'ADA/USDT' ? 0.5 :
                           symbol === 'DOT/USDT' ? 7.5 : 
                           symbol === 'LINK/USDT' ? 25 :
                           symbol === 'SOL/USDT' ? 100 :
                           symbol === 'MATIC/USDT' ? 1.2 : 1000;
          
          // 1% difference between binance and coinbase
          const exchanges = ['binance', 'coinbase', 'kraken'];
          exchanges.forEach(exchange => {
            const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                      exchange === 'coinbase' ? 1.01 : 1.005; // 1% and 0.5% differences
            
            results.push({
              symbol,
              price: basePrice * exchangeMultiplier,
              volume: 1000000,
              timestamp: Date.now(),
              exchange
            });
          });
        });
        
        return Promise.resolve(results);
      });

      // Mock market data with known price differences (fallback)
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.01 : 1.005; // 1% and 0.5% differences
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].profit_percentage).toBeCloseTo(1.0, 1); // ~1% profit
    });

    it('should calculate confidence scores based on volume and price stability', async () => {
      // Mock user access validation with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // No cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock high volume, stable price data
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.0011 : 1.0005; // Small differences
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 5000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].confidence_score).toBeGreaterThan(0.8); // High confidence
    });

    it('should sort opportunities by profit percentage', async () => {
      // Mock user access validation with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // No cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock multiple exchanges with different price spreads
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.004 : 1.002; // Different spreads
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(1);
      // Should be sorted by profit percentage descending
      for (let i = 1; i < opportunities.length; i++) {
        expect(opportunities[i-1].profit_percentage).toBeGreaterThanOrEqual(opportunities[i].profit_percentage);
      }
    });
  });

  describe('Role-based Filtering', () => {
    it('should filter opportunities for free tier users', async () => {
      // Mock user access validation for free tier with proper KV keys
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:free') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock market data with high confidence, low profit opportunities
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        // Small price differences for free tier filtering
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001; // 0.2% and 0.1% differences
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 5000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'free');
      
      // Free tier should get filtered opportunities (high confidence, low profit threshold)
      expect(opportunities.length).toBeGreaterThan(0);
      opportunities.forEach(opp => {
        expect(opp.confidence_score).toBeGreaterThanOrEqual(0.8);
        expect(opp.profit_percentage).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should calculate profit margins correctly', async () => {
      // Mock user access validation
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock CCXT data source with known price differences for this test
      (ccxtDataSourceManager.getMultipleTickers as any).mockImplementation((symbols: string[]) => {
        const results: any[] = [];
        
        symbols.forEach(symbol => {
          const basePrice = symbol === 'BTC/USDT' ? 45000 : 
                           symbol === 'ETH/USDT' ? 3000 :
                           symbol === 'ADA/USDT' ? 0.5 :
                           symbol === 'DOT/USDT' ? 7.5 : 
                           symbol === 'LINK/USDT' ? 25 :
                           symbol === 'SOL/USDT' ? 100 :
                           symbol === 'MATIC/USDT' ? 1.2 : 1000;
          
          // Create data for binance (base price) and coinbase (1% higher)
          results.push({
            symbol,
            price: basePrice,
            volume: 1000000,
            timestamp: Date.now(),
            exchange: 'binance'
          });
          
          results.push({
            symbol,
            price: basePrice * 1.01, // 1% higher price
            volume: 1000000,
            timestamp: Date.now(),
            exchange: 'coinbase'
          });
        });
        
        return Promise.resolve(results);
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].profit_percentage).toBeCloseTo(1.0, 1); // ~1% profit
    });

    it('should calculate confidence scores based on volume and price stability', async () => {
      // Mock user access validation
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock high volume, stable price data
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.0011 : 1.0005; // Small differences
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 5000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].confidence_score).toBeGreaterThan(0.8); // High confidence
    });

    it('should sort opportunities by profit percentage', async () => {
      // Mock user access validation
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 1000, 
              dailyUsed: 0, 
              hourlyLimit: 100, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:ultra') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock multiple exchanges with different price spreads
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.004 : 1.002; // Different spreads
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'ultra');
      
      expect(opportunities.length).toBeGreaterThan(1);
      // Should be sorted by profit percentage descending
      for (let i = 1; i < opportunities.length; i++) {
        expect(opportunities[i-1].profit_percentage).toBeGreaterThanOrEqual(opportunities[i].profit_percentage);
      }
    });
  });

  describe('Role-based Filtering', () => {
    it('should filter opportunities for free tier users', async () => {
      // Mock user access validation for free tier
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 10, 
              dailyUsed: 0, 
              hourlyLimit: 5, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:free') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock low-quality opportunities (should be filtered out for free users)
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.0002 : 1.0001; // Very small differences
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 100000)); // Low volume
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'free');
      
      // Free users should get fewer/no opportunities due to strict filtering
      opportunities.forEach(opp => {
        expect(opp.confidence_score).toBeGreaterThanOrEqual(0.8);
        expect(opp.profit_percentage).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should provide more opportunities for pro users', async () => {
      // Mock user access validation for pro tier
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock medium-quality opportunities
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001; // 0.2% profit
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 800000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Pro users should get opportunities with lower thresholds
      opportunities.forEach(opp => {
        expect(opp.confidence_score).toBeGreaterThanOrEqual(0.7);
        expect(opp.profit_percentage).toBeGreaterThanOrEqual(0.2);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should respect daily limits', async () => {
      // Mock user at daily limit
      const currentTime = Date.now();
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({
              dailyLimit: 100,
              dailyUsed: 100, // At limit
              hourlyLimit: 25,
              hourlyUsed: 0,
              totalAccessed: 100,
              successRate: 1.0
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            // Set recent reset timestamps to prevent counter reset
            return Promise.resolve({ 
              dailyReset: currentTime - 60000, // 1 minute ago (same day)
              hourlyReset: currentTime - 60000  // 1 minute ago (same hour)
            });
          }
        }
        return Promise.resolve(null);
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should return empty due to rate limit
      expect(opportunities).toEqual([]);
    });

    it('should reset counters after time period', async () => {
      // Mock expired limits that should be reset
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({
              dailyLimit: 100,
              dailyUsed: 100, // Was at limit
              hourlyLimit: 25,
              hourlyUsed: 25, // Was at limit
              totalAccessed: 100,
              successRate: 1.0
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({
              dailyReset: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
              hourlyReset: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
            });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve(null); // Force cache miss
          }
        }
        return Promise.resolve(null);
      });

      // Mock market data
      (dataSourceManager.getTicker as any).mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 
                         symbol === 'ETHUSDT' ? 3000 :
                         symbol === 'ADAUSDT' ? 0.5 :
                         symbol === 'DOTUSDT' ? 7.5 : 25; // LINKUSDT
        
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001;
        
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000));
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should return opportunities after reset
      expect(opportunities.length).toBeGreaterThan(0);
      
      // Verify that limits were reset by checking if put was called
      expect(mockKV.put).toHaveBeenCalled();
    });
  });

  describe('Access Control', () => {
    it('should deny access to users without proper permissions', async () => {
      // Mock user without access
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve(null); // No limits found
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve(null);
          }
        }
        return Promise.resolve(null);
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'free');
      
      // Should return empty array for unauthorized users
      expect(opportunities).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should cache opportunities and serve from cache when available', async () => {
      const cachedOpportunities = [{
        id: 'cached_opp_1',
        symbol: 'BTC/USDT',
        exchange_a: 'binance',
        exchange_b: 'coinbase',
        price_a: 45000,
        price_b: 45100,
        profit_percentage: 0.22,
        confidence_score: 0.85,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString()
      }];

      // Mock user access validation and cache hit
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve({
              opportunities: cachedOpportunities,
              timestamp: Date.now()
            });
          }
        }
        return Promise.resolve(null);
      });

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');

      // Should return cached opportunities
      expect(opportunities).toEqual(cachedOpportunities);
      
      // Should not call getTicker when serving from cache
      expect(dataSourceManager.getTicker).not.toHaveBeenCalled();
    });

    it('should generate fresh opportunities when cache is expired', async () => {
      // Mock user access validation and no cache
      mockKV.get.mockImplementation((key: string, type?: string) => {
        if (type === 'json') {
          if (key === 'rbac:opportunity_limits:user123') {
            return Promise.resolve({ 
              dailyLimit: 100, 
              dailyUsed: 0, 
              hourlyLimit: 25, 
              hourlyUsed: 0, 
              totalAccessed: 0, 
              successRate: 1.0 
            });
          }
          if (key === 'rbac:opportunity_reset:user123') {
            return Promise.resolve({ dailyReset: 0, hourlyReset: 0 });
          }
          if (key === 'opportunities_cache:pro') {
            return Promise.resolve(null); // Expired cache
          }
        }
        return Promise.resolve(null);
      });

      // Mock healthy exchanges for CCXT
      (ccxtDataSourceManager.getHealthyExchanges as any).mockResolvedValue(['binance', 'coinbase', 'kraken']);
      
      // Mock CCXT multiple tickers with price differences
      (ccxtDataSourceManager.getMultipleTickers as any).mockResolvedValue([
        {
          symbol: 'BTC/USDT',
          exchange: 'binance',
          price: 45000,
          volume: 1000000,
          timestamp: Date.now()
        },
        {
          symbol: 'BTC/USDT', 
          exchange: 'coinbase',
          price: 45100,
          volume: 1200000,
          timestamp: Date.now()
        }
      ]);

      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');

      // Should generate fresh opportunities
      expect(opportunities.length).toBeGreaterThan(0);
      
      // Should call CCXT methods to get fresh data
      expect(ccxtDataSourceManager.getHealthyExchanges).toHaveBeenCalled();
      expect(ccxtDataSourceManager.getMultipleTickers).toHaveBeenCalled();
    });
  });
});