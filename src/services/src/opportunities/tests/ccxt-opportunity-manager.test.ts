import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { MarketDataPoint } from '@celebrum-ai/shared/types/market';
import { setupRobustCCXTMock } from '../../../../shared/tests/utils/enhanced-mock';

setupRobustCCXTMock();

// Mock the CCXT data source manager
vi.mock('@celebrum-ai/shared/infrastructure/ccxt-data-source', () => ({
  ccxtDataSourceManager: {
    getHealthyExchanges: vi.fn(),
    getHealthySources: vi.fn(),
    getMultipleTickers: vi.fn(),
    getTicker: vi.fn(),
    close: vi.fn()
  }
}));

// Mock the legacy data source manager
vi.mock('@celebrum-ai/shared/infrastructure/data-sources', () => ({
  dataSourceManager: {
    getTicker: vi.fn()
  }
}));

// Import after mocking
import { OpportunityManager } from '../src/opportunity-manager';
import { ccxtDataSourceManager } from '@celebrum-ai/shared/infrastructure/ccxt-data-source';
import { dataSourceManager } from '@celebrum-ai/shared/infrastructure/data-sources';

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
const createMockMarketData = (price: number, volume: number = 1000000, exchange: string = 'binance', symbol: string = 'BTC/USDT'): MarketDataPoint => ({
  symbol,
  price,
  volume,
  timestamp: Date.now(),
  exchange
});

