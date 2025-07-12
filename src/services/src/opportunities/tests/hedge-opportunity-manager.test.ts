import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpportunityManager } from '../src/opportunity-manager';
import type { HedgeOpportunity, HedgeExecutionResult } from '../src/opportunity-manager';
import { setupRobustCCXTMock } from '../../../shared/tests/utils/enhanced-mock';

setupRobustCCXTMock();

// Mock the shared data source manager
vi.mock('@celebrum-ai/shared/infrastructure/data-sources', () => {
  const mockDataSourceManager = {
    getTicker: vi.fn(),
    getMultipleTickers: vi.fn(),
    getHealthyExchanges: vi.fn(() => Promise.resolve(['binance', 'coinbase', 'kraken'])),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    sources: new Map()
  };
  
  return {
    DataSourceManager: vi.fn(() => mockDataSourceManager),
    dataSourceManager: mockDataSourceManager,
    BinanceDataSource: vi.fn(),
    CoinbaseDataSource: vi.fn(),
    KrakenDataSource: vi.fn(),
    MarketDataSource: vi.fn()
  };
});

// Mock CCXT data source manager - prevent singleton initialization
vi.mock('@celebrum-ai/shared/infrastructure/ccxt-data-source', () => {
  const mockCCXTDataSource = {
    getTicker: vi.fn(),
    getOrderBook: vi.fn(),
    getTrades: vi.fn(),
    getCandles: vi.fn(),
    getSymbols: vi.fn(),
    getName: vi.fn(),
    getCapabilities: vi.fn(),
    getStatus: vi.fn(() => 'healthy'),
    getDetailedStatus: vi.fn(() => Promise.resolve({ status: 'ok' })),
    initialize: vi.fn(),
    close: vi.fn()
  };

  const mockCCXTDataSourceManager = {
    sources: new Map(),
    primarySources: ['binance', 'coinbase', 'kraken'],
    fallbackSources: ['bitfinex', 'huobi', 'okx', 'bybit'],
    healthCheck: new Map(),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    getTicker: vi.fn(),
    getMultipleTickers: vi.fn((symbols: string[]) => {
      // Return empty array to force fallback to legacy data source
      // This ensures tests use the mocked legacyDataSource.getTicker
      return Promise.resolve([]);
    }),
    getOrderBook: vi.fn(),
    getAvailableExchanges: vi.fn(() => ['binance', 'coinbase', 'kraken']),
    getHealthyExchanges: vi.fn(() => Promise.resolve(['binance', 'coinbase', 'kraken'])),
    getHealthySources: vi.fn(() => [mockCCXTDataSource]),
    performHealthCheck: vi.fn(() => Promise.resolve(new Map())),
    close: vi.fn()
  };

  return {
    CCXTDataSource: vi.fn(() => mockCCXTDataSource),
    CCXTDataSourceManager: vi.fn(() => mockCCXTDataSourceManager),
    ccxtDataSourceManager: mockCCXTDataSourceManager
  };
});

// Mock fetch to prevent actual network calls
vi.mock('node:fetch', () => ({
  default: vi.fn()
}));

global.fetch = vi.fn();

// Mock environment with KV
const mockEnv = {
  CELEBRUM_KV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
};

// Store for mocked opportunities
const mockOpportunityStore = new Map<string, any>();