describe('OpportunityManager - CCXT Integration', () => {
  let manager: OpportunityManager;
  let mockCcxtManager: any;
  let mockLegacyManager: any;

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
    
    // Create mock data sources
    mockCcxtManager = {
      getHealthyExchanges: vi.fn(),
      getMultipleTickers: vi.fn()
    };
    
    mockLegacyManager = {
      getTicker: vi.fn()
    };
    
    // Set up default mocks for CCXT manager
    mockCcxtManager.getHealthyExchanges.mockResolvedValue(['binance', 'coinbase']);
    mockCcxtManager.getMultipleTickers.mockResolvedValue([
      createMockMarketData(45000, 1000000, 'binance'),
      createMockMarketData(45090, 800000, 'coinbase')
    ]);
    
    // Set up default mocks for legacy manager
    mockLegacyManager.getTicker.mockImplementation((symbol: string, exchange: string) => {
      const basePrice = symbol === 'BTCUSDT' ? 45000 : 3000;
      const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                exchange === 'coinbase' ? 1.002 : 1.001;
      return Promise.resolve({
        symbol,
        price: basePrice * exchangeMultiplier,
        volume: 1000000,
        timestamp: Date.now(),
        exchange
      });
    });
    
    // Reset KV mock to return empty cache by default
    mockKV.get.mockImplementation((key: string, type?: string) => {
      if (type === 'json') {
        if (key === 'rbac:user_profile:user123') {
          return Promise.resolve({ role: 'pro', tier: 'pro' });
        }
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
        return Promise.resolve(null); // No cache by default
      }
      return Promise.resolve(null);
    });
    mockKV.put.mockResolvedValue(undefined);
    mockKV.delete.mockResolvedValue(undefined);
    
    // Inject mocks into OpportunityManager
    manager = new OpportunityManager(mockEnv, mockCcxtManager, mockLegacyManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CCXT Primary Data Source', () => {
    it('should use CCXT data source when sufficient healthy exchanges are available', async () => {
      // Mock sufficient healthy exchanges
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase',
        'kraken'
      ]);
      
      // Mock successful CCXT data fetching with price differences
      mockCcxtManager.getMultipleTickers.mockResolvedValue([
        createMockMarketData(45000, 1000000, 'binance'),
        createMockMarketData(45090, 800000, 'coinbase'), // 0.2% difference
        createMockMarketData(45045, 900000, 'kraken')    // 0.1% difference
      ]);
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      expect(mockCcxtManager.getHealthyExchanges).toHaveBeenCalled();
      expect(mockCcxtManager.getMultipleTickers).toHaveBeenCalledWith(
        ['BTC/USDT']
      );
      expect(mockLegacyManager.getTicker).not.toHaveBeenCalled();
      
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0]).toMatchObject({
        symbol: expect.any(String),
        exchange_a: expect.any(String),
        exchange_b: expect.any(String),
        profit_percentage: expect.any(Number),
        confidence_score: expect.any(Number)
      });
    });

    it('should calculate arbitrage opportunities correctly from CCXT data', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase',
        'kraken'
      ]);
      
      // Mock data with known price differences for BTC/USDT
      mockCcxtManager.getMultipleTickers.mockImplementation((symbols) => {
        if (symbols.includes('BTC/USDT')) {
          return Promise.resolve([
            createMockMarketData(45000, 1000000, 'binance'),  // Base price
            createMockMarketData(45450, 800000, 'coinbase'),   // 1% higher
            createMockMarketData(45225, 900000, 'kraken')      // 0.5% higher
          ]);
        }
        return Promise.resolve([]);
      });
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should find opportunity between binance (45000) and coinbase (45450)
      const btcOpportunity = opportunities.find(op => op.symbol.includes('BTC'));
      expect(btcOpportunity).toBeDefined();
      expect(btcOpportunity?.profit_percentage).toBeCloseTo(1.0, 1); // ~1% profit
      expect(btcOpportunity?.exchange_a).toBe('binance');
      expect(btcOpportunity?.exchange_b).toBe('coinbase');
    });

    it('should handle CCXT API failures and fallback to legacy', async () => {
      // Mock insufficient healthy exchanges
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance'
      ]); // Only 1 exchange, need at least 2
      
      // Mock legacy data source success
      mockLegacyManager.getTicker.mockImplementation((symbol: string, exchange: string) => {
        const basePrice = 45000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001;
        return Promise.resolve(createMockMarketData(basePrice * exchangeMultiplier, 1000000, exchange));
      });
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      expect(mockCcxtManager.getHealthyExchanges).toHaveBeenCalled();
      expect(mockLegacyManager.getTicker).toHaveBeenCalled();
      expect(opportunities.length).toBeGreaterThan(0);
    });

    it('should handle complete CCXT failure and use legacy fallback', async () => {
      // Mock CCXT failure
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([]);
      mockCcxtManager.getMultipleTickers.mockRejectedValue(new Error('CCXT API Error'));
      
      // Mock legacy success
      mockLegacyManager.getTicker.mockImplementation((symbol: string, exchange: string) => {
        const basePrice = symbol === 'BTCUSDT' ? 45000 : 3000;
        const exchangeMultiplier = exchange === 'binance' ? 1.0 : 
                                  exchange === 'coinbase' ? 1.002 : 1.001;
        return Promise.resolve({
          symbol,
          price: basePrice * exchangeMultiplier,
          volume: 1000000,
          timestamp: Date.now(),
          exchange
        });
      });
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      expect(mockLegacyManager.getTicker).toHaveBeenCalled();
      expect(opportunities.length).toBeGreaterThan(0);
      
      // Should have legacy opportunities
      const legacyOpportunity = opportunities.find(op => op.id?.includes('legacy'));
      expect(legacyOpportunity).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle partial CCXT data failures gracefully', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      // Mock partial success - some symbols fail
      mockCcxtManager.getMultipleTickers.mockImplementation((symbols) => {
        // Only return data for BTC/USDT, others fail
        if (symbols.includes('BTC/USDT')) {
          return Promise.resolve([
            createMockMarketData(45000, 1000000, 'binance'),
            createMockMarketData(45090, 800000, 'coinbase')
          ]);
        }
        return Promise.resolve([]);
      });
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should still generate opportunities from available data
      expect(opportunities.length).toBeGreaterThan(0);
    });

    it('should handle network timeouts and fallback to mock data', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      // Mock timeout on first call, success on retry (via legacy)
      let callCount = 0;
      mockCcxtManager.getMultipleTickers.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Timeout'));
        }
        return Promise.resolve([
          createMockMarketData(45000, 1000000, 'binance'),
          createMockMarketData(45090, 800000, 'coinbase')
        ]);
      });
      
      // Mock legacy fallback
      mockLegacyManager.getTicker.mockResolvedValue(
        createMockMarketData(45000, 1000000, 'binance')
      );
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      expect(opportunities.length).toBeGreaterThan(0);
    });

    it('should provide mock data as final fallback', async () => {
      // Mock all data sources failing
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([]);
      mockCcxtManager.getMultipleTickers.mockRejectedValue(new Error('CCXT failed'));
      mockLegacyManager.getTicker.mockRejectedValue(new Error('Legacy failed'));
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should still return mock opportunities
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].id).toContain('fallback');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle high-frequency requests efficiently', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      mockCcxtManager.getMultipleTickers.mockResolvedValue([
        createMockMarketData(45000, 1000000, 'binance'),
        createMockMarketData(45090, 800000, 'coinbase')
      ]);
      
      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() => 
        manager.getAvailableOpportunities('user123', 'pro')
      );
      
      const results = await Promise.all(requests);
      
      // All requests should succeed
      results.forEach(opportunities => {
        expect(opportunities.length).toBeGreaterThan(0);
      });
      
      // CCXT should be called for each symbol in each request (7 symbols × 5 requests = 35 calls)
      expect(mockCcxtManager.getMultipleTickers).toHaveBeenCalledTimes(35);
    });

    it('should respect exchange rate limits', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      // Mock rate limit error
      mockCcxtManager.getMultipleTickers.mockRejectedValue(
        new Error('Rate limit exceeded')
      );
      
      // Mock legacy fallback
      mockLegacyManager.getTicker.mockResolvedValue(
        createMockMarketData(45000, 1000000, 'binance')
      );
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should fallback to legacy when rate limited
      expect(mockLegacyManager.getTicker).toHaveBeenCalled();
      expect(opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality and Validation', () => {
    it('should validate CCXT data quality before processing', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      // Mock data with invalid/missing fields
      mockCcxtManager.getMultipleTickers.mockResolvedValue([
        createMockMarketData(45000, 1000000, 'binance'),
        { ...createMockMarketData(0, 0, 'coinbase'), price: null }, // Invalid data
        createMockMarketData(45090, 800000, 'kraken')
      ]);
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should filter out invalid data and still generate opportunities
      expect(opportunities.length).toBeGreaterThan(0);
    });

    it('should handle stale data appropriately', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      const staleTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes old
      
      mockCcxtManager.getMultipleTickers.mockResolvedValue([
        createMockMarketData(45000, 1000000, 'binance'),
        { ...createMockMarketData(45090, 800000, 'coinbase'), timestamp: staleTimestamp }
      ]);
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Should still process but potentially with lower confidence
      expect(opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Symbol Support', () => {
    it('should handle multiple cryptocurrency symbols', async () => {
      mockCcxtManager.getHealthyExchanges.mockResolvedValue([
        'binance',
        'coinbase'
      ]);
      
      // Mock data for multiple symbols - handle individual symbol calls
      mockCcxtManager.getMultipleTickers.mockImplementation((symbols) => {
        const symbol = symbols[0]; // Each call is for a single symbol
        
        if (symbol === 'BTC/USDT') {
          return Promise.resolve([
            createMockMarketData(45000, 1000000, 'binance', 'BTC/USDT'),
            createMockMarketData(45090, 800000, 'coinbase', 'BTC/USDT')
          ]);
        } else if (symbol === 'ETH/USDT') {
          return Promise.resolve([
            createMockMarketData(3000, 500000, 'binance', 'ETH/USDT'),
            createMockMarketData(3015, 400000, 'coinbase', 'ETH/USDT')
          ]);
        } else if (symbol === 'SOL/USDT') {
          return Promise.resolve([
            createMockMarketData(100, 2000000, 'binance', 'SOL/USDT'),
            createMockMarketData(101, 1800000, 'coinbase', 'SOL/USDT')
          ]);
        }
        
        // Return empty array for other symbols
        return Promise.resolve([]);
      });
      
      const opportunities = await manager.getAvailableOpportunities('user123', 'pro');
      
      // Debug: Log what we got
      console.log('Generated opportunities:', opportunities.length);
      console.log('Opportunity symbols:', opportunities.map(op => op.symbol));
      console.log('Mock calls:', mockCcxtManager.getMultipleTickers.mock.calls);
      
      // Should find opportunities across multiple symbols
      const symbols = [...new Set(opportunities.map(op => op.symbol))];
      console.log('Unique symbols found:', symbols);
      expect(symbols.length).toBeGreaterThan(1);
      
      // Verify we have BTC, ETH, and SOL opportunities
      expect(symbols.some(s => s.includes('BTC'))).toBe(true);
      expect(symbols.some(s => s.includes('ETH'))).toBe(true);
      expect(symbols.some(s => s.includes('SOL'))).toBe(true);
    });
  });
});