describe('HedgeOpportunityManager', () => {
  let opportunityManager: OpportunityManager;
  let mockCcxtDataSource: any;
  let mockLegacyDataSource: any;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockOpportunityStore.clear();
    
    // Mock KV operations to use our store
    vi.mocked(mockEnv.CELEBRUM_KV.get).mockImplementation(async (key: string) => {
      return mockOpportunityStore.get(key) || null;
    });
    
    vi.mocked(mockEnv.CELEBRUM_KV.put).mockImplementation(async (key: string, value: string) => {
      mockOpportunityStore.set(key, JSON.parse(value));
    });
    
    vi.mocked(mockEnv.CELEBRUM_KV.delete).mockImplementation(async (key: string) => {
      mockOpportunityStore.delete(key);
    });
    
    // Create mock data sources
    mockCcxtDataSource = {
      getHealthyExchanges: vi.fn(() => Promise.resolve(['binance', 'coinbase', 'kraken'])),
      getMultipleTickers: vi.fn((symbols: string[]) => {
        // Return empty array to force fallback to legacy data source
        // This ensures tests use the mocked legacyDataSource.getTicker
        return Promise.resolve([]);
      })
    };
    
    mockLegacyDataSource = {
      getTicker: vi.fn().mockImplementation(async (symbol: string, exchange: string) => {
        // Base prices for different symbols
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        // Create larger price differences between exchanges to generate opportunities
        // This ensures profit percentage > 1% and confidence score > 0.8 for 'pro' tier
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.015 : 1.01;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 2000000, // Increased volume for higher confidence
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      }),
      getMultipleTickers: vi.fn(),
      getHealthyExchanges: vi.fn(() => Promise.resolve(['binance', 'coinbase', 'kraken'])),
      addSource: vi.fn(),
      removeSource: vi.fn()
    };
    
    // Create fresh instance with mocked dependencies
    opportunityManager = new OpportunityManager(mockEnv, mockCcxtDataSource, mockLegacyDataSource);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hedge Opportunity Generation', () => {
    it('should generate hedge opportunities from market data with proper format', async () => {
      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      const opportunity = opportunities[0];
      expect(opportunity).toHaveProperty('id');
      expect(opportunity).toHaveProperty('symbol');
      expect(opportunity).toHaveProperty('type', 'hedge');
      expect(opportunity).toHaveProperty('status', 'pending');
      expect(opportunity).toHaveProperty('positions_opened');
      expect(opportunity.positions_opened).toHaveProperty('long');
      expect(opportunity.positions_opened).toHaveProperty('short');
      expect(opportunity).toHaveProperty('profit_percentage');
      expect(opportunity).toHaveProperty('confidence_score');
      expect(opportunity).toHaveProperty('expected_apr');
      expect(opportunity).toHaveProperty('risk_level');
    });

    it('should calculate expected APR correctly', async () => {
      // Mock market data with known price differences
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        // Create larger price difference for APR calculation that meets tier requirements
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.015 : 1.01;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 2000000, // Higher volume for better confidence
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      const opportunity = opportunities[0];
      expect(opportunity.expected_apr).toBeGreaterThan(0);
      expect(typeof opportunity.expected_apr).toBe('number');
    });

    it('should assess risk levels correctly', async () => {
      // Mock market data
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.005 : 1.002;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      const opportunity = opportunities[0];
      expect(['low', 'medium', 'high']).toContain(opportunity.risk_level);
    });

    it('should sort opportunities by expected APR descending', async () => {
      // Mock market data with varying price differences
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        // Create varying price differences - BTCUSDT has higher difference for higher APR
        let exchangeMultiplier;
        if (symbol === 'BTCUSDT') {
          exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.015 : 1.01; // 1.5% difference
        } else {
          exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.01 : 1.005; // 1% difference
        }
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 2000000,
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      // Check if sorted by expected APR descending
      for (let i = 0; i < opportunities.length - 1; i++) {
        expect(opportunities[i].expected_apr).toBeGreaterThanOrEqual(opportunities[i + 1].expected_apr);
      }
    });
  });

  describe('Tier-based Filtering', () => {
    it('should filter opportunities for free tier users', async () => {
      // Mock market data
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.005 : 1.002;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const freeOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'free');
      const proOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      // Free tier should have fewer or equal opportunities
      expect(freeOpportunities.length).toBeLessThanOrEqual(proOpportunities.length);
      
      // Free tier opportunities should meet higher thresholds
      freeOpportunities.forEach(opp => {
        expect(opp.confidence_score).toBeGreaterThanOrEqual(0.9);
        expect(opp.profit_percentage).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should provide more opportunities for pro tier users', async () => {
      // Mock market data for all symbols and exchanges
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.005 : 1.002;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const freeOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'free');
      const proOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(proOpportunities.length).toBeGreaterThanOrEqual(freeOpportunities.length);
    });

    it('should provide maximum opportunities for ultra tier users', async () => {
      // Mock market data for all symbols and exchanges
      mockLegacyDataSource.getTicker.mockImplementation(async (symbol: string, exchange: string) => {
        const symbolPrices: Record<string, number> = {
          'BTCUSDT': 45000,
          'ETHUSDT': 3000,
          'ADAUSDT': 0.5,
          'DOTUSDT': 8.0,
          'LINKUSDT': 15.0
        };
        
        const basePrice = symbolPrices[symbol] || 1000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : exchange === 'coinbase' ? 1.005 : 1.002;
        const price = basePrice * exchangeMultiplier;
        
        return {
          symbol,
          exchange,
          price,
          volume: 1000000,
          timestamp: new Date().toISOString(),
          bid: price - (price * 0.001),
          ask: price + (price * 0.001),
          high24h: price + (price * 0.02),
          low24h: price - (price * 0.02),
          change24h: price * 0.01,
          changePercent24h: 1.0
        };
      });

      const proOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      const ultraOpportunities = await opportunityManager.getHedgeOpportunities('user123', 'ultra');
      
      expect(ultraOpportunities.length).toBeGreaterThanOrEqual(proOpportunities.length);
    });
  });

  describe('Caching', () => {
    it('should cache opportunities and serve from cache when available', async () => {
      // Mock cached data
      const cachedOpportunities = [{
        id: 'cached_hedge_1',
        symbol: 'BTCUSDT',
        type: 'hedge' as const,
        status: 'pending' as const,
        positions_opened: {
          long: { amount: 50, price: 45000, exchange: 'BINANCE' },
          short: { amount: 50, price: 45225, exchange: 'COINBASE' }
        },
        profit_percentage: 0.5,
        confidence_score: 0.85,
        expected_apr: 182.5,
        risk_level: 'medium' as const,
        max_position_size: 1000,
        execution_time_estimate: 30,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString()
      }];
      
      vi.mocked(mockEnv.CELEBRUM_KV.get).mockResolvedValue({
        opportunities: cachedOpportunities,
        timestamp: Date.now()
      });

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities).toEqual(cachedOpportunities);
      expect(mockEnv.CELEBRUM_KV.get).toHaveBeenCalledWith('hedge_opportunities:pro', 'json');
    });

    it('should generate fresh opportunities when cache is expired', async () => {
      // Mock expired cache
      vi.mocked(mockEnv.CELEBRUM_KV.get).mockResolvedValue({
        opportunities: [],
        timestamp: Date.now() - 400000 // Expired
      });

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(mockEnv.CELEBRUM_KV.put).toHaveBeenCalled();
    });
  });

  describe('Hedge Execution', () => {
    it('should execute hedge opportunity successfully', async () => {
      // First generate opportunities to get a valid ID
      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      expect(opportunities.length).toBeGreaterThan(0);
      
      const validOpportunityId = opportunities[0].id;
      const result = await opportunityManager.executeHedgeOpportunity(validOpportunityId, 'user123', 100);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('opportunity_id', validOpportunityId);
      expect(result).toHaveProperty('execution_summary');
    });

    it('should handle execution failure gracefully', async () => {
      const result = await opportunityManager.executeHedgeOpportunity('invalid_id', 'user123', 100);
      
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });

    it('should validate position size limits', async () => {
      // First generate opportunities to get a valid ID
      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      expect(opportunities.length).toBeGreaterThan(0);
      
      const validOpportunityId = opportunities[0].id;
      const result = await opportunityManager.executeHedgeOpportunity(validOpportunityId, 'user123', 0);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid position size');
    });

    it('should handle expired opportunities', async () => {
      const result = await opportunityManager.executeHedgeOpportunity('expired_hedge', 'user123', 100);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or expired');
    });
  });

  describe('Fallback Opportunities', () => {
    it('should generate fallback opportunities when API fails', async () => {
      // Reset the mock to ensure API failures
      mockLegacyDataSource.getTicker.mockReset();
      mockLegacyDataSource.getTicker.mockRejectedValue(new Error('API Error'));
      
      // Mock empty cache
      vi.mocked(mockEnv.CELEBRUM_KV.get).mockResolvedValue(null);

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      const fallbackOpp = opportunities.find(opp => opp.id.includes('fallback'));
      expect(fallbackOpp).toBeDefined();
      expect(fallbackOpp?.symbol).toBeDefined();
      expect(fallbackOpp?.profit_percentage).toBeGreaterThan(0);
    });

    it('should match the image format in fallback opportunities', async () => {
      // Reset the mock to ensure API failures
      mockLegacyDataSource.getTicker.mockReset();
      mockLegacyDataSource.getTicker.mockRejectedValue(new Error('API Error'));
      
      // Mock empty cache
      vi.mocked(mockEnv.CELEBRUM_KV.get).mockResolvedValue(null);

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
      
      const fallbackOpp = opportunities.find(opp => opp.id.includes('fallback'));
      expect(fallbackOpp).toBeDefined();
      expect(fallbackOpp?.symbol).toBeDefined();
      expect(fallbackOpp?.profit_percentage).toBeGreaterThan(0);
      expect(fallbackOpp?.confidence_score).toBeGreaterThan(0);
      expect(fallbackOpp?.expected_apr).toBeGreaterThan(0);
      expect(fallbackOpp?.risk_level).toBeDefined();
      expect(fallbackOpp?.max_position_size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing opportunities gracefully', async () => {
      // Mock empty responses
      mockLegacyDataSource.getTicker.mockResolvedValue(null);
      vi.mocked(mockEnv.CELEBRUM_KV.get).mockResolvedValue(null);

      const opportunities = await opportunityManager.getHedgeOpportunities('user123', 'pro');
      
      // Should return fallback opportunities
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should handle execution errors gracefully', async () => {
      const result = await opportunityManager.executeHedgeOpportunity('error_hedge', 'user123', 100);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('opportunity_id');
      expect(result).toHaveProperty('execution_summary');
      
      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });
  });
